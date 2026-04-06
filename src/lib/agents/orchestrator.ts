// ============================================
// NovaMind AI - Multi-Agent Orchestrator
// Inspired by claw-code's agent coordination system
// ============================================

import { AGENT_DEFINITIONS, type AgentRole, type Message, type OllamaMessage, type StreamChunk } from '../types';
import { getOllamaClient } from '../ollama';

/**
 * Determines which agent should handle the user's message
 */
function classifyIntent(message: string): { role: AgentRole; confidence: number } {
  const lower = message.toLowerCase();

  const patterns: Record<AgentRole, string[]> = {
    coder: [
      'code', 'lập trình', 'program', 'function', 'class', 'api', 'database',
      'bug', 'error', 'debug', 'fix', 'implement', 'build', 'deploy', 'server',
      'react', 'node', 'python', 'javascript', 'typescript', 'html', 'css',
      'git', 'docker', 'sql', 'algorithm', 'framework', 'library', 'module',
      'component', 'viết code', 'code cho', 'hàm', 'biến', 'mảng', 'object',
      'async', 'promise', 'fetch', 'api endpoint', 'webhook', 'miễn phí',
      'hosting', 'vps', 'domain', 'ssl', 'nginx', 'apache', 'script',
      'terminal', 'command', 'cli', 'package', 'npm', 'bun', 'install',
    ],
    researcher: [
      'research', 'nghiên cứu', 'analyze', 'phân tích', 'data', 'statistics',
      'trend', 'compare', 'so sánh', 'report', 'báo cáo', 'survey', 'study',
      'market', 'thị trường', 'industry', 'information', 'thông tin', 'find',
      'tìm hiểu', 'giải thích', 'what is', 'cái gì', 'tại sao', 'how does',
      'khác nhau', 'ưu nhược', 'pros and cons', 'đánh giá', 'giới thiệu',
      'history', 'lịch sử', 'tổng quan', 'overview',
    ],
    planner: [
      'plan', 'kế hoạch', 'strategy', 'chiến lược', 'roadmap', 'steps',
      'bước', 'project', 'dự án', 'timeline', 'milestone', 'task',
      'organize', 'tổ chức', 'prioritize', 'structure', 'cấu trúc',
      'phân chia', 'decompose', 'workflow', 'process', 'quy trình',
      'lên kế hoạch', 'chiến lược', 'mục tiêu', 'objective', 'goal',
      'học gì', 'learning path', 'con đường', 'phát triển',
    ],
    reviewer: [
      'review', 'đánh giá', 'check', 'kiểm tra', 'audit', 'quality',
      'chất lượng', 'improve', 'cải thiện', 'optimize', 'tối ưu',
      'security', 'bảo mật', 'performance', 'hiệu năng', 'best practice',
      'refactor', 'code review', 'feedback', 'nhận xét', 'critique',
      'làm tốt hơn', 'sửa lại', 'điểm mạnh yếu',
    ],
  };

  const scores: Record<AgentRole, number> = {
    orchestrator: 0.3,
    coder: 0,
    researcher: 0,
    planner: 0,
    reviewer: 0,
  };

  for (const [role, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[role as AgentRole] += 0.15;
      }
    }
  }

  let bestRole: AgentRole = 'orchestrator';
  let bestScore = 0;

  for (const [role, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestRole = role as AgentRole;
    }
  }

  if (bestScore < 0.5) {
    return { role: 'orchestrator', confidence: 0.6 };
  }

  return { role: bestRole, confidence: Math.min(bestScore, 1) };
}

function buildMessages(
  systemPrompt: string,
  history: Message[],
  currentUserMessage: string
): OllamaMessage[] {
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: currentUserMessage });
  return messages;
}

/**
 * Main orchestrator - processes through the multi-agent system
 */
export async function* processMessage(
  userMessage: string,
  conversationHistory: Message[],
  activeAgentOverride?: AgentRole
): AsyncGenerator<StreamChunk> {
  const { role: selectedRole, confidence } = classifyIntent(userMessage);
  const activeRole = activeAgentOverride || selectedRole;
  const agent = AGENT_DEFINITIONS[activeRole];

  yield {
    type: 'agent_switch',
    agentId: agent.id,
    agentName: agent.name,
    agentColor: agent.color,
    agentRole: agent.role,
    content: `🤖 ${agent.name} đang xử lý...`,
  };

  if (activeRole !== 'orchestrator' && confidence < 0.7) {
    const orchestrator = AGENT_DEFINITIONS.orchestrator;
    const planMessages: OllamaMessage[] = [
      {
        role: 'system',
        content: `${orchestrator.systemPrompt}\n\nNgười dùng hỏi: "${userMessage}"\nTạo plan ngắn gọn (2-3 câu) cho ${agent.name}. Chỉ trả về plan.`,
      },
      { role: 'user', content: `Tạo execution plan cho ${agent.name}` },
    ];

    try {
      const ollama = getOllamaClient();
      const planResponse = await ollama.chat(planMessages, {
        options: { temperature: 0.3, num_predict: 200 },
      });
      yield {
        type: 'thinking',
        content: planResponse.response,
        agentId: orchestrator.id,
        agentName: orchestrator.name,
      };
    } catch { /* skip planning */ }
  }

  const systemPrompt = agent.systemPrompt;
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage);

  try {
    const ollama = getOllamaClient();
    const stream = ollama.chatStream(messages);

    let fullContent = '';
    let tokenCount = 0;
    for await (const chunk of stream) {
      if (chunk.response) {
        fullContent += chunk.response;
        tokenCount++;
        yield {
          type: 'token',
          content: chunk.response,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentRole: agent.role,
        };
      }
    }

    // If no tokens received, try non-streaming as fallback
    if (fullContent.trim().length === 0) {
      console.log('[Orchestrator] Streaming returned empty, trying non-streaming fallback...');
      yield {
        type: 'thinking',
        content: 'Đang thử phương thức khác...',
        agentId: agent.id,
        agentName: agent.name,
      };

      const fallbackResponse = await ollama.chat(messages, {
        options: { temperature: 0.7, num_predict: 1024 },
      });
      fullContent = fallbackResponse.response || '';
      
      if (fullContent.trim().length > 0) {
        yield {
          type: 'token',
          content: fullContent,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentRole: agent.role,
        };
      }
    }

    if (fullContent.trim().length === 0) {
      yield {
        type: 'error',
        error: 'Model không tạo được nội dung. Có thể do thiếu RAM. Thử reload trang hoặc đổi model nhỏ hơn (gemma3:1b).',
      };
    } else {
      yield {
        type: 'done',
        content: fullContent,
        agentId: agent.id,
        agentName: agent.name,
      };
    }
  } catch (error) {
    yield {
      type: 'error',
      error: `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export { classifyIntent, buildMessages };
