import { NextRequest, NextResponse } from 'next/server';

interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

// GET: List local Ollama models
export async function GET() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { models: [], error: 'Ollama not available' },
        { status: 200 }
      );
    }

    const data = await res.json();
    const models: OllamaModel[] = (data.models || []).map((m: { name: string; size?: number; modified_at?: string }) => ({
      name: m.name,
      size: m.size,
      modified_at: m.modified_at,
    }));

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch local models:', error);
    return NextResponse.json(
      { models: [], error: 'Cannot connect to Ollama' },
      { status: 200 }
    );
  }
}

// POST: Search HuggingFace or Pull model via Ollama
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Search HuggingFace models
    if (action === 'search') {
      const { query } = body;
      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { models: [], error: 'Query is required' },
          { status: 400 }
        );
      }

      const res = await fetch(
        `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=20`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!res.ok) {
        return NextResponse.json(
          { models: [], error: 'HuggingFace search failed' },
          { status: 200 }
        );
      }

      const data = await res.json();
      const models = data.map((m: {
        id: string;
        author?: string;
        downloads: number;
        likes: number;
        tags?: string[];
        lastModified?: string;
        pipeline_tag?: string;
      }) => ({
        id: m.id,
        modelId: m.id,
        author: m.author,
        downloads: m.downloads || 0,
        likes: m.likes || 0,
        tags: m.tags || [],
        lastModified: m.lastModified,
        pipeline_tag: m.pipeline_tag,
      }));

      return NextResponse.json({ models });
    }

    // Pull model via Ollama
    if (action === 'pull') {
      const { model } = body;
      if (!model || typeof model !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Model name is required' },
          { status: 400 }
        );
      }

      const res = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(300000), // 5 min timeout for large models
      });

      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Ollama pull failed: ${res.status}` },
          { status: 200 }
        );
      }

      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "search" or "pull".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}
