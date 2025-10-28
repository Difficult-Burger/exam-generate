import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { downloadMaterialFile } from "@/lib/materials/download";
import {
  generateExamMarkdown,
  type ExamGenerationOptions,
} from "@/lib/exams/generate";
import { renderPdfFromMarkdown } from "@/lib/exams/render-pdf";
import type { AIProvider } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

    if (!user) {
      return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    const payload = await request.json();
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
      return NextResponse.json(
        { message: "缺少 submissionId" },
        { status: 400 },
      );
    }

    const { data: submission, error } = await supabase
      .from("course_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("owner_id", user.id)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        {
          message:
            error?.message ??
            "未找到对应课程资料或你没有访问权限。",
        },
        { status: 404 },
      );
    }

    const [slidesFile, sampleFile] = await Promise.all([
      downloadMaterialFile(submission.slides_storage_path),
      submission.sample_storage_path
        ? downloadMaterialFile(submission.sample_storage_path).catch(
            () => null,
          )
        : Promise.resolve(null),
    ]);

    const providerRaw = String(
      payload.provider || process.env.AI_PROVIDER || "openai",
    ).toLowerCase();
    const provider: AIProvider =
      providerRaw === "qwen" ? "qwen" : "openai";
    const reqModel = payload.model ? String(payload.model) : undefined;

    const examMarkdown = await generateExamMarkdown({
      courseTitle: submission.course_title,
      courseDescription: submission.course_description,
      questionCount,
      difficultyLevel: difficulty,
      extraInstructions,
      provider,
      model: reqModel,
      materials: {
        slides: slidesFile,
        sample: sampleFile,
      },
    });

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
        },
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`保存生成记录失败：${insertError.message}`);
    }

    return NextResponse.json(
      {
        exam: examRecord,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "生成模拟卷失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
