// ============================================
// NovaMind AI - Chat API Route (Streaming SSE)
// Enhanced with file context support
// ============================================

import { NextRequest } from 'next/server';
import { processMessage } from '@/lib/agents/orchestrator';
import { getOllamaClient } from '@/lib/ollama';
import type { AgentRole, Message } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, agentOverride, files } = body as {
      message: string;
      history: Message[];
      agentOverride?: AgentRole;
      files?: Array<{ name: string; content: string }>;
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = processMessage(message, history || [], agentOverride, files);

          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          const errorChunk = {
            type: 'error',
            error: `Stream error: ${error instanceof Error ? error.message : 'Unknown'}`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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
