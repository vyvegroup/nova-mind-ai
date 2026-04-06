// ============================================
// VenAI - Direct Ollama Debug Endpoint
// ============================================

import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Ollama version
  try {
    const res = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(5000) });
    results.ollama_version = await res.json();
  } catch (e) {
    results.ollama_version_error = String(e);
  }

  // Test 2: List models
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    results.models = (data.models || []).map((m: { name: string; size: number }) => ({
      name: m.name,
      size_gb: Math.round(m.size / 1e9 * 10) / 10,
    }));
  } catch (e) {
    results.models_error = String(e);
  }

  // Test 3: Simple generate (non-chat, most basic)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'gemma3:1b',
        prompt: 'Say hello',
        stream: false,
        options: { num_predict: 50 },
      }),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    results.generate_test = {
      status: res.status,
      response: data.response,
      done: data.done,
      eval_count: data.eval_count,
      total_duration: data.total_duration,
    };
  } catch (e) {
    results.generate_error = String(e);
  }

  // Test 4: Chat API (non-streaming)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'gemma3:1b',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
        options: { num_predict: 50 },
      }),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    results.chat_test = {
      status: res.status,
      response: data.response,
      done: data.done,
      eval_count: data.eval_count,
    };
  } catch (e) {
    results.chat_error = String(e);
  }

  // Test 5: Running processes
  try {
    const res = await fetch(`${OLLAMA_URL}/api/ps`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    results.running_models = data.models;
  } catch (e) {
    results.ps_error = String(e);
  }

  return NextResponse.json(results);
}
