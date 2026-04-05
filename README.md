# ⚡ NovaMind AI - Multi-Agent Live System

> AI Multi-Agent chạy hoàn toàn local với Gemma, deploy live qua GitHub Actions + Cloudflare Tunnel.  
> Giao diện mobile-first y chang GPT, với floating chat và 5 agent chuyên gia.

## 🌟 Features

- **🤖 Multi-Agent System** - 5 AI agents chuyên biệt tự động phối hợp
- **🧠 Gemma Local** - Chạy model AI local, không cần API key hay cloud AI
- **⚡ Live Streaming** - Trả lời real-time với SSE streaming
- **📱 Mobile-First** - Giao diện tối ưu cho mobile, y chang GPT/Claude
- **🔄 Auto Agent Selection** - Tự động chọn agent phù hợp nhất
- **🚀 GitHub Actions Deploy** - 1 click deploy, chạy 6 giờ miễn phí
- **🔗 Cloudflare Tunnel** - Expose public URL không cần VPS
- **🎭 Dark/Light Mode** - Giao diện đẹp mắt với animations
- **💾 Session Persistence** - Lưu lịch sử chat trên browser

## 🤖 AI Agents

| Agent | Vai trò | Chuyên môn |
|-------|--------|-----------|
| 🧠 **Nova** | Orchestrator | Điều phối, chat, phân tích tổng hợp |
| 💻 **CodeX** | Coder | Lập trình, debug, code review |
| 📚 **Athena** | Researcher | Nghiên cứu, phân tích dữ liệu |
| 📋 **Stratos** | Planner | Kế hoạch, chiến lược, decomposition |
| 🔍 **Critique** | Reviewer | Đánh giá, QA, security audit |

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Mobile Browser          │
│    (PWA, GPT-like Interface)    │
└──────────┬──────────────────────┘
           │ SSE Streaming
┌──────────▼──────────────────────┐
│       Next.js App (Port 3000)   │
│  ┌───────────────────────────┐  │
│  │   Multi-Agent Orchestrator│  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ │  │
│  │  │Nova │ │CodeX│ │...  │ │  │
│  │  └──┬──┘ └──┬──┘ └──┬──┘ │  │
│  └─────┼───────┼───────┼────┘  │
└────────┼───────┼───────┼───────┘
         │       │       │
┌────────▼───────▼───────▼───────┐
│     Ollama (Port 11434)        │
│     Gemma 3 (Local LLM)        │
└────────────────────────────────┘
         │
┌────────▼────────────────────────┐
│    Cloudflare Tunnel (Public)   │
└────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: GitHub Actions Deploy (Recommended)

1. **Fork** repository này
2. Vào **Settings → Secrets and variables → Actions**
3. Thêm secret:
   - `CLOUDFLARE_TUNNEL_TOKEN` (lấy từ [Cloudflare Zero Trust](https://one.dash.cloudflare.com/))
4. Vào **Actions → "NovaMind AI - Live Deploy" → Run workflow**
5. Chọn model và chạy! App sẽ live trong ~6 giờ

### Option 2: Local Development

```bash
# Clone repo
git clone <your-repo-url>
cd nova-mind-ai

# Install dependencies
bun install

# Install & start Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull gemma3:4b

# Start dev server
bun run dev
```

Truy cập: `http://localhost:3000`

## 📦 Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS 4
- **UI**: shadcn/ui, Framer Motion, Lucide Icons
- **AI**: Ollama, Gemma 3 (local)
- **State**: Zustand (client persistence)
- **Deploy**: GitHub Actions, Cloudflare Tunnel
- **Streaming**: Server-Sent Events (SSE)

## 🎨 Inspired By

- [claw-code](https://github.com/ultraworkers/claw-code) - Multi-agent coordination philosophy
- ChatGPT / Claude - UI/UX design
- Open-source AI community

## 📝 License

MIT
