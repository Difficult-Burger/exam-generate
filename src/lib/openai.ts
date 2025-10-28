import OpenAI from "openai";

export type AIProvider = "openai" | "qwen";

const cachedClients: Partial<Record<AIProvider, OpenAI>> = {};

const resolveProvider = (provider?: AIProvider): AIProvider => {
  if (provider) return provider;
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "qwen") return "qwen";
  return "openai";
};

export const getLLMClient = (provider?: AIProvider): OpenAI => {
  const selected = resolveProvider(provider);

  if (cachedClients[selected]) {
    return cachedClients[selected] as OpenAI;
  }

  if (selected === "qwen") {
    const apiKey =
      process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    const baseURL =
      process.env.QWEN_BASE_URL ||
      process.env.DASHSCOPE_BASE_URL ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";

    if (!apiKey) {
      throw new Error(
        "QWEN_API_KEY 或 DASHSCOPE_API_KEY 未配置，无法调用 Qwen 接口。",
      );
    }

    const client = new OpenAI({ apiKey, baseURL });
    cachedClients.qwen = client;
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY 未配置，无法调用 OpenAI 接口。",
    );
  }

  const client = new OpenAI({ apiKey });
  cachedClients.openai = client;
  return client;
};

export const getDefaultModel = (provider?: AIProvider): string => {
  const selected = resolveProvider(provider);

  if (selected === "qwen") {
    return process.env.QWEN_DEFAULT_MODEL || "qwen-plus";
  }

  return process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
};
