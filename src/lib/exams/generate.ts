import { getLLMClient, getDefaultModel, type AIProvider } from "@/lib/openai";
import { toFile } from "openai/uploads";
import type { StoredMaterialFile } from "@/lib/materials/download";

export interface ExamGenerationOptions {
  courseTitle: string;
  courseDescription?: string | null;
  questionCount?: number;
  difficultyLevel?: "easy" | "medium" | "hard";
  extraInstructions?: string | null;
  provider?: AIProvider;
  model?: string;
  materials: {
    slides: StoredMaterialFile;
    sample?: StoredMaterialFile | null;
  };
}

export const generateExamMarkdown = async ({
  courseTitle,
  courseDescription,
  questionCount = 20,
  difficultyLevel = "medium",
  extraInstructions,
  provider,
  model,
  materials,
}: ExamGenerationOptions) => {
  const client = getLLMClient(provider);
  const modelToUse = model || getDefaultModel(provider);

  if (provider === "openai") {
    throw new Error(
      "当前配置的模型无法直接理解 PDF/PPT，请将 AI_PROVIDER 设置为 qwen。",
    );
  }

  const instructionsBlock = [
    "",
    "请基于上述内容生成一份 markdown 模拟卷，包含以下结构：",
    "1. 试卷头部信息（课程名称、考试时长、总分）",
    "2. 单选题部分",
    "3. 填空题部分",
    "4. 计算 / 解答题部分（如适用）",
    "5. 简答 / 论述题部分",
    "6. 参考答案（逐题给出要点或答案）",
    "",
    "请严格使用 Markdown 格式（标题、列表、粗体等），并在答案部分使用清晰的二级标题或折叠以便阅读。",
  ].join("\n");

  const uploadedFiles: Array<{ id: string; label: string }> = [];

  const uploadMaterial = async (
    material: StoredMaterialFile | null | undefined,
    label: string,
  ) => {

    if (!material) return;

    const file = await toFile(material.buffer, material.fileName, {
      type: material.mimeType ?? "application/octet-stream",
    });

    const uploaded = await client.files.create({
      file,
      purpose: "file-extract",
    });

    uploadedFiles.push({ id: uploaded.id, label });
  };

  await uploadMaterial(materials.slides, "课程 slides");
  await uploadMaterial(materials.sample, "样例试卷");

  if (uploadedFiles.length === 0) {
    throw new Error("未找到可供分析的附件，请重新上传课程资料。");
  }

  const attachmentsSummary = uploadedFiles
    .map((file, index) => `附件${index + 1}（${file.label}）: fileid://${file.id}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: modelToUse,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an experienced university exam designer. You create markdown-formatted mock exams with clear section headings, numbered questions, and provide answer keys at the end.",
      },
      ...uploadedFiles.map((file) => ({
        role: "system" as const,
        content: `fileid://${file.id}`,
      })),
      {
        role: "user",
        content: [
          attachmentsSummary,
          `课程名称: ${courseTitle}`,
          courseDescription ? `课程简介: ${courseDescription}` : null,
          `题量目标: ${questionCount} 道题`,
          `难度: ${difficultyLevel}`,
          extraInstructions
            ? `额外要求: ${extraInstructions}`
            : "额外要求: 无",
          instructionsBlock,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const markdown =
    completion.choices[0]?.message?.content?.trim() ?? null;

  if (!markdown) {
    throw new Error("未能从大模型获取到模拟卷内容。");
  }

  return markdown;
};
