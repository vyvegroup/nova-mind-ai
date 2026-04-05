'use client';

// ============================================
// NovaMind AI - Main Chat Interface
// GPT-like mobile-first design
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Trash2, MessageSquare, Bot, ChevronLeft,
  Brain, Code, BookOpen, ListChecks, Search,
  Sparkles, Settings, Moon, Sun, Menu, X, Zap,
  Paperclip, Mic, Image as ImageIcon, MoreHorizontal
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { AGENT_DEFINITIONS, type AgentRole, type Message, type StreamChunk } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// =============================================
// Agent Icon Component
// =============================================
function AgentIcon({ role, size = 20, color }: { role: AgentRole; size?: number; color?: string }) {
  const agent = AGENT_DEFINITIONS[role];
  const iconMap: Record<AgentRole, React.ReactNode> = {
    orchestrator: <Brain size={size} />,
    coder: <Code size={size} />,
    researcher: <BookOpen size={size} />,
    planner: <ListChecks size={size} />,
    reviewer: <Search size={size} />,
  };
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color || agent.color}20`, color: color || agent.color }}
    >
      {iconMap[role]}
    </div>
  );
}

// =============================================
// Message Bubble Component
// =============================================
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">U</span>
          </div>
        ) : message.agentRole ? (
          <AgentIcon role={message.agentRole} size={18} color={message.agentColor} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%]' : 'max-w-[85%]'} min-w-0`}>
        {/* Agent name tag */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${message.agentColor}15`,
                color: message.agentColor,
              }}
            >
              {message.agentName}
            </span>
            {message.isStreaming && (
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        )}

        {/* Thinking section */}
        {message.thinking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-2 px-3 py-2 rounded-lg border text-xs text-muted-foreground bg-muted/30"
          >
            <div className="flex items-center gap-1.5 mb-1 text-amber-500">
              <Sparkles size={12} />
              <span className="font-medium">Thinking</span>
            </div>
            <div className="whitespace-pre-wrap">{message.thinking}</div>
          </motion.div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-md'
              : 'bg-card border border-border/50 rounded-tl-md text-foreground'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1 prose-pre:my-2 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
}

// =============================================
// Agent Selector Component
// =============================================
function AgentSelector({
  selected,
  onSelect,
}: {
  selected: AgentRole;
  onSelect: (role: AgentRole) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const agents = Object.values(AGENT_DEFINITIONS);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors text-sm"
      >
        <AgentIcon role={selected} size={14} />
        <span className="hidden sm:inline">{AGENT_DEFINITIONS[selected].name}</span>
        <ChevronLeft size={14} className={`transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-xl bg-card border border-border shadow-xl p-2"
            >
              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Chọn Agent</div>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { onSelect(agent.role); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    selected === agent.role ? 'bg-accent' : 'hover:bg-muted/50'
                  }`}
                >
                  <AgentIcon role={agent.role} size={18} color={agent.color} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{agent.icon} {agent.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================
// Sidebar Component
// =============================================
function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    deleteSession,
    clearSessions,
  } = useChatStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-background border-r border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">NovaMind AI</h2>
                  <p className="text-[10px] text-muted-foreground">Multi-Agent System</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={() => { createSession(); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:bg-muted/50 transition-colors text-sm"
              >
                <Plus size={16} />
                Cuộc trò chuyện mới
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 ${
                    session.id === activeSessionId ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => { setActiveSession(session.id); onClose(); }}
                >
                  <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
              <button
                onClick={clearSessions}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Trash2 size={14} />
                Xóa tất cả
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================
// Status Bar Component
// =============================================
function StatusBar() {
  const { modelStatus, modelMessage } = useChatStore();

  const statusConfig = {
    loading: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> },
    ready: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
    error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
  };

  const config = statusConfig[modelStatus];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${config.bg} ${config.color}`}>
      {config.icon}
      <span className="truncate">{modelMessage}</span>
    </div>
  );
}

// =============================================
// Main Chat Interface
// =============================================
export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [isDark, setIsDark] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    sidebarOpen,
    toggleSidebar,
    selectedAgent,
    setSelectedAgent,
    isGenerating,
    setIsGenerating,
    setModelStatus,
    activeSession,
    activeMessages,
    addUserMessage,
    addAssistantMessage,
    updateLastMessage,
    setLastMessageComplete,
    setLastMessageAgent,
    addThinkingToLastMessage,
    createSession,
  } = useChatStore();

  const session = activeSession();
  const messages = activeMessages();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check model health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status && data.available) {
          setModelStatus('ready', `Model: ${data.model} ✓`);
        } else if (data.status) {
          setModelStatus('loading', data.message || 'Đang tải model...');
          // Try pulling model
          try {
            const pullRes = await fetch('/api/chat');
            const pullData = await pullRes.json();
            if (pullData.available) {
              setModelStatus('ready', `Model: ${pullData.model} ✓`);
            } else {
              setModelStatus('error', pullData.message || 'Model chưa sẵn sàng');
            }
          } catch {
            setModelStatus('error', 'Không thể kết nối Ollama');
          }
        } else {
          setModelStatus('error', data.message || 'Ollama không khả dụng');
        }
      } catch {
        setModelStatus('loading', 'Đang khởi tạo...');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [setModelStatus]);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setInput('');
    addUserMessage(trimmed);
    addAssistantMessage('', selectedAgent, AGENT_DEFINITIONS[selectedAgent].name, AGENT_DEFINITIONS[selectedAgent].color, selectedAgent);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.filter((m) => m.id !== messages[messages.length - 1]?.id).slice(-20),
          agentOverride: selectedAgent,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const chunk: StreamChunk = JSON.parse(data);

            switch (chunk.type) {
              case 'agent_switch':
                if (chunk.agentId && chunk.agentName && chunk.agentColor && chunk.agentRole) {
                  setLastMessageAgent(chunk.agentId, chunk.agentName, chunk.agentColor, chunk.agentRole);
                }
                break;
              case 'thinking':
                if (chunk.content) addThinkingToLastMessage(chunk.content);
                break;
              case 'token':
                if (chunk.content) updateLastMessage(chunk.content);
                break;
              case 'error':
                updateLastMessage(`\n\n⚠️ ${chunk.error}`);
                break;
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (error) {
      updateLastMessage(`\n\n⚠️ Lỗi kết nối: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLastMessageComplete();
      setIsGenerating(false);
    }
  }, [input, isGenerating, messages, selectedAgent, addUserMessage, addAssistantMessage, setIsGenerating, updateLastMessage, setLastMessageComplete, setLastMessageAgent, addThinkingToLastMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-background/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-2">
          <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-sm leading-tight">NovaMind AI</h1>
              <p className="text-[10px] text-muted-foreground">Multi-Agent Live</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBar />
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => createSession()}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Session Title */}
      {session && (
        <div className="shrink-0 text-center py-1.5 px-4 bg-muted/20 border-b border-border/50">
          <p className="text-xs text-muted-foreground truncate">{session.title}</p>
        </div>
      )}

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60dvh] text-center px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                  <Zap size={36} className="text-white" />
                </div>
              </motion.div>
              <h2 className="text-xl font-bold mb-2">Xin chào! Tôi là NovaMind 👋</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                AI Multi-Agent với 5 chuyên gia: Nova, CodeX, Athena, Stratos và Critique.
                Hãy hỏi tôi bất cứ điều gì!
              </p>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  { text: 'Viết function sort array trong TypeScript', icon: <Code size={16} />, role: 'coder' as AgentRole },
                  { text: 'Phân tích xu hướng AI 2025', icon: <BookOpen size={16} />, role: 'researcher' as AgentRole },
                  { text: 'Lập kế hoạch học web development', icon: <ListChecks size={16} />, role: 'planner' as AgentRole },
                  { text: 'Giải thích machine learning đơn giản', icon: <Brain size={16} />, role: 'orchestrator' as AgentRole },
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    onClick={() => {
                      setInput(suggestion.text);
                      setSelectedAgent(suggestion.role);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left text-sm"
                  >
                    {suggestion.icon}
                    <span className="truncate">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-3 py-3">
          <div className="flex items-end gap-2">
            {/* Agent selector */}
            <div className="shrink-0">
              <AgentSelector selected={selectedAgent} onSelect={setSelectedAgent} />
            </div>

            {/* Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn... (Shift+Enter xuống dòng)"
                rows={1}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all min-h-[44px] max-h-[150px]"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className={`shrink-0 p-3 rounded-xl transition-all ${
                input.trim() && !isGenerating
                  ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          {/* Bottom info */}
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-[10px] text-muted-foreground">
              NovaMind AI • Multi-Agent Live • Gemma Local
            </p>
            <p className="text-[10px] text-muted-foreground">
              Powered by claw-code philosophy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
