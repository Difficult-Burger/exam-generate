import {
  getLLMClient,
  getDefaultModel,
  resolveProvider,
  type AIProvider,
} from "@/lib/openai";
import { toFile } from "openai/uploads";
import type { StoredMaterialFile } from "@/lib/materials/files";
import { getGeminiModel, getGeminiFileManager } from "@/lib/gemini/client";

export interface ExamGenerationOptions {
  courseTitle: string;
  courseDescription?: string | null;
  questionCount?: number;
  difficultyLevel?: "easy" | "medium" | "hard";
  extraInstructions?: string | null;
  provider?: AIProvider;
  model?: string;
  materials: {
    slides: StoredMaterialFile[];
    samples?: StoredMaterialFile[];
  };
}

export const generateExamMarkdown = async (
  {
    courseTitle,
    courseDescription,
    questionCount = 20,
    difficultyLevel = "medium",
    extraInstructions,
    provider,
    model,
    materials,
  }: ExamGenerationOptions,
  onStreamChunk?: (chunk: string) => Promise<void> | void,
) => {
  const selectedProvider = resolveProvider(provider);

  if (selectedProvider === "openai") {
    throw new Error(
      "当前配置的模型无法直接理解 PDF/PPT，请将 AI_PROVIDER 设置为 qwen 或 gemini。",
    );
  }

  const templateGuidance = [
    "",
    "请严格按照以下 Markdown 模板组织输出：",
    "# 试卷标题（示例：线性代数期末模拟卷）",
    "- 考试时长：XX 分钟",
    "- 试卷总分：XX 分",
    "",
    "## 一、单选题（共 X 题，每题 X 分）",
    "1. **题干描述**",
    "   - A. 选项 A",
    "   - B. 选项 B",
    "   - C. 选项 C",
    "   - D. 选项 D",
    "",
    "## 二、填空题（共 X 题，每题 X 分）",
    "1. 题干，使用下划线或留白表示答案位置",
    "",
    "## 三、计算 / 解答题（如适用）",
    "1. 题干，分条描述已知条件和求解步骤",
    "",
    "## 四、简答题",
    "1. 题干，列出需要回答的要点",
    "",
    "## 参考答案",
    "### 单选题",
    "1. 正确选项 + 简要解析",
    "### 填空题",
    "1. 标准答案或要点",
    "### 计算 / 解答题",
    "1. 作答步骤与最终结论",
    "### 简答题",
    "1. 核心要点",
  ].join("\n");

  if (selectedProvider === "gemini") {
    const attachments: Array<{ label: string; file: StoredMaterialFile }> = [];

    materials.slides.forEach((file, index) => {
      attachments.push({
        label: `课程 slides (${index + 1})`,
        file,
      });
    });

    materials.samples?.forEach((file, index) => {
      attachments.push({
        label: `样例试卷 (${index + 1})`,
        file,
      });
    });

    if (attachments.length === 0) {
      throw new Error("未找到可供分析的附件，请重新上传课程资料。");
    }

    const attachmentsSummary = attachments
      .map(
        (attachment, index) =>
          `附件${index + 1}（${attachment.label}）已随消息上传供参考。`,
      )
      .join("\n");

    const prompt = [
      attachmentsSummary,
      `课程名称: ${courseTitle}`,
      courseDescription ? `课程简介: ${courseDescription}` : null,
      `题量目标: ${questionCount} 道题`,
      `难度: ${difficultyLevel}`,
      extraInstructions
        ? `额外要求: ${extraInstructions}`
        : "额外要求: 无",
      "请基于附件内容生成结构化的 Markdown 模拟卷，务必满足：",
      "- 试卷头部包含课程名称、考试时长、满分等关键信息；",
      "- 单选题、填空题、计算题（如适用）、简答题分段呈现，题干与选项之间换行清晰，选项使用 A/B/C/D 形式；",
      "- 不要引用或生成需要查看图片的题目，如原题依赖图片，请改用文字描述；",
      "- 参考答案使用二级标题或折叠块，按题号依次给出答案；",
      "- 保证 Markdown 语法规范，便于后续转换为 PDF。",
      templateGuidance,
    ]
      .filter(Boolean)
      .join("\n");

    const modelInstance = getGeminiModel(model);
    const fileManager = getGeminiFileManager();

    const uploaded = [];
    for (const attachment of attachments) {
      const uploadResponse = await fileManager.uploadFile(
        attachment.file.buffer,
        {
          displayName: attachment.file.fileName,
          mimeType: attachment.file.mimeType ?? "application/octet-stream",
        },
      );

      uploaded.push({
        label: attachment.label,
        mimeType: attachment.file.mimeType ?? "application/octet-stream",
        uri: uploadResponse.file.uri,
      });
    }

    const parts = [
      {
        text: prompt,
      },
      ...uploaded.map((item) => ({
        fileData: {
          mimeType: item.mimeType,
          fileUri: item.uri,
        },
      })),
    ];

    const streamResult = await modelInstance.generateContentStream({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    let markdown = "";
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        markdown += text;
        if (onStreamChunk) {
          await onStreamChunk(text);
        }
      }
    }

    if (!markdown) {
      const aggregate = await streamResult.response;
      markdown = aggregate.text()?.trim() ?? "";
    }

    if (!markdown) {
      throw new Error("未能从 Gemini 获取到模拟卷内容。");
    }

    return markdown;
  }

  const client = getLLMClient(selectedProvider);
  const modelToUse = model || getDefaultModel(selectedProvider);

  const instructionsBlock = [
    "",
    "请基于附件生成 Markdown 模拟卷并遵循以下要求：",
    "1. 试卷头部需包含课程名称、考试时长、满分等信息；",
    "2. 单选题、填空题、计算题（如适用）、简答题使用清晰的列表结构，题干与选项之间换行，选项使用 A/B/C/D 标记；",
    "3. 不要引用无法文字描述的图片或图像信息，如原题依赖图片，请改为文字描述；",
    "4. 参考答案使用二级标题或折叠块按题号列出，答案简明准确；",
    "5. 保证 Markdown 语法规范，便于后续转换为 PDF。",
    templateGuidance,
  ].join("\n");

  const uploadedFiles: Array<{ id: string; label: string }> = [];

  const uploadFiles = async (
    files: StoredMaterialFile[] | undefined,
    baseLabel: string,
  ) => {
    if (!files?.length) return;

    for (const [index, source] of files.entries()) {
      const file = await toFile(source.buffer, source.fileName, {
        type: source.mimeType ?? "application/octet-stream",
      });

      const uploaded = await client.files.create({
        file,
        purpose: "file-extract",
      });

      uploadedFiles.push({
        id: uploaded.id,
        label: `${baseLabel} (${index + 1})`,
      });
    }
  };

  await uploadFiles(materials.slides, "课程 slides");
  await uploadFiles(materials.samples, "样例试卷");

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

  if (markdown && onStreamChunk) {
    await onStreamChunk(markdown);
  }

  return markdown;
};
