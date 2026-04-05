// ============================================
// NovaMind AI - Ollama Client Library
// ============================================

import { OllamaChatOptions, OllamaResponse, OllamaMessage } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
const DEFAULT_TIMEOUT = 300000; // 5 minutes

class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || OLLAMA_BASE_URL;
    this.model = model || DEFAULT_MODEL;
  }

  /**
   * Check if Ollama is running and model is available
   */
  async healthCheck(): Promise<{ status: boolean; model: string; available: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { status: false, model: this.model, available: false, message: 'Ollama không phản hồi' };
      }

      const data = await response.json();
      const models = data.models || [];
      const modelAvailable = models.some((m: { name: string }) => 
        m.name.includes(this.model.split(':')[0])
      );

      return {
        status: true,
        model: this.model,
        available: modelAvailable,
        message: modelAvailable ? `Model ${this.model} sẵn sàng` : `Model ${this.model} chưa được tải. Vui lòng chạy: ollama pull ${this.model}`,
      };
    } catch (error) {
      return {
        status: false,
        model: this.model,
        available: false,
        message: `Không thể kết nối Ollama tại ${this.baseUrl}. Đảm bảo Ollama đang chạy.`,
      };
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName?: string): Promise<{ success: boolean; message: string }> {
    const model = modelName || this.model;
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(600000), // 10 min timeout for download
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `Lỗi tải model: ${err}` };
      }

      return { success: true, message: `Đã tải model ${model} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi kết nối: ${error}` };
    }
  }

  /**
   * Generate a chat completion (non-streaming)
   */
  async chat(messages: OllamaMessage[], options?: Partial<OllamaChatOptions>): Promise<OllamaResponse> {
    const opts: OllamaChatOptions = {
      model: options?.model || this.model,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 2048,
        repeat_penalty: 1.1,
        ...options?.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama chat error: ${err}`);
    }

    return response.json();
  }

  /**
   * Generate a streaming chat completion
   * Yields partial response chunks
   */
  async *chatStream(
    messages: OllamaMessage[],
    options?: Partial<OllamaChatOptions>
  ): AsyncGenerator<OllamaResponse> {
    const opts: OllamaChatOptions = {
      model: options?.model || this.model,
      messages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 4096,
        repeat_penalty: 1.1,
        ...options?.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama stream error: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: OllamaResponse = JSON.parse(line);
            yield chunk;
            if (chunk.done) return;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }
  }

  /**
   * Simple generation (non-chat)
   */
  async generate(prompt: string, system?: string): Promise<string> {
    const messages: OllamaMessage[] = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.chat(messages);
    return response.response;
  }
}

// Singleton instance
let clientInstance: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!clientInstance) {
    clientInstance = new OllamaClient();
  }
  return clientInstance;
}

export { OllamaClient };
