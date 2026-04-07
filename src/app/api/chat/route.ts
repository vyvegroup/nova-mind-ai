// ============================================
// VenAI - Chat API Route (Streaming SSE)
// Enhanced with model fallback, timeout, and error recovery
// ============================================

import { NextRequest } from 'next/server';
import { processMessage, processMessageWithTools } from '@/lib/agents/orchestrator';
import { getOllamaClient } from '@/lib/ollama';
import type { AgentRole, Message } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, agentOverride, files, sessionId } = body as {
      message: string;
      history: Message[];
      agentOverride?: AgentRole;
      files?: Array<{ name: string; content: string }>;
      sessionId?: string;
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const startTime = Date.now();
    const REQUEST_TIMEOUT = 120000; // 2 minutes total
    let firstTokenSent = false;

    const stream = new ReadableStream({
      async start(controller) {
        // Set up a timeout that sends an error if no response comes
        const timeoutId = setTimeout(() => {
          if (!firstTokenSent) {
            console.error(`[Chat API] No response after ${REQUEST_TIMEOUT/1000}s`);
            const errorChunk = {
              type: 'error',
              error: `⏰ Model phản hồi quá chậm (>${REQUEST_TIMEOUT/1000}s). Đang thử model dự phòng...`,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }, REQUEST_TIMEOUT);

        try {
          // Pre-flight: verify model is working
          const ollama = getOllamaClient();
          const activeModel = await ollama.getActiveModel();
          console.log(`[Chat API] Using model: ${activeModel}`);

          // Send model info to client
          const modelInfo = {
            type: 'thinking',
            content: `🧠 Model: ${activeModel} | Đang suy nghĩ...`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(modelInfo)}\n\n`));

          // Use processMessageWithTools if sessionId is provided
          const generator = sessionId
            ? processMessageWithTools(message, history || [], agentOverride, files, sessionId)
            : processMessage(message, history || [], agentOverride, files);

          for await (const chunk of generator) {
            // Clear timeout on first token
            if (!firstTokenSent && (chunk.type === 'token' || chunk.type === 'done')) {
              firstTokenSent = true;
              clearTimeout(timeoutId);
            }

            // Check for stream timeout
            if (Date.now() - startTime > REQUEST_TIMEOUT * 2) {
              const timeoutChunk = {
                type: 'error',
                error: '⏰ Quá thời gian xử lý. Vui lòng thử lại.',
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(timeoutChunk)}\n\n`));
              break;
            }

            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // If error type, close stream
            if (chunk.type === 'error') {
              break;
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          clearTimeout(timeoutId);
          
          const errorMsg = error instanceof Error ? error.message : 'Unknown';
          const isModelError = errorMsg.includes('not found') || 
                               errorMsg.includes('does not exist') ||
                               errorMsg.includes('pull model');

          const errorChunk = {
            type: 'error',
            error: isModelError 
              ? `🚫 Lỗi model: ${errorMsg}. Đang thử model dự phòng...`
              : `❌ Lỗi: ${errorMsg}`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
        } finally {
          clearTimeout(timeoutId);
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Chat API] Server error:', error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  try {
    const ollama = getOllamaClient();
    const health = await ollama.healthCheck();

    if (health.status && !health.available) {
      // Try to find a working model
      const workingModel = await ollama.findWorkingModel();
      if (workingModel) {
        return Response.json({
          status: true,
          model: workingModel,
          available: true,
          message: `Model ${workingModel} sẵn sàng`,
        });
      }

      // Try pulling the default model
      const pullResult = await ollama.pullModel();
      if (pullResult.success) {
        const recheck = await ollama.healthCheck();
        return Response.json(recheck);
      }
    }

    return Response.json(health);
  } catch (error) {
    return Response.json({
      status: false,
      model: 'unknown',
      available: false,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}
