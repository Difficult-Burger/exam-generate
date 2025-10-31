import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

let geminiClient: GoogleGenerativeAI | null = null;
let geminiFileManager: GoogleAIFileManager | null = null;

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 未配置，无法调用 Gemini 接口。");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
};

export const getGeminiModel = (model?: string) => {
  const client = getGeminiClient();
  const modelName =
    model || process.env.GEMINI_DEFAULT_MODEL || "gemini-1.5-flash";

  return client.getGenerativeModel({ model: modelName });
};

export const getGeminiFileManager = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 未配置，无法上传附件。");
  }

  if (!geminiFileManager) {
    geminiFileManager = new GoogleAIFileManager(apiKey);
  }

  return geminiFileManager;
};
