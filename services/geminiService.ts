import { GoogleGenAI } from "@google/genai";
import { WorldEntry, ChatMessage, AppConfig } from "../types";

const ENV_API_KEY = process.env.API_KEY;

/**
 * Creates a configured GoogleGenAI instance.
 * Priorities: 
 * 1. Custom config passed in (from settings)
 * 2. Environment variable
 */
const createClient = (customUrl?: string, customKey?: string) => {
  const apiKey = customKey?.trim() || ENV_API_KEY;
  
  if (!apiKey) {
    throw new Error("System Environment Error: API Key not configured.");
  }

  const options: any = { apiKey };
  if (customUrl?.trim()) {
    options.baseUrl = customUrl.trim();
  }

  return new GoogleGenAI(options);
};

export const validateAndListModels = async (apiUrl: string, apiKey: string) => {
  try {
    const ai = createClient(apiUrl, apiKey);
    const response = await ai.models.list();
    // The SDK structure for list() response might vary, usually it returns an object with `models` array
    // We map it to a simple string array of names
    if (response && Array.isArray(response)) {
        return response.map((m: any) => m.name.replace('models/', ''));
    } else if (response && (response as any).models) {
        return (response as any).models.map((m: any) => m.name.replace('models/', ''));
    }
    return [];
  } catch (error) {
    console.error("Failed to list models:", error);
    throw error;
  }
};

export const getGeminiResponseStream = async (
  currentMessage: string,
  history: ChatMessage[],
  worldBook: WorldEntry[],
  config: AppConfig,
  systemPromptOverride?: string
) => {
  try {
    // Initialize client using config settings or fallback
    const ai = createClient(config.customApiUrl, config.customApiKey);

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
      model: config.model,
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