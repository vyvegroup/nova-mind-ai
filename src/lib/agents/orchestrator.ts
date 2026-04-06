// ============================================
// VenAI - Multi-Agent Live Orchestrator
// TRUE AGENT LOOP: Think → Act → Observe → Think
// Iterative tool use with tool results fed back
// Powered by Gemma 4
// ============================================

import { AGENT_DEFINITIONS, type AgentRole, type Message, type OllamaMessage, type StreamChunk } from '../types';
import { getOllamaClient } from '../ollama';

// =============================================
// Intent Classification (unchanged)
// =============================================
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
      'tạo file', 'chạy lệnh', 'thực thi', 'run', 'execute', 'create file',
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
      'lộ trình', 'roadmap', 'giai đoạn',
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

  if (lower.includes('file') || lower.includes('đính kèm') || lower.includes('tài liệu') || lower.includes('upload')) {
    scores.analyzer += 0.1;
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

// =============================================
// Message Building
// =============================================
function buildMessages(
  systemPrompt: string,
  history: Message[],
  currentUserMessage: string,
  fileContext?: string,
  toolContext?: string,
  extraMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
): OllamaMessage[] {
  const messages: OllamaMessage[] = [];

  let enhancedSystemPrompt = systemPrompt;

  enhancedSystemPrompt += '\n\nQuy tắc suy luận (Gemma 4 Thinking Mode):\n';
  enhancedSystemPrompt += '- Trước khi trả lời, suy nghĩ từng bước (think step-by-step)\n';
  enhancedSystemPrompt += '- Phân tích vấn đề từ nhiều góc độ\n';
  enhancedSystemPrompt += '- Xem xét edge cases và alternatives\n';
  enhancedSystemPrompt += '- Đưa ra kết luận dựa trên reasoning';

  if (fileContext) {
    enhancedSystemPrompt += '\n\n--- NGỮ CẢNH TỪ FILE ĐÍNH KÈM ---\n' + fileContext + '\n--- KẾT THÚC NGỮ CẢNH FILE ---';
  }

  if (toolContext) {
    enhancedSystemPrompt += '\n\n' + toolContext;
  }

  messages.push({ role: 'system', content: enhancedSystemPrompt });

  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add any extra context messages (e.g., previous tool results)
  if (extraMessages) {
    for (const msg of extraMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: currentUserMessage });
  return messages;
}

function buildFileContext(files: Array<{ name: string; content: string }>): string {
  if (!files || files.length === 0) return '';

  const MAX_TOTAL_CHARS = 30000;
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

// =============================================
// Sandbox Tool Execution
// =============================================
async function executeSandboxTool(
  sessionId: string,
  action: string,
  args: Record<string, unknown>
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/sandbox/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    return `Error: ${errorData.error || response.statusText}`;
  }

  const data = await response.json();
  if (action === 'exec') return data.output || '(no output)';
  if (action === 'read') return data.content || '';
  if (action === 'write') return `File written: ${data.path}`;
  if (action === 'edit') return `${data.changesApplied} edit(s) applied`;
  if (action === 'delete') return 'Deleted successfully';
  if (action === 'mkdir') return 'Directory created';
  if (action === 'list') return JSON.stringify(data.files || data, null, 2);
  return JSON.stringify(data);
}

/**
 * Detect tool patterns from the agent's response
 */
function detectToolPatterns(fullResponse: string): Array<{
  toolName: string;
  args: Record<string, unknown>;
  id: string;
}> {
  const tools: Array<{ toolName: string; args: Record<string, unknown>; id: string }> = [];
  let toolIndex = 0;

  // Pattern 1: ```file:path/to/file.ts\ncontent\n```
  const fileBlockRegex = /```file:(.+?)\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockRegex.exec(fullResponse)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
    if (filePath && content) {
      tools.push({
        id: `tool-${Date.now()}-${toolIndex++}`,
        toolName: 'write_file',
        args: { path: filePath, content },
      });
    }
  }

  // Pattern 2: ```terminal\ncommand\n``` or ```bash\ncommand\n```
  const terminalBlockRegex = /```(?:terminal|bash)\n([\s\S]*?)```/g;
  while ((match = terminalBlockRegex.exec(fullResponse)) !== null) {
    const command = match[1].trim();
    if (command && command.length > 0) {
      tools.push({
        id: `tool-${Date.now()}-${toolIndex++}`,
        toolName: 'exec_command',
        args: { command },
      });
    }
  }

  return tools;
}

/**
 * Remove tool code blocks from response for clean display
 */
function cleanToolBlocksFromResponse(fullResponse: string): string {
  let cleaned = fullResponse;
  // Remove ```file:path\n...\n``` blocks
  cleaned = cleaned.replace(/```file:.+?\n[\s\S]*?```/g, '');
  // Remove ```terminal\n...\n``` and ```bash\n...\n``` blocks
  cleaned = cleaned.replace(/```(?:terminal|bash)\n[\s\S]*?```/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

// =============================================
// Core: Generate LLM response (streaming)
// =============================================
async function* generateResponse(
  agent: typeof AGENT_DEFINITIONS[AgentRole],
  messages: OllamaMessage[],
  maxTokens?: number
): AsyncGenerator<StreamChunk> {
  try {
    const ollama = getOllamaClient();
    const stream = ollama.chatStream(messages);

    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.response) {
        fullContent += chunk.response;
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

    // Non-streaming fallback
    if (fullContent.trim().length === 0) {
      const fallbackResponse = await ollama.chat(messages, {
        options: { temperature: 0.7, num_predict: maxTokens || 2048 },
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

    yield {
      type: 'done',
      content: fullContent,
      agentId: agent.id,
      agentName: agent.name,
    };
  } catch (error) {
    yield {
      type: 'error',
      error: `Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// =============================================
// ★ MAIN ENTRY: processMessage (simple, no tools)
// =============================================
export async function* processMessage(
  userMessage: string,
  conversationHistory: Message[],
  activeAgentOverride?: AgentRole,
  attachedFiles?: Array<{ name: string; content: string }>,
  toolContext?: string
): AsyncGenerator<StreamChunk> {
  const { role: selectedRole, confidence } = classifyIntent(userMessage);
  const activeRole = activeAgentOverride || selectedRole;
  const agent = AGENT_DEFINITIONS[activeRole];
  const fileContext = buildFileContext(attachedFiles || []);

  yield {
    type: 'agent_switch',
    agentId: agent.id,
    agentName: agent.name,
    agentColor: agent.color,
    agentRole: agent.role,
    content: `🤖 ${agent.name} đang xử lý...`,
  };

  const systemPrompt = agent.systemPrompt;
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage, fileContext, toolContext);

  yield* generateResponse(agent, messages);
}

// =============================================
// ★★★ TRUE AGENT LOOP (LIVE) ★★★
// Think → Act (tools) → Observe (results) → Think → Respond
// Iterative with max 5 loops, feeds tool results back to LLM
// =============================================
export async function* processMessageWithTools(
  userMessage: string,
  conversationHistory: Message[],
  activeAgentOverride?: AgentRole,
  attachedFiles?: Array<{ name: string; content: string }>,
  sessionId?: string,
): AsyncGenerator<StreamChunk> {
  const MAX_AGENT_LOOPS = 5; // Max iterations of think-act-observe

  const { role: selectedRole } = classifyIntent(userMessage);
  const activeRole = activeAgentOverride || selectedRole;
  const agent = AGENT_DEFINITIONS[activeRole];
  const fileContext = buildFileContext(attachedFiles || []);

  // Tool awareness context injected into system prompt
  const toolContext = sessionId
    ? `\n📌 LIVE AGENT MODE - Bạn là agent LIVE với quyền thực thi trực tiếp:\n` +
      `Session ID: ${sessionId.substring(0, 8)}. Mỗi session có workspace sandbox riêng.\n\n` +
      `🛠️ TOOLS THỰC THI TRỰC TIẾP (TỰ ĐỘNG executed):\n` +
      `1. TẠO FILE → Viết code block: \`\`\`file:tên_file.ts\n// code ở đây\n\`\`\`\n` +
      `2. CHẠY LỆNH TERMINAL → Viết: \`\`\`terminal\nlệnh ở đây\n\`\`\`\n` +
      `3. ĐỌC FILE → Viết: \`\`\`terminal\ncat đường_dẫn_file\n\`\`\`\n\n` +
      `⚠️ QUAN TRỌNG - HÀNH ĐỘNG THỰC TẾ:\n` +
      `- Khi bạn viết \`\`\`file:...\`\`\` hoặc \`\`\`terminal\`\`\`, nó SẼ ĐƯỢC THỰC THI NGAY!\n` +
      `- Sau khi thực thi, bạn sẽ NHẬN KẾT QUẢ và có thể tiếp tục hành động.\n` +
      `- Đừng chỉ mô tả - hãy THỰC THI rồi báo cáo kết quả!\n` +
      `- Nếu lệnh thất bại, thử cách khác. Đừng bỏ cuộc.\n` +
      `- Giới hạn: tối đa ${MAX_AGENT_LOOPS} vòng lặp hành động.`
    : '';

  // Switch to agent
  yield {
    type: 'agent_switch',
    agentId: agent.id,
    agentName: agent.name,
    agentColor: agent.color,
    agentRole: agent.role,
    content: `🤖 ${agent.name} (Live Agent) đang xử lý...`,
  };

  // ========== AGENT LOOP ==========
  const loopHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let finalResponse = '';
  let allToolResults: string[] = [];
  let loopCount = 0;

  for (loopCount = 0; loopCount < MAX_AGENT_LOOPS; loopCount++) {
    // Build the prompt for this loop iteration
    let loopContext = '';

    if (loopCount === 0) {
      // First loop: just the user message with file context
      loopContext = '';
    } else {
      // Subsequent loops: include previous tool results
      loopContext = `\n\n--- KẾT QUẢ HÀNH ĐỘNG (Vòng ${loopCount}) ---\n`;
      loopContext += `Bạn vừa thực hiện các hành động. Đây là kết quả:\n\n`;

      if (allToolResults.length > 0) {
        allToolResults.forEach((result, i) => {
          loopContext += `[Tool ${i + 1} Result]:\n${result}\n\n`;
        });
      }

      loopContext += `--- KẾT THÚC KẾT QUẢ ---\n\n`;
      loopContext += `QUAN TRỌNG:\n`;
      loopContext += `- Nếu kết quả cho thấy thành công → Hãy tổng hợp và trả lời người dùng.\n`;
      loopContext += `- Nếu kết quả cho thấy lỗi → Thử cách khác (sửa lệnh, đổi path, v.v.).\n`;
      loopContext += `- Nếu cần thêm hành động → Tiếp tục dùng \`\`\`file:...\`\`\` hoặc \`\`\`terminal\`\`\`.\n`;
      loopContext += `- Nếu đã hoàn thành → Trả lời người dùng bằng ngôn ngữ họ dùng.\n`;
      loopContext += `- KHÔNG viết lại tool call cũ đã thực thi.\n`;
    }

    // Build messages for this loop
    const messages = buildMessages(
      agent.systemPrompt,
      conversationHistory,
      userMessage,
      fileContext,
      toolContext + loopContext,
      loopHistory.length > 0 ? loopHistory : undefined
    );

    // Generate response (streaming)
    let loopResponse = '';
    for await (const chunk of generateResponse(agent, messages)) {
      yield chunk;
      if (chunk.type === 'token' && chunk.content) {
        loopResponse += chunk.content;
      }
      if (chunk.type === 'done' && chunk.content) {
        loopResponse = chunk.content;
      }
    }

    // If no sessionId, just return (no tool execution possible)
    if (!sessionId) {
      finalResponse = loopResponse;
      break;
    }

    // Detect tools in this loop's response
    const detectedTools = detectToolPatterns(loopResponse);

    if (detectedTools.length === 0) {
      // No tools detected - this is the final response
      finalResponse = loopResponse;
      break;
    }

    // === TOOLS DETECTED - EXECUTE THEM ===
    const loopLabel = loopCount === 0 ? 'Agent phát hiện' : `Vòng ${loopCount + 1} - Agent tiếp tục`;
    yield {
      type: 'thinking',
      content: `🔧 ${loopLabel} ${detectedTools.length} hành động, đang thực thi...`,
    };

    allToolResults = [];

    for (const tool of detectedTools) {
      // Yield tool_call event
      yield {
        type: 'tool_call',
        content: `${tool.toolName}: ${JSON.stringify(tool.args).substring(0, 100)}`,
        toolCall: {
          id: tool.id,
          name: tool.toolName,
          arguments: tool.args,
        },
      };

      try {
        let action: string;
        let args: Record<string, unknown>;

        switch (tool.toolName) {
          case 'write_file':
            action = 'write';
            args = { path: tool.args.path, content: tool.args.content };
            break;
          case 'exec_command':
            action = 'exec';
            args = { command: tool.args.command };
            break;
          default:
            action = 'exec';
            args = { command: tool.args.command || '' };
        }

        const result = await executeSandboxTool(sessionId, action, args);
        allToolResults.push(result);

        // Yield tool_result event
        yield {
          type: 'tool_result',
          content: result.substring(0, 500),
          toolCall: {
            id: tool.id,
            name: tool.toolName,
            arguments: tool.args,
            result: result.substring(0, 2000),
          },
        };
      } catch (error) {
        const errorMsg = `Tool error: ${error instanceof Error ? error.message : 'Unknown'}`;
        allToolResults.push(errorMsg);
        yield {
          type: 'tool_result',
          content: errorMsg,
          toolCall: {
            id: tool.id,
            name: tool.toolName,
            arguments: tool.args,
            result: errorMsg,
          },
        };
      }
    }

    // Store this loop's response + tool results for the next iteration context
    loopHistory.push({ role: 'assistant', content: loopResponse });
    loopHistory.push({
      role: 'user',
      content: `Kết quả thực thi:\n${allToolResults.map((r, i) => `[Tool ${i + 1}]: ${r.substring(0, 1000)}`).join('\n\n')}\n\nHãy xem xét kết quả và tiếp tục hoặc trả lời.`
    });

    finalResponse = loopResponse;
  }

  // If we hit max loops, indicate that
  if (loopCount >= MAX_AGENT_LOOPS && sessionId) {
    yield {
      type: 'thinking',
      content: `⚠️ Đạt giới hạn ${MAX_AGENT_LOOPS} vòng hành động. Đang tổng hợp kết quả cuối...`,
    };
  }

  // Yield final done with cleaned response (without tool code blocks)
  const cleanedFinal = cleanToolBlocksFromResponse(finalResponse);
  yield {
    type: 'done',
    content: cleanedFinal || finalResponse,
  };
}

// =============================================
// Auto-Chain Mode (for multi-agent tasks)
// =============================================
async function* processAutoChain(
  userMessage: string,
  conversationHistory: Message[],
  chain: Array<{ agent: AgentRole; purpose: string }>,
  fileContext: string,
  sessionId?: string
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

    let chainContext = '';
    if (previousOutput) {
      chainContext = `\n\n--- KẾT QUẢ TỪ BƯỚC TRƯỚC (${AGENT_DEFINITIONS[chain[i - 1]?.agent]?.name || 'Agent'}) ---\n${previousOutput}\n--- KẾT THÚC KẾT QUẢ ---`;
    }

    const fullContext = fileContext + chainContext;
    const messages = buildMessages(stepAgent.systemPrompt, conversationHistory, userMessage, fullContext);

    let fullContent = '';

    try {
      const ollama = getOllamaClient();
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

    previousOutput = fullContent;
  }

  yield {
    type: 'done',
    content: '',
  };
}

export { classifyIntent, buildMessages, buildFileContext };
