'use client';

// ============================================
// NovaMind AI - Main Chat Interface
// Enhanced with file attachments, Lens agent,
// Android optimizations, Gemma 4 support
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Trash2, MessageSquare, Bot, ChevronLeft,
  Brain, Code, BookOpen, ListChecks, Search,
  Sparkles, Settings, Moon, Sun, Menu, X, Zap,
  Paperclip, Mic, Image as ImageIcon, MoreHorizontal,
  FileText, FileCode, FileJson, Eye, Link2
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { AGENT_DEFINITIONS, type AgentRole, type Message, type StreamChunk, type AttachedFile } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// =============================================
// Utility: Generate file ID
// =============================================
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// =============================================
// Utility: Get file icon based on extension
// =============================================
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, React.ReactNode> = {
    ts: <FileCode size={14} />, tsx: <FileCode size={14} />,
    js: <FileCode size={14} />, jsx: <FileCode size={14} />,
    py: <FileCode size={14} />, json: <FileJson size={14} />,
    md: <FileText size={14} />, txt: <FileText size={14} />,
    css: <FileCode size={14} />, html: <FileCode size={14} />,
    sql: <FileCode size={14} />, sh: <FileCode size={14} />,
    yaml: <FileText size={14} />, yml: <FileText size={14} />,
    csv: <FileText size={14} />, prisma: <FileCode size={14} />,
  };
  return iconMap[ext] || <FileText size={14} />;
}

function getFileColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const colorMap: Record<string, string> = {
    ts: 'text-blue-400', tsx: 'text-blue-400',
    js: 'text-yellow-400', jsx: 'text-yellow-400',
    py: 'text-green-400', json: 'text-emerald-400',
    md: 'text-purple-400', txt: 'text-gray-400',
    css: 'text-pink-400', html: 'text-orange-400',
    sql: 'text-cyan-400', sh: 'text-red-400',
  };
  return colorMap[ext] || 'text-gray-400';
}

// =============================================
// Agent Icon Component (with Lens support)
// =============================================
function AgentIcon({ role, size = 20, color }: { role: AgentRole; size?: number; color?: string }) {
  const agent = AGENT_DEFINITIONS[role];
  const iconMap: Record<AgentRole, React.ReactNode> = {
    orchestrator: <Brain size={size} />,
    coder: <Code size={size} />,
    researcher: <BookOpen size={size} />,
    planner: <ListChecks size={size} />,
    reviewer: <Search size={size} />,
    analyzer: <Eye size={size} />,
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
      style={{ touchAction: 'manipulation' }}
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

        {/* Attached files chips */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {message.attachedFiles.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-muted/50 border border-border/30 text-muted-foreground"
              >
                {getFileIcon(file.name)}
                <span className="truncate max-w-[120px]">{file.name}</span>
              </span>
            ))}
          </div>
        )}

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
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors text-sm active:scale-95"
        style={{ touchAction: 'manipulation', minHeight: '44px' }}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left active:scale-[0.98] ${
                    selected === agent.role ? 'bg-accent' : 'hover:bg-muted/50'
                  }`}
                  style={{ touchAction: 'manipulation', minHeight: '44px' }}
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
                  <p className="text-[10px] text-muted-foreground">Multi-Agent • Gemma 4</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted active:scale-95" style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}>
                <X size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={() => { createSession(); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:bg-muted/50 transition-colors text-sm active:scale-[0.98]"
                style={{ touchAction: 'manipulation', minHeight: '44px' }}
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
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 active:scale-[0.98] ${
                    session.id === activeSessionId ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => { setActiveSession(session.id); onClose(); }}
                  style={{ touchAction: 'manipulation', minHeight: '44px' }}
                >
                  <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-destructive transition-all"
                    style={{ minHeight: '32px', minWidth: '32px' }}
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
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors active:scale-[0.98]"
                style={{ touchAction: 'manipulation', minHeight: '44px' }}
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
      <span className="truncate max-w-[120px] sm:max-w-none">{modelMessage}</span>
    </div>
  );
}

// =============================================
// File Chip Component (for attached files above input)
// =============================================
function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border border-border/50 text-xs group"
    >
      <span className={getFileColor(file.name)}>{getFileIcon(file.name)}</span>
      <span className="truncate max-w-[100px] sm:max-w-[150px] text-foreground">{file.name}</span>
      <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)}KB)</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors active:scale-90"
        style={{ touchAction: 'manipulation', minHeight: '24px', minWidth: '24px' }}
      >
        <X size={12} />
      </button>
    </motion.div>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    attachedFiles,
    addFile,
    removeFile,
    clearFiles,
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
          setModelStatus('ready', `Gemma 4: ${data.model} ✓`);
        } else if (data.status) {
          setModelStatus('loading', data.message || 'Đang tải model...');
          try {
            const pullRes = await fetch('/api/chat');
            const pullData = await pullRes.json();
            if (pullData.available) {
              setModelStatus('ready', `Gemma 4: ${pullData.model} ✓`);
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

  // Prevent keyboard from covering input on Android
  useEffect(() => {
    if (typeof window !== 'undefined' && 'visualViewport' in window) {
      const viewport = window.visualViewport as VisualViewport;
      const handleResize = () => {
        document.documentElement.style.setProperty('--vh', `${viewport.height * 0.01}px`);
      };
      viewport.addEventListener('resize', handleResize);
      handleResize();
      return () => viewport.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Check size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" quá lớn. Tối đa 5MB mỗi file.`);
        continue;
      }

      try {
        const content = await file.text();
        addFile({
          id: generateFileId(),
          name: file.name,
          content,
          size: file.size,
          type: file.type || 'text/plain',
        });
      } catch {
        alert(`Không thể đọc file "${file.name}". Chỉ hỗ trợ file text.`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFile]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || isGenerating) return;

    // Prepare files for the message
    const messageFiles = attachedFiles.length > 0 ? [...attachedFiles] : undefined;

    setInput('');
    addUserMessage(trimmed || `(Đính kèm ${attachedFiles.length} file)`, messageFiles);
    addAssistantMessage('', selectedAgent, AGENT_DEFINITIONS[selectedAgent].name, AGENT_DEFINITIONS[selectedAgent].color, selectedAgent);
    setIsGenerating(true);
    clearFiles();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed || 'Phân tích các file đính kèm',
          history: messages.filter((m) => m.id !== messages[messages.length - 1]?.id).slice(-20),
          agentOverride: selectedAgent,
          files: messageFiles?.map((f) => ({ name: f.name, content: f.content })),
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
              case 'chain_start':
              case 'chain_step':
                if (chunk.content) addThinkingToLastMessage(chunk.content);
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
  }, [input, isGenerating, messages, selectedAgent, attachedFiles, addUserMessage, addAssistantMessage, setIsGenerating, updateLastMessage, setLastMessageComplete, setLastMessageAgent, addThinkingToLastMessage, clearFiles]);

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

  // Focus input when clicking attach button
  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".ts,.tsx,.js,.jsx,.py,.json,.md,.txt,.csv,.yaml,.yml,.html,.css,.sql,.sh,.env,.gitignore,.prisma,.toml,.xml,.svg,.log,.rs,.go,.java,.c,.cpp,.rb,.php,.swift,.kt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-background/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-sm leading-tight">NovaMind AI</h1>
              <p className="text-[10px] text-muted-foreground">Multi-Agent • Gemma 4</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBar />
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95 hidden sm:flex"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => createSession()}
            className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
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
      <main
        className="flex-1 overflow-y-auto"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      >
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
                AI Multi-Agent với 6 chuyên gia: Nova, CodeX, Athena, Stratos, Critique và Lens.
                Chạy Gemma 4 locally. Hãy hỏi tôi bất cứ điều gì!
              </p>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  { text: 'Viết function sort array trong TypeScript', icon: <Code size={16} />, role: 'coder' as AgentRole },
                  { text: 'Phân tích xu hướng AI 2025', icon: <BookOpen size={16} />, role: 'researcher' as AgentRole },
                  { text: 'Lập kế hoạch học web development', icon: <ListChecks size={16} />, role: 'planner' as AgentRole },
                  { text: 'Giải thích machine learning đơn giản', icon: <Brain size={16} />, role: 'orchestrator' as AgentRole },
                  { text: 'Review code best practices', icon: <Search size={16} />, role: 'reviewer' as AgentRole },
                  { text: 'Đính kèm file để phân tích', icon: <Paperclip size={16} />, role: 'analyzer' as AgentRole },
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    onClick={() => {
                      if (suggestion.role !== 'analyzer') {
                        setInput(suggestion.text);
                      } else {
                        handleAttachClick();
                      }
                      setSelectedAgent(suggestion.role);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left text-sm active:scale-[0.97]"
                    style={{ touchAction: 'manipulation', minHeight: '44px' }}
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
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto px-3 py-3">
          {/* Attached files chips */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 mb-2"
              >
                {attachedFiles.map((file) => (
                  <FileChip
                    key={file.id}
                    file={file}
                    onRemove={() => removeFile(file.id)}
                  />
                ))}
                <button
                  onClick={clearFiles}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-90"
                  style={{ touchAction: 'manipulation', minHeight: '32px' }}
                >
                  <Trash2 size={12} />
                  Xóa tất cả
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
                style={{ touchAction: 'manipulation' }}
              />
              {/* Attach button inside input */}
              <button
                onClick={handleAttachClick}
                className="absolute right-3 bottom-2.5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-90"
                style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}
                title="Đính kèm file"
              >
                <Paperclip size={16} />
              </button>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || isGenerating}
              className={`shrink-0 p-3 rounded-xl transition-all active:scale-90 ${
                (input.trim() || attachedFiles.length > 0) && !isGenerating
                  ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
                  : 'bg-muted text-muted-foreground'
              }`}
              style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
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
              NovaMind AI • 6 Agents • Gemma 4 Local
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
