// ============================================
// NovaMind AI - Health Check API
// ============================================

import { getOllamaClient } from '@/lib/ollama';

export async function GET() {
  try {
    const ollama = getOllamaClient();
    const health = await ollama.healthCheck();
    return Response.json(health);
  } catch (error) {
    return Response.json({
      status: false,
      model: 'unknown',
      available: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function POST(request: Request) {
  try {
    const ollama = getOllamaClient();
    const { action, model } = await request.json() as { action: string; model?: string };
    
    if (action === 'pull') {
      const result = await ollama.pullModel(model);
      return Response.json(result);
    }
    
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({
      status: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}
