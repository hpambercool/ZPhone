import { GoogleGenAI } from "@google/genai";
import { WorldEntry, ChatMessage } from "../types";

// Safe accessor for environment variables in browser environments
const getEnvApiKey = () => {
  try {
    // @ts-ignore: process might not be defined in browser
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

export const getGeminiResponseStream = async (
  currentMessage: string,
  history: ChatMessage[],
  worldBook: WorldEntry[],
  modelName: string,
  systemPromptOverride?: string,
  _customApiUrl?: string, // Reserved for future implementation
  customApiKey?: string
) => {
  try {
    // Prioritize custom key from settings, then fallback to env
    const apiKey = customApiKey || getEnvApiKey();

    if (!apiKey) {
      throw new Error("未检测到 API 密钥。请在‘设置’应用中输入您的 Google Gemini API Key。");
    }

    // Initialize client per request to support dynamic keys
    const ai = new GoogleGenAI({ apiKey });

    // Construct System Instruction from WorldBook + Settings
    const activeLore = worldBook
      .filter((entry) => entry.active)
      .map((entry) => `[${entry.title}]: ${entry.content}`)
      .join("\n\n");

    const baseSystemInstruction = systemPromptOverride || "你是一个居住在未来OS 26系统中的智能AI助手。请使用简体中文回答用户的问题。";
    
    const finalSystemInstruction = activeLore 
      ? `${baseSystemInstruction}\n\n=== 世界书上下文 (已知事实) ===\n${activeLore}\n=================` 
      : baseSystemInstruction;

    const historyForGemini = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: modelName,
      history: historyForGemini,
      config: {
        systemInstruction: finalSystemInstruction,
      },
    });

    const result = await chat.sendMessageStream({
      message: currentMessage
    });

    return result;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};