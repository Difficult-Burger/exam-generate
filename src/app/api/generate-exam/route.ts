import { randomUUID } from "crypto";
import { downloadMaterialFiles } from "@/lib/materials/files";
import {
  generateExamMarkdown,
  type ExamGenerationOptions,
} from "@/lib/exams/generate";
import { renderPdfFromMarkdown } from "@/lib/exams/render-pdf";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import type { AIProvider } from "@/lib/openai";

type GeneratePayload = {
  submissionId?: string;
  questionCount?: number | string;
  difficulty?: string;
  extraInstructions?: string;
  provider?: string;
  model?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: GeneratePayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "请求体格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return new Response(JSON.stringify({ message: authError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ message: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = async (data: unknown) => {
    await writer.write(encoder.encode(`${JSON.stringify(data)}\n`));
  };

  (async () => {
    try {
      const submissionId = String(payload.submissionId || "").trim();
      const questionCount = (() => {
        const parsed = Number(payload.questionCount);
        if (Number.isNaN(parsed)) return 20;
        return Math.min(50, Math.max(5, parsed));
      })();
      const requestedDifficulty = String(payload.difficulty || "medium");
      const allowedDifficulty: ExamGenerationOptions["difficultyLevel"][] = [
        "easy",
        "medium",
        "hard",
      ];
      const difficulty = allowedDifficulty.includes(
        requestedDifficulty as ExamGenerationOptions["difficultyLevel"],
      )
        ? (requestedDifficulty as ExamGenerationOptions["difficultyLevel"])
        : "medium";
      const extraInstructions = payload.extraInstructions
        ? String(payload.extraInstructions)
        : null;

      if (!submissionId) {
        await send({ type: "error", message: "缺少 submissionId" });
        return;
      }

      await send({ type: "status", message: "正在读取课程资料" });

      const { data: submission, error } = await supabase
        .from("course_submissions")
        .select("*")
        .eq("id", submissionId)
        .eq("owner_id", user.id)
        .single();

      if (error || !submission) {
        await send({
          type: "error",
          message:
            error?.message ?? "未找到对应课程资料或你没有访问权限。",
        });
        return;
      }

      await send({ type: "status", message: "正在下载附件" });

      const [slidesFiles, sampleFiles] = await Promise.all([
        downloadMaterialFiles(submission.slides_storage_path),
        downloadMaterialFiles(submission.sample_storage_path).catch(() => []),
      ]);

      const providerRaw = String(
        payload.provider || process.env.AI_PROVIDER || "gemini",
      ).toLowerCase();
      let provider: AIProvider = "openai";
      if (providerRaw === "qwen") {
        provider = "qwen";
      } else if (providerRaw === "gemini") {
        provider = "gemini";
      }
      const reqModel = payload.model ? String(payload.model) : undefined;

      await send({ type: "status", message: "正在生成试卷内容" });

      const examMarkdown = await generateExamMarkdown(
        {
          courseTitle: submission.course_title,
          courseDescription: submission.course_description,
          questionCount,
          difficultyLevel: difficulty,
          extraInstructions,
          provider,
          model: reqModel,
          materials: {
            slides: slidesFiles,
            samples: sampleFiles,
          },
        },
        async (chunk) => {
          if (chunk) {
            await send({ type: "chunk", text: chunk });
          }
        },
      );

      await send({ type: "status", message: "正在渲染 PDF" });

      const pdfBuffer = await renderPdfFromMarkdown(examMarkdown);
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-assets";
      const pdfPath = `${user.id}/exams/${randomUUID()}.pdf`;
      const serviceSupabase = createServiceRoleSupabaseClient();

      const { error: uploadError } = await serviceSupabase.storage
        .from(bucket)
        .upload(pdfPath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`上传 PDF 失败：${uploadError.message}`);
      }

      await send({ type: "status", message: "正在保存记录" });

      const { data: examRecord, error: insertError } = await supabase
        .from("exam_generations")
        .insert({
          submission_id: submission.id,
          owner_id: user.id,
          status: "completed",
          model: reqModel || provider,
          prompt: extraInstructions,
          output_markdown: examMarkdown,
          pdf_storage_path: pdfPath,
          metadata: {
            questionCount,
            difficulty,
            provider,
            model: reqModel,
            slidesCount: slidesFiles.length,
            sampleCount: sampleFiles.length,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`保存生成记录失败：${insertError.message}`);
      }

      await send({
        type: "done",
        examId: examRecord.id,
      });
    } catch (error) {
      console.error(error);
      await send({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "生成模拟卷失败，请稍后再试。",
      });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
