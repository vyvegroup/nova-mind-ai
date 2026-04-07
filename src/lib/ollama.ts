// ============================================
// VenAI - Ollama Client Library
// With model fallback, health verification, and timeout protection
// ============================================

import { OllamaChatOptions, OllamaResponse, OllamaMessage } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';
const DEFAULT_TIMEOUT = 120000; // 2 minutes per request
const STREAM_TIMEOUT = 180000; // 3 minutes for streaming

// Model fallback chain - if primary model fails, try next
const MODEL_FALLBACKS = [
  'gemma4:e4b',
  'gemma3:4b',
  'llama3.2:3b',
  'phi3:mini',
  'tinyllama',
];

class OllamaClient {
  private baseUrl: string;
  private model: string;
  private activeModel: string | null = null;
  private verifiedModels: Set<string> = new Set();
  private failedModels: Set<string> = new Set();
  private pulling: Set<string> = new Set();

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
      const modelName = this.activeModel || this.model;
      const modelAvailable = models.some((m: { name: string }) => 
        m.name === modelName || m.name.startsWith(modelName.split(':')[0])
      );

      return {
        status: true,
        model: modelName,
        available: modelAvailable,
        message: modelAvailable ? `Model ${modelName} sẵn sàng` : `Model ${modelName} chưa được tải.`,
      };
    } catch (error) {
      return {
        status: false,
        model: this.model,
        available: false,
        message: `Không thể kết nối Ollama tại ${this.baseUrl}`,
      };
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }

  /**
   * Verify a model works by sending a tiny test request
   */
  async verifyModel(modelName: string): Promise<boolean> {
    if (this.verifiedModels.has(modelName)) return true;
    if (this.failedModels.has(modelName)) return false;

    try {
      console.log(`[Ollama] Verifying model: ${modelName}`);
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
          keep_alive: '5m',
          options: { num_predict: 10 },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.log(`[Ollama] Model ${modelName} verification failed: ${response.status}`);
        this.failedModels.add(modelName);
        return false;
      }

      const data = await response.json();
      const hasContent = !!(data.message?.content || data.response);
      if (hasContent) {
        console.log(`[Ollama] Model ${modelName} verified ✓`);
        this.verifiedModels.add(modelName);
        this.activeModel = modelName;
      } else {
        console.log(`[Ollama] Model ${modelName} returned empty response`);
        this.failedModels.add(modelName);
      }
      return hasContent;
    } catch (error) {
      console.log(`[Ollama] Model ${modelName} verification error: ${error}`);
      this.failedModels.add(modelName);
      return false;
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName?: string): Promise<{ success: boolean; message: string }> {
    const model = modelName || this.model;

    // Prevent duplicate pulls
    if (this.pulling.has(model)) {
      return { success: false, message: `Đang tải model ${model}...` };
    }
    this.pulling.add(model);

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(600000),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `Lỗi tải model: ${err}` };
      }

      this.verifiedModels.delete(model);
      this.failedModels.delete(model);
      return { success: true, message: `Đã tải model ${model}` };
    } catch (error) {
      return { success: false, message: `Lỗi kết nối: ${error}` };
    } finally {
      this.pulling.delete(model);
    }
  }

  /**
   * Find a working model from fallback chain
   */
  async findWorkingModel(): Promise<string | null> {
    // First check if current model is verified
    if (this.activeModel && this.verifiedModels.has(this.activeModel)) {
      return this.activeModel;
    }

    const availableModels = await this.listModels();
    console.log(`[Ollama] Available models: ${availableModels.join(', ')}`);

    // Try the primary model first
    const modelsToTry = [this.model, ...MODEL_FALLBACKS.filter(m => m !== this.model)];

    for (const model of modelsToTry) {
      if (this.failedModels.has(model)) continue;

      // Check if model is downloaded
      const isDownloaded = availableModels.some((m: string) =>
        m === model || m.startsWith(model.split(':')[0])
      );

      if (!isDownloaded) {
        console.log(`[Ollama] Model ${model} not downloaded, pulling...`);
        const pullResult = await this.pullModel(model);
        if (!pullResult.success) {
          this.failedModels.add(model);
          continue;
        }
      }

      // Verify model works
      if (await this.verifyModel(model)) {
        return model;
      }
    }

    console.error('[Ollama] No working model found!');
    return null;
  }

  /**
   * Get the currently active working model
   */
  async getActiveModel(): Promise<string> {
    if (this.activeModel && this.verifiedModels.has(this.activeModel)) {
      return this.activeModel;
    }
    const working = await this.findWorkingModel();
    return working || this.model;
  }

  /**
   * Generate a chat completion (non-streaming)
   */
  async chat(messages: OllamaMessage[], options?: Partial<OllamaChatOptions>): Promise<OllamaResponse> {
    const modelName = options?.model || await this.getActiveModel();
    const opts: OllamaChatOptions = {
      model: modelName,
      messages,
      stream: false,
      keep_alive: '10m',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 2048,
        repeat_penalty: 1.1,
        ...options?.options,
      },
    };

    console.log(`[Ollama] Chat request: model=${opts.model}, messages=${messages.length}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Ollama] Chat error ${response.status}: ${err}`);
        // Model might have failed, try fallback
        this.failedModels.add(modelName);
        this.verifiedModels.delete(modelName);
        const fallback = await this.findWorkingModel();
        if (fallback && fallback !== modelName) {
          console.log(`[Ollama] Retrying with fallback model: ${fallback}`);
          return this.chat(messages, { ...options, model: fallback });
        }
        throw new Error(`Ollama chat error: ${err}`);
      }

      const data = await response.json();
      if (data.message && data.message.content) {
        data.response = data.message.content;
      }
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Ollama chat error')) throw error;
      throw new Error(`Ollama connection error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Generate a streaming chat completion
   * Yields partial response chunks with timeout protection
   */
  async *chatStream(
    messages: OllamaMessage[],
    options?: Partial<OllamaChatOptions>
  ): AsyncGenerator<OllamaResponse> {
    const modelName = options?.model || await this.getActiveModel();
    const opts: OllamaChatOptions = {
      model: modelName,
      messages,
      stream: true,
      keep_alive: '10m',
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 2048,
        repeat_penalty: 1.1,
        ...options?.options,
      },
    };

    console.log(`[Ollama] Stream request: model=${opts.model}, messages=${messages.length}`);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
        signal: AbortSignal.timeout(STREAM_TIMEOUT),
      });
    } catch (error) {
      // Connection failed - try fallback model
      console.error(`[Ollama] Connection failed for ${modelName}: ${error}`);
      this.failedModels.add(modelName);
      const fallback = await this.findWorkingModel();
      if (fallback && fallback !== modelName) {
        yield* this.chatStream(messages, { ...options, model: fallback });
        return;
      }
      throw new Error(`Không thể kết nối Ollama: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Ollama] Stream error ${response.status}: ${err}`);
      this.failedModels.add(modelName);
      const fallback = await this.findWorkingModel();
      if (fallback && fallback !== modelName) {
        yield* this.chatStream(messages, { ...options, model: fallback });
        return;
      }
      throw new Error(`Ollama stream error: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let lastChunkTime = Date.now();
    const CHUNK_TIMEOUT = 30000; // 30s without any chunk = model stuck

    try {
      while (true) {
        // Check for chunk timeout
        if (chunkCount > 0 && Date.now() - lastChunkTime > CHUNK_TIMEOUT) {
          console.warn(`[Ollama] Chunk timeout after ${CHUNK_TIMEOUT/1000}s, breaking stream`);
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;
        lastChunkTime = Date.now();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk: OllamaResponse = JSON.parse(line);
              if (chunk.message && chunk.message.content) {
                chunk.response = chunk.message.content;
              }
              chunkCount++;
              if (chunkCount <= 3 || chunkCount % 50 === 0) {
                console.log(`[Ollama] Chunk #${chunkCount}: done=${chunk.done}, response_len=${(chunk.response || '').length}`);
              }
              yield chunk;
              if (chunk.done) return;
            } catch (parseErr) {
              console.error(`[Ollama] JSON parse error on line: ${line.substring(0, 100)}`);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`[Ollama] Stream ended: ${chunkCount} chunks received`);

    // If no chunks received, model might be broken
    if (chunkCount === 0) {
      this.failedModels.add(modelName);
      this.verifiedModels.delete(modelName);
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

  /**
   * Reset verified/failed caches (useful after model changes)
   */
  resetCache() {
    this.verifiedModels.clear();
    this.failedModels.clear();
    this.activeModel = null;
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
