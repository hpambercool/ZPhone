import { GoogleGenAI } from "@google/genai";
import { WorldEntry, ChatMessage } from "../types";

// Always use process.env.API_KEY as per strict guidelines
const API_KEY = process.env.API_KEY;

export const getGeminiResponseStream = async (
  currentMessage: string,
  history: ChatMessage[],
  worldBook: WorldEntry[],
  modelName: string,
  systemPromptOverride?: string
) => {
  try {
    if (!API_KEY) {
      throw new Error("System Environment Error: API Key not configured.");
    }

    // Initialize client
    const ai = new GoogleGenAI({ apiKey: API_KEY });

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