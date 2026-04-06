'use client';

// ============================================
// NovaMind AI - Main Chat Interface
// Futuristic Glassmorphism Design
// WebGL Background • 6 Agents • Gemma 4
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Trash2, MessageSquare, Bot, ChevronLeft,
  Brain, Code, BookOpen, ListChecks, Search,
  Sparkles, Settings, Moon, Sun, Menu, X, Zap,
  Paperclip, Terminal as TerminalIcon, HardDrive,
  FileText, FileCode, FileJson, Eye, Minimize2, RefreshCw, Folder
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { AGENT_DEFINITIONS, type AgentRole, type Message, type StreamChunk, type AttachedFile } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WebGLBackground from './WebGLBackground';

// =============================================
// Utilities
// =============================================
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

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
    analyzer: <Eye size={size} />,
  };
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color || agent.color}20`, color: color || agent.color }}
    >
      {iconMap[role]}
    </div>
  );
}

// =============================================
// GlassHeader Component
// =============================================
function GlassHeader({
  onMenuClick,
  onTerminalToggle,
  onStorageToggle,
  onNewChat,
  isDark,
  onThemeToggle,
}: {
  onMenuClick: () => void;
  onTerminalToggle: () => void;
  onStorageToggle: () => void;
  onNewChat: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}) {
  const { modelStatus, modelMessage } = useChatStore();

  const statusConfig: Record<string, { color: string; bg: string; dotColor: string }> = {
    loading: { color: 'text-amber-400', bg: 'bg-amber-500/10', dotColor: 'bg-amber-400' },
    ready: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dotColor: 'bg-emerald-400' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', dotColor: 'bg-red-400' },
  };
  const cfg = statusConfig[modelStatus];

  return (
    <header className="shrink-0 backdrop-blur-2xl bg-white/[0.03] border-b border-white/[0.06] z-30">
      <div className="flex items-center justify-between px-3 py-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        {/* Left: hamburger + logo + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 backdrop-blur-sm"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
          >
            <Menu size={20} className="text-white/70" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="font-bold text-sm leading-tight gradient-text">NovaMind AI</h1>
              <p className="text-[10px] text-white/40 font-medium">Gemma 4</p>
            </div>
          </div>
        </div>

        {/* Center: status pill */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm border border-white/[0.06] ${cfg.bg} ${cfg.color}`}>
          <div className={`w-2 h-2 rounded-full ${cfg.dotColor} ${modelStatus === 'loading' ? 'pulse-dot' : ''}`} />
          <span className="truncate max-w-[180px]">{modelMessage}</span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onTerminalToggle}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            title="Terminal"
          >
            <TerminalIcon size={18} className="text-white/60" />
          </button>
          <button
            onClick={onStorageToggle}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 hidden sm:flex"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            title="Storage"
          >
            <HardDrive size={18} className="text-white/60" />
          </button>
          <button
            onClick={onNewChat}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            title="New Chat"
          >
            <Plus size={18} className="text-white/60" />
          </button>
          <button
            onClick={onThemeToggle}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 hidden sm:flex"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
          >
            {isDark ? <Sun size={18} className="text-white/60" /> : <Moon size={18} className="text-white/60" />}
          </button>
        </div>
      </div>
    </header>
  );
}

// =============================================
// MessageBubble Component
// =============================================
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/15">
            <span className="text-white text-xs font-bold">U</span>
          </div>
        ) : message.agentRole ? (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: `${message.agentColor || AGENT_DEFINITIONS[message.agentRole].color}25`,
              boxShadow: `0 4px 12px ${message.agentColor || AGENT_DEFINITIONS[message.agentRole].color}20`,
            }}
          >
            <AgentIcon role={message.agentRole} size={16} color={message.agentColor} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/15">
            <Bot size={16} className="text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%]' : 'max-w-[85%]'} min-w-0`}>
        {/* Agent name badge */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${message.agentColor}15`,
                color: message.agentColor,
                border: `1px solid ${message.agentColor}20`,
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
            className="mb-2 px-3 py-2.5 rounded-xl border border-white/[0.06] text-xs text-white/50 backdrop-blur-md bg-white/[0.02]"
          >
            <div className="flex items-center gap-1.5 mb-1.5 text-amber-400/80">
              <Sparkles size={11} />
              <span className="font-medium text-[11px]">Thinking</span>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{message.thinking}</div>
          </motion.div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors duration-200 ${
            isUser
              ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm shadow-lg shadow-violet-600/15'
              : 'bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-tl-sm text-white/90 message-glass'
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
                <span className="inline-block w-1.5 h-4 bg-violet-400/70 animate-pulse ml-0.5 rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Attached files chips */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.attachedFiles.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-white/60"
              >
                {getFileIcon(file.name)}
                <span className="truncate max-w-[120px]">{file.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-white/25 mt-1.5 px-1 font-medium">
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
// AgentSelector - Horizontal Pill Selector
// =============================================
function AgentSelector({
  selected,
  onSelect,
}: {
  selected: AgentRole;
  onSelect: (role: AgentRole) => void;
}) {
  const agents = Object.values(AGENT_DEFINITIONS);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ touchAction: 'pan-x' }}>
      {agents.map((agent) => {
        const isSelected = selected === agent.role;
        return (
          <motion.button
            key={agent.id}
            onClick={() => onSelect(agent.role)}
            whileTap={{ scale: 0.95 }}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
              isSelected
                ? 'text-white'
                : 'text-white/50 hover:text-white/70 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1]'
            }`}
            style={{
              touchAction: 'manipulation',
              minHeight: '36px',
              ...(isSelected && {
                backgroundColor: `${agent.color}18`,
                borderColor: `${agent.color}40`,
                boxShadow: `0 0 16px ${agent.color}15, inset 0 0 16px ${agent.color}08`,
                border: `1px solid ${agent.color}35`,
              }),
            }}
          >
            <AgentIcon role={agent.role} size={14} color={agent.color} />
            <span className="hidden sm:inline">{agent.icon} {agent.name}</span>
            <span className="sm:hidden">{agent.icon}</span>
            {isSelected && (
              <motion.div
                layoutId="agent-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: agent.color }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// =============================================
// Sidebar Component - Glass Slide-in
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
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 backdrop-blur-2xl bg-black/40 border-r border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white/90">NovaMind AI</h2>
                  <p className="text-[10px] text-white/40 font-medium">Multi-Agent • Gemma 4</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 text-white/60 hover:text-white/90"
                style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={() => { createSession(); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.1] hover:bg-white/[0.04] transition-all text-sm text-white/60 hover:text-white/80 active:scale-[0.98]"
                style={{ touchAction: 'manipulation', minHeight: '44px' }}
              >
                <Plus size={16} />
                Cuộc trò chuyện mới
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-2 panel-scroll">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5 active:scale-[0.98] ${
                    session.id === activeSessionId
                      ? 'bg-white/[0.06] border border-white/[0.08]'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                  onClick={() => { setActiveSession(session.id); onClose(); }}
                  style={{ touchAction: 'manipulation', minHeight: '44px' }}
                >
                  <MessageSquare size={14} className="text-white/30 shrink-0" />
                  <span className="text-sm truncate flex-1 text-white/70">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all"
                    style={{ minHeight: '28px', minWidth: '28px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.06]">
              <button
                onClick={clearSessions}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60 transition-all active:scale-[0.98]"
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
// TerminalPanel - Slide-up Terminal
// =============================================
function TerminalPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<Array<{ type: string; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim() || loading) return;
    const trimmed = cmd.trim();

    setHistory(prev => [...prev, { type: 'command', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();
      const output = data.output || data.result || JSON.stringify(data, null, 2);
      setHistory(prev => [...prev, { type: 'output', text: output }]);
    } catch (err) {
      setHistory(prev => [...prev, { type: 'error', text: `Error: ${err instanceof Error ? err.message : 'Unknown'}` }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(input);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed inset-x-0 bottom-0 z-40 flex flex-col backdrop-blur-2xl bg-black/50 border-t border-white/[0.08] rounded-t-3xl"
          style={{ height: 'min(50dvh, 480px)' }}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <TerminalIcon size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white/80">Terminal</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 text-white/50 hover:text-white/80"
              style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Terminal output */}
          <div className="flex-1 overflow-y-auto px-4 py-3 panel-scroll">
            {history.length === 0 && (
              <div className="flex items-center gap-2 text-white/25 text-xs terminal-text">
                <span className="text-emerald-400/60">&gt;</span>
                <span>Type a command to get started...</span>
              </div>
            )}
            {history.map((entry, i) => (
              <div key={i} className="mb-1.5 terminal-text">
                {entry.type === 'command' && (
                  <div className="text-emerald-400/80">
                    <span className="text-emerald-400 mr-2">&gt;</span>
                    <span>{entry.text}</span>
                  </div>
                )}
                {entry.type === 'output' && (
                  <pre className="text-white/70 whitespace-pre-wrap break-all">{entry.text}</pre>
                )}
                {entry.type === 'error' && (
                  <pre className="text-red-400/80 whitespace-pre-wrap break-all">{entry.text}</pre>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-white/40 text-xs terminal-text">
                <div className="w-3 h-3 border border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
                <span>Executing...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal input */}
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/[0.06] px-3 py-2.5">
              <span className="text-emerald-400/70 terminal-text shrink-0">&gt;</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-white/80 placeholder:text-white/20 terminal-text"
                style={{ touchAction: 'manipulation', fontSize: '13px' }}
              />
              <button
                onClick={() => executeCommand(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-30 transition-all active:scale-90"
                style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================
// StoragePanel - Slide-in File Browser
// =============================================
function StoragePanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [storageData, setStorageData] = useState<{ storage: Array<{ name: string; size: number; modified: string; isDir: boolean }>; systemInfo: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStorage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/terminal');
      const data = await res.json();
      setStorageData({
        storage: data.storage || data.files || [],
        systemInfo: data.systemInfo || data.info || '',
      });
    } catch {
      setStorageData({ storage: [], systemInfo: 'Unable to fetch storage info' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !storageData) {
      fetchStorage();
    }
  }, [isOpen, storageData, fetchStorage]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30 sm:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-80 backdrop-blur-2xl bg-black/40 border-l border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-violet-400" />
                <span className="text-sm font-medium text-white/80">Storage</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchStorage}
                  className="p-2 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 text-white/40 hover:text-white/70"
                  style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 text-white/40 hover:text-white/70"
                  style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* System info */}
            {storageData?.systemInfo && (
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-[11px] text-white/40 terminal-text leading-relaxed">{storageData.systemInfo}</p>
              </div>
            )}

            {/* File list */}
            <div className="flex-1 overflow-y-auto p-3 panel-scroll">
              {loading && !storageData && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              )}
              {storageData && storageData.storage.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-white/30">
                  <Folder size={32} className="mb-3 opacity-40" />
                  <p className="text-sm">No files found</p>
                </div>
              )}
              {storageData?.storage.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200 mb-0.5 group"
                  style={{ touchAction: 'manipulation', minHeight: '44px' }}
                >
                  <div className={`${file.isDir ? 'text-violet-400/70' : getFileColor(file.name)}`}>
                    {file.isDir ? <Folder size={16} /> : getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{file.name}</p>
                    <p className="text-[10px] text-white/30">
                      {file.isDir ? 'Directory' : formatSize(file.size)}
                      {file.modified && ` • ${file.modified}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================
// WelcomeScreen Component
// =============================================
function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string, role: AgentRole) => void }) {
  const suggestions: Array<{ text: string; icon: React.ReactNode; role: AgentRole }> = [
    { text: 'Viết function sort array trong TypeScript', icon: <Code size={16} />, role: 'coder' },
    { text: 'Phân tích xu hướng AI 2025', icon: <BookOpen size={16} />, role: 'researcher' },
    { text: 'Lập kế hoạch học web development', icon: <ListChecks size={16} />, role: 'planner' },
    { text: 'Giải thích machine learning đơn giản', icon: <Brain size={16} />, role: 'orchestrator' },
    { text: 'Review code best practices', icon: <Search size={16} />, role: 'reviewer' },
    { text: 'Phân tích cấu trúc dữ liệu JSON', icon: <Eye size={16} />, role: 'analyzer' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[65dvh] text-center px-4">
      {/* Logo with glow */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 blur-xl opacity-30 animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-2xl shadow-violet-500/25 float-animation">
          <Zap size={36} className="text-white" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold mb-2.5 gradient-text"
      >
        Xin chào! Tôi là NovaMind
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-sm text-white/45 max-w-md mb-8 leading-relaxed"
      >
        AI Multi-Agent với 6 chuyên gia thông minh: Nova, CodeX, Athena, Stratos, Critique và Lens. Sẵn sàng hỗ trợ bạn.
      </motion.p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSuggestionClick(s.text, s.role)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 text-left text-sm text-white/60 hover:text-white/80 group"
            style={{ touchAction: 'manipulation', minHeight: '48px' }}
          >
            <span className="text-white/40 group-hover:text-white/60 transition-colors">{s.icon}</span>
            <span className="truncate">{s.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// =============================================
// FileChip Component
// =============================================
function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-xs text-white/60 group"
    >
      <span className={getFileColor(file.name)}>{getFileIcon(file.name)}</span>
      <span className="truncate max-w-[100px] sm:max-w-[150px] text-white/70">{file.name}</span>
      <span className="text-white/30">({(file.size / 1024).toFixed(1)}KB)</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all active:scale-90"
        style={{ touchAction: 'manipulation', minHeight: '24px', minWidth: '24px' }}
      >
        <X size={11} />
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
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFile]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || isGenerating) return;

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

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSuggestionClick = useCallback((text: string, role: AgentRole) => {
    setInput(text);
    setSelectedAgent(role);
    inputRef.current?.focus();
  }, [setSelectedAgent]);

  return (
    <>
      {/* WebGL Background */}
      <WebGLBackground />

      {/* Main layout */}
      <div className="relative z-10 h-[100dvh] flex flex-col bg-transparent">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".ts,.tsx,.js,.jsx,.py,.json,.md,.txt,.csv,.yaml,.yml,.html,.css,.sql,.sh,.env,.gitignore,.prisma,.toml,.xml,.svg,.log,.rs,.go,.java,.c,.cpp,.rb,.php,.swift,.kt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Glass Header */}
        <GlassHeader
          onMenuClick={toggleSidebar}
          onTerminalToggle={() => setTerminalOpen(!terminalOpen)}
          onStorageToggle={() => setStorageOpen(!storageOpen)}
          onNewChat={() => createSession()}
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
        />

        {/* Chat Messages Area */}
        <main
          className="flex-1 overflow-y-auto min-h-0"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-3xl mx-auto px-3 py-4 space-y-5">
            {messages.length === 0 ? (
              <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Glass Input Area */}
        <div
          className="shrink-0 mx-3 mb-3 rounded-2xl backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] shadow-2xl shadow-black/20"
          style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
        >
          <div className="p-3">
            {/* Agent Selector */}
            <div className="mb-2.5">
              <AgentSelector selected={selectedAgent} onSelect={setSelectedAgent} />
            </div>

            {/* Attached file chips */}
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-90"
                    style={{ touchAction: 'manipulation', minHeight: '28px' }}
                  >
                    <Trash2 size={11} />
                    Xóa tất cả
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row */}
            <div className="flex items-end gap-2">
              {/* Attach button */}
              <button
                onClick={handleAttachClick}
                className="shrink-0 p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-90 text-white/35 hover:text-white/60"
                style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
                title="Đính kèm file"
              >
                <Paperclip size={18} />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn... (Shift+Enter xuống dòng)"
                rows={1}
                className="flex-1 resize-none rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 pr-4 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.06] focus:border-violet-500/30 transition-all duration-200 min-h-[44px] max-h-[150px] glass-input"
                style={{ touchAction: 'manipulation' }}
              />

              {/* Send button */}
              <motion.button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isGenerating}
                whileTap={{ scale: 0.92 }}
                className={`shrink-0 p-3 rounded-xl transition-all duration-300 ${
                  (input.trim() || attachedFiles.length > 0) && !isGenerating
                    ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white/[0.04] text-white/20'
                }`}
                style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </motion.button>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-center mt-2 px-1">
              <p className="text-[10px] text-white/20 font-medium tracking-wide">
                NovaMind AI • 6 Agents • Gemma 4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Terminal Panel */}
      <TerminalPanel isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />

      {/* Storage Panel */}
      <StoragePanel isOpen={storageOpen} onClose={() => setStorageOpen(false)} />
    </>
  );
}
