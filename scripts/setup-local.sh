#!/bin/bash
# ============================================
# NovaMind AI - Local Development Setup
# ============================================

set -e

echo "🚀 NovaMind AI - Local Setup"
echo "============================="

# Check Ollama
echo ""
echo "📦 Checking Ollama..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found: $(ollama --version)"
else
    echo "❌ Ollama not found!"
    echo "📥 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Start Ollama if not running
echo ""
echo "🔍 Checking Ollama server..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama server is running"
else
    echo "🚀 Starting Ollama server..."
    ollama serve &
    sleep 3
fi

# Pull model
MODEL="${OLLAMA_MODEL:-gemma4:e4b}"
echo ""
echo "🧠 Pulling model: $MODEL"
echo "   (This may take a few minutes on first run)"
ollama pull "$MODEL"
echo "✅ Model ready!"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
bun install

# Start dev server
echo ""
echo "🌐 Starting development server..."
echo "   URL: http://localhost:3000"
echo ""
echo "⚡ NovaMind AI is ready!"
echo "   Agent: Nova (Orchestrator)"
echo "   Model: $MODEL"
echo "   Ollama: http://localhost:11434"
echo ""

bun run dev
