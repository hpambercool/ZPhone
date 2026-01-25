
import { WorldEntry, ChatMessage, AppConfig } from "../types";

const ENV_API_KEY = process.env.API_KEY;

// Helper to sanitize base URL
// Ensure it points to the OpenAI-compatible v1 endpoint root if not specified
const getBaseUrl = (url?: string) => {
  let baseUrl = url ? url.trim() : "https://api.openai.com/v1";
  // Remove trailing slash
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  // Heuristic: if user input doesn't contain /v1, append it. 
  // This is a common convention for these input fields.
  if (!baseUrl.includes('/v1')) {
     baseUrl = `${baseUrl}/v1`;
  }
  return baseUrl;
};

export const validateAndListModels = async (apiUrl: string, apiKey: string) => {
  try {
    const baseUrl = getBaseUrl(apiUrl);
    const key = apiKey?.trim() || ENV_API_KEY || '';

    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
       throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    // OpenAI List Models response: { data: [ { id: "..." }, ... ] }
    if (data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
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
    const apiKey = config.customApiKey?.trim() || ENV_API_KEY;
    if (!apiKey) {
      throw new Error("System Environment Error: API Key not configured.");
    }
    
    const baseUrl = getBaseUrl(config.customApiUrl);

    // Construct System Instruction
    const activeLore = worldBook
      .filter((entry) => entry.active)
      .map((entry) => `[${entry.title}]: ${entry.content}`)
      .join("\n\n");

    const baseSystemInstruction = systemPromptOverride || "你是一个居住在未来OS 26系统中的智能AI助手。请使用简体中文回答用户的问题。";
    
    const finalSystemInstruction = activeLore 
      ? `${baseSystemInstruction}\n\n=== 世界书上下文 (已知事实) ===\n${activeLore}\n=================` 
      : baseSystemInstruction;

    // Build messages array
    const messages = [
        { role: 'system', content: finalSystemInstruction }
    ];

    history.forEach(msg => {
        messages.push({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
        });
    });

    messages.push({ role: 'user', content: currentMessage });

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: config.model,
            messages: messages,
            stream: true,
            temperature: 0.7 
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    return {
        [Symbol.asyncIterator]: async function* () {
            let buffer = '';
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; 

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        if (trimmed === 'data: [DONE]') return;
                        if (trimmed.startsWith('data: ')) {
                            try {
                                const jsonStr = trimmed.slice(6);
                                const json = JSON.parse(jsonStr);
                                const content = json.choices?.[0]?.delta?.content;
                                if (content) {
                                    yield { text: content };
                                }
                            } catch (e) {
                                console.error('Error parsing SSE:', e);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }
    };

  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
};
