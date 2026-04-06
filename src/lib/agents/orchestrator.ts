// ============================================
// NovaMind AI - Multi-Agent Orchestrator
// Enhanced with chain-of-thought, auto-chain mode,
// and Lens (analyzer) agent
// Powered by Gemma 4
// ============================================

import { AGENT_DEFINITIONS, type AgentRole, type Message, type OllamaMessage, type StreamChunk } from '../types';
import { getOllamaClient } from '../ollama';

/**
 * Determines which agent should handle the user's message
 * Enhanced with more Vietnamese keywords and better scoring
 */
function classifyIntent(message: string): { role: AgentRole; confidence: number } {
  const lower = message.toLowerCase();

  const patterns: Record<string, string[]> = {
    coder: [
      'code', 'lập trình', 'program', 'function', 'class', 'api', 'database',
      'bug', 'error', 'debug', 'fix', 'implement', 'build', 'deploy', 'server',
      'react', 'node', 'python', 'javascript', 'typescript', 'html', 'css',
      'git', 'docker', 'sql', 'algorithm', 'framework', 'library', 'module',
      'component', 'viết code', 'code cho', 'hàm', 'biến', 'mảng', 'object',
      'async', 'promise', 'fetch', 'api endpoint', 'webhook', 'miễn phí',
      'hosting', 'vps', 'domain', 'ssl', 'nginx', 'apache', 'script',
      'terminal', 'command', 'cli', 'package', 'npm', 'bun', 'install',
      'refactor', 'optimize code', 'tối ưu code', 'viết lại', 'compile',
      'runtime', 'stack trace', 'exception', 'try catch', 'interface',
      'decorator', 'middleware', 'hook', 'state', 'redux', 'prisma',
      'migrate', 'database schema', 'orm', 'query', 'mutation',
      'test case', 'unit test', 'integration test', 'e2e test',
      'type definition', 'generic', 'enum', 'tuple', 'union type',
    ],
    researcher: [
      'research', 'nghiên cứu', 'analyze', 'phân tích', 'data', 'statistics',
      'trend', 'compare', 'so sánh', 'report', 'báo cáo', 'survey', 'study',
      'market', 'thị trường', 'industry', 'information', 'thông tin', 'find',
      'tìm hiểu', 'giải thích', 'what is', 'cái gì', 'tại sao', 'how does',
      'khác nhau', 'ưu nhược', 'pros and cons', 'đánh giá', 'giới thiệu',
      'history', 'lịch sử', 'tổng quan', 'overview', 'giải thích giúp',
      'nói cho tôi biết', 'kể về', 'cho tôi biết về', 'phân tích giúp',
      'thống kê', 'số liệu', 'dữ liệu', 'benchmark', 'so sánh hiệu suất',
      'ai là', 'when was', 'bao giờ', 'ở đâu', 'tác giả',
      'công nghệ mới', 'trend 2025', 'xu hướng', 'phát triển',
    ],
    planner: [
      'plan', 'kế hoạch', 'strategy', 'chiến lược', 'roadmap', 'steps',
      'bước', 'project', 'dự án', 'timeline', 'milestone', 'task',
      'organize', 'tổ chức', 'prioritize', 'structure', 'cấu trúc',
      'phân chia', 'decompose', 'workflow', 'process', 'quy trình',
      'lên kế hoạch', 'mục tiêu', 'objective', 'goal',
      'học gì', 'learning path', 'con đường', 'phát triển',
      'chuẩn bị', 'prepare', 'phân công', 'assign', 'delegate',
      'sprint', 'agile', 'scrum', 'kanban', 'phased approach',
      'từ a đến z', 'từng bước một', 'guide', 'hướng dẫn từng bước',
      'lộ trình', 'roadmap', 'phân阶段', 'giai đoạn',
    ],
    reviewer: [
      'review', 'đánh giá', 'check', 'kiểm tra', 'audit', 'quality',
      'chất lượng', 'improve', 'cải thiện', 'optimize', 'tối ưu',
      'security', 'bảo mật', 'performance', 'hiệu năng', 'best practice',
      'code review', 'feedback', 'nhận xét', 'critique',
      'làm tốt hơn', 'sửa lại', 'điểm mạnh yếu',
      'vulnerability', 'lỗ hổng', 'xss', 'csrf', 'injection',
      'refactor', 'clean code', 'solid', 'dry', 'kiss',
      'benchmark', 'profiling', 'memory leak', 'bottleneck',
      'code smell', 'anti-pattern', 'technical debt',
    ],
    analyzer: [
      'analyze file', 'phân tích file', 'đọc file', 'read file',
      'tổng hợp', 'summarize', 'tóm tắt tài liệu', 'phân tích tài liệu',
      'file này', 'file đính kèm', 'tài liệu này', 'nội dung file',
      'explain this code', 'giải thích đoạn code', 'hiểu code',
      'extract', 'trích xuất', 'pattern', 'quy luật',
      'parse', 'regex', 'data structure', 'cấu trúc dữ liệu',
      'schema', 'json structure', 'file format', 'định dạng',
      'upload', 'đính kèm', 'file đính kèm', 'attached',
    ],
  };

  const scores: Record<string, number> = {
    orchestrator: 0.3,
    coder: 0,
    researcher: 0,
    planner: 0,
    reviewer: 0,
    analyzer: 0,
  };

  for (const [role, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[role] += 0.15;
      }
    }
  }

  // Bonus: if message references "file" or "đính kèm", boost analyzer
  if (lower.includes('file') || lower.includes('đính kèm') || lower.includes('tài liệu') || lower.includes('upload')) {
    scores.analyzer += 0.1;
  }

  // Complex task detection for auto-chain
  // If multiple categories score high, it might need chaining
  const highScores = Object.entries(scores).filter(([role, s]) => s > 0.5 && role !== 'orchestrator');

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

/**
 * Check if a message requires multi-agent chaining
 */
function shouldChain(message: string, filesCount: number): { should: boolean; chain: Array<{ agent: AgentRole; purpose: string }> } {
  const lower = message.toLowerCase();
  const chain: Array<{ agent: AgentRole; purpose: string }> = [];

  // If files are attached, always include analyzer first
  if (filesCount > 0) {
    chain.push({ agent: 'analyzer', purpose: 'Phân tích nội dung file đính kèm' });
  }

  // Detect complex tasks that benefit from chaining
  const codingThenReview = (
    lower.includes('viết') && (lower.includes('code') || lower.includes('lập trình')) && 
    (lower.includes('review') || lower.includes('kiểm tra') || lower.includes('tối ưu') || lower.includes('đánh giá'))
  );

  const researchThenPlan = (
    (lower.includes('nghiên cứu') || lower.includes('phân tích') || lower.includes('tìm hiểu')) &&
    (lower.includes('kế hoạch') || lower.includes('chiến lược') || lower.includes('bước') || lower.includes('lộ trình'))
  );

  const codeThenReviewKeywords = [
    'viết code và review', 'code rồi kiểm tra', 'implement và review',
    'create and review', 'build and optimize', 'viết và tối ưu',
  ];

  for (const kw of codeThenReviewKeywords) {
    if (lower.includes(kw)) {
      chain.push({ agent: 'coder', purpose: 'Viết và triển khai code' });
      chain.push({ agent: 'reviewer', purpose: 'Review và đánh giá code' });
      return { should: true, chain };
    }
  }

  if (codingThenReview) {
    chain.push({ agent: 'coder', purpose: 'Viết và triển khai code' });
    chain.push({ agent: 'reviewer', purpose: 'Review và đánh giá' });
    return { should: true, chain };
  }

  if (researchThenPlan) {
    chain.push({ agent: 'researcher', purpose: 'Nghiên cứu và phân tích' });
    chain.push({ agent: 'planner', purpose: 'Lập kế hoạch hành động' });
    return { should: true, chain };
  }

  if (filesCount > 0) {
    // After analyzing files, determine if another agent is needed
    if (lower.includes('sửa') || lower.includes('fix') || lower.includes('viết lại') || lower.includes('refactor')) {
      chain.push({ agent: 'coder', purpose: 'Sửa và cải thiện dựa trên phân tích' });
      return { should: true, chain };
    }
    if (lower.includes('review') || lower.includes('đánh giá') || lower.includes('kiểm tra')) {
      chain.push({ agent: 'reviewer', purpose: 'Review và đánh giá' });
      return { should: true, chain };
    }
    // Just analyzer is enough
    return { should: chain.length > 0, chain };
  }

  return { should: false, chain: [] };
}

function buildMessages(
  systemPrompt: string,
  history: Message[],
  currentUserMessage: string,
  fileContext?: string
): OllamaMessage[] {
  const messages: OllamaMessage[] = [];

  let enhancedSystemPrompt = systemPrompt;

  // Add thinking/reasoning instruction for Gemma 4
  enhancedSystemPrompt += '\n\nQuy tắc suy luận (Gemma 4 Thinking Mode):\n';
  enhancedSystemPrompt += '- Trước khi trả lời, suy nghĩ từng bước (think step-by-step)\n';
  enhancedSystemPrompt += '- Phân tích vấn đề từ nhiều góc độ\n';
  enhancedSystemPrompt += '- Xem xét edge cases và alternatives\n';
  enhancedSystemPrompt += '- Đưa ra kết luận dựa trên reasoning';

  if (fileContext) {
    enhancedSystemPrompt += '\n\n--- NGỮ CẢNH TỪ FILE ĐÍNH KÈM ---\n' + fileContext + '\n--- KẾT THÚC NGỮ CẢNH FILE ---';
  }

  messages.push({ role: 'system', content: enhancedSystemPrompt });

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
 * Build context string from attached files
 */
function buildFileContext(files: Array<{ name: string; content: string }>): string {
  if (!files || files.length === 0) return '';

  const MAX_TOTAL_CHARS = 30000; // ~30k chars max for context
  let context = '';
  let totalChars = 0;

  for (const file of files) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      context += '\n\n... [Một số file đã bị cắt bớt do giới hạn độ dài]';
      break;
    }

    const fileHeader = `\n=== File: ${file.name} ===\n`;
    const remainingChars = MAX_TOTAL_CHARS - totalChars;
    const maxFileContent = remainingChars - fileHeader.length - 50;
    
    if (maxFileContent <= 0) break;

    let fileContent = file.content;
    if (fileContent.length > maxFileContent) {
      fileContent = fileContent.substring(0, maxFileContent) + '\n... [nội dung đã được cắt bớt]';
    }

    context += fileHeader + fileContent + '\n=== Kết thúc file ===\n';
    totalChars += fileHeader.length + fileContent.length + 20;
  }

  return context;
}

/**
 * Main orchestrator - processes through the multi-agent system
 * Enhanced with chain-of-thought and auto-chain mode
 */
export async function* processMessage(
  userMessage: string,
  conversationHistory: Message[],
  activeAgentOverride?: AgentRole,
  attachedFiles?: Array<{ name: string; content: string }>
): AsyncGenerator<StreamChunk> {
  const { role: selectedRole, confidence } = classifyIntent(userMessage);
  const activeRole = activeAgentOverride || selectedRole;
  const agent = AGENT_DEFINITIONS[activeRole];

  // Build file context if files are attached
  const fileContext = buildFileContext(attachedFiles || []);

  // Check if we should chain multiple agents
  const chainDecision = shouldChain(userMessage, attachedFiles?.length || 0);
  
  if (chainDecision.should && chainDecision.chain.length > 1 && !activeAgentOverride) {
    // Auto-chain mode: process through multiple agents
    yield* processAutoChain(userMessage, conversationHistory, chainDecision.chain, fileContext);
    return;
  }

  // If files are attached and no override, start with analyzer
  const effectiveRole = (!activeAgentOverride && chainDecision.should && chainDecision.chain.length === 1)
    ? chainDecision.chain[0].agent
    : activeRole;

  const effectiveAgent = AGENT_DEFINITIONS[effectiveRole];

  yield {
    type: 'agent_switch',
    agentId: effectiveAgent.id,
    agentName: effectiveAgent.name,
    agentColor: effectiveAgent.color,
    agentRole: effectiveAgent.role,
    content: `🤖 ${effectiveAgent.name} đang xử lý...`,
  };

  // Chain-of-thought: think step-by-step before generating
  if (effectiveRole !== 'orchestrator' || confidence < 0.7) {
    yield* generateChainOfThought(effectiveRole, userMessage, fileContext);
  }

  const systemPrompt = effectiveAgent.systemPrompt;
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage, fileContext);

  yield* generateResponse(effectiveAgent, messages);
}

/**
 * Auto-chain mode: process through multiple agents in sequence
 */
async function* processAutoChain(
  userMessage: string,
  conversationHistory: Message[],
  chain: Array<{ agent: AgentRole; purpose: string }>,
  fileContext: string
): AsyncGenerator<StreamChunk> {
  yield {
    type: 'chain_start',
    content: `🔗 Chế độ Auto-Chain: ${chain.length} agent sẽ xử lý tuần tự`,
    chainInfo: {
      step: 0,
      total: chain.length,
      agentName: '',
      purpose: 'Khởi tạo chuỗi xử lý',
    },
  };

  let previousOutput = '';

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    const stepAgent = AGENT_DEFINITIONS[step.agent];

    yield {
      type: 'chain_step',
      content: `🔗 Bước ${i + 1}/${chain.length}: ${stepAgent.icon} ${stepAgent.name} - ${step.purpose}`,
      chainInfo: {
        step: i + 1,
        total: chain.length,
        agentName: stepAgent.name,
        purpose: step.purpose,
      },
    };

    yield {
      type: 'agent_switch',
      agentId: stepAgent.id,
      agentName: stepAgent.name,
      agentColor: stepAgent.color,
      agentRole: stepAgent.role,
      content: `🤖 ${stepAgent.name} đang xử lý bước ${i + 1}/${chain.length}...`,
    };

    // Build context with previous output for chaining
    let chainContext = '';
    if (previousOutput) {
      chainContext = `\n\n--- KẾT QUẢ TỪ BƯỚC TRƯỚC (${AGENT_DEFINITIONS[chain[i - 1]?.agent]?.name || 'Agent'}) ---\n${previousOutput}\n--- KẾT THÚC KẾT QUẢ ---`;
    }

    const fullContext = fileContext + chainContext;
    const messages = buildMessages(stepAgent.systemPrompt, conversationHistory, userMessage, fullContext);

    // Generate response for this step
    const ollama = getOllamaClient();
    let fullContent = '';

    try {
      const stream = ollama.chatStream(messages);

      for await (const chunk of stream) {
        if (chunk.response) {
          fullContent += chunk.response;
          yield {
            type: 'token',
            content: chunk.response,
            agentId: stepAgent.id,
            agentName: stepAgent.name,
            agentColor: stepAgent.color,
            agentRole: stepAgent.role,
          };
        }
      }

      // Fallback if streaming returns empty
      if (fullContent.trim().length === 0) {
        const fallbackResponse = await ollama.chat(messages, {
          options: { temperature: 0.7, num_predict: 1024 },
        });
        fullContent = fallbackResponse.response || '';
        
        if (fullContent.trim().length > 0) {
          yield {
            type: 'token',
            content: fullContent,
            agentId: stepAgent.id,
            agentName: stepAgent.name,
            agentColor: stepAgent.color,
            agentRole: stepAgent.role,
          };
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: `Lỗi ở bước ${i + 1} (${stepAgent.name}): ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }

    // Store output for next agent in chain
    previousOutput = fullContent;
  }

  yield {
    type: 'done',
    content: '',
  };
}

/**
 * Generate chain-of-thought reasoning before the main response
 */
async function* generateChainOfThought(
  role: AgentRole,
  userMessage: string,
  fileContext: string
): AsyncGenerator<StreamChunk> {
  const orchestrator = AGENT_DEFINITIONS.orchestrator;

  const planMessages: OllamaMessage[] = [
    {
      role: 'system',
      content: `${orchestrator.systemPrompt}\n\nBạn đang hỗ trợ ${AGENT_DEFINITIONS[role].name}. 
Người dùng hỏi: "${userMessage}"
${fileContext ? `Có ${fileContext.split('===').length / 2} file đính kèm.` : ''}

Tạo execution plan ngắn gọn (2-3 câu) cho ${AGENT_DEFINITIONS[role].name}. 
Suy nghĩ step-by-step. Chỉ trả về plan, không trả lời câu hỏi.`,
    },
    { role: 'user', content: `Tạo execution plan cho ${AGENT_DEFINITIONS[role].name}` },
  ];

  try {
    const ollama = getOllamaClient();
    const planResponse = await ollama.chat(planMessages, {
      options: { temperature: 0.3, num_predict: 300 },
    });

    if (planResponse.response && planResponse.response.trim().length > 0) {
      yield {
        type: 'thinking',
        content: `💭 ${AGENT_DEFINITIONS[role].icon} ${AGENT_DEFINITIONS[role].name} suy nghĩ:\n${planResponse.response}`,
        agentId: orchestrator.id,
        agentName: orchestrator.name,
      };
    }
  } catch {
    // Skip thinking if it fails
  }
}

/**
 * Generate response from an agent
 */
async function* generateResponse(
  agent: typeof AGENT_DEFINITIONS[AgentRole],
  messages: OllamaMessage[]
): AsyncGenerator<StreamChunk> {
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
        error: 'Model không tạo được nội dung. Có thể do thiếu RAM. Thử reload trang hoặc đổi model nhỏ hơn (gemma4:2b).',
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

export { classifyIntent, buildMessages, buildFileContext };
