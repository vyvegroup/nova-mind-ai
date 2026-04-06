'use client';

// ============================================
// VenAI - Main Chat Interface
// Futuristic Glassmorphism Design
// WebGL Background • 6 Agents • Gemma 4
// Per-Chat Sandbox • File Drag & Drop
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Trash2, MessageSquare, Bot, ChevronLeft,
  Brain, Code, BookOpen, ListChecks, Search,
  Sparkles, Settings, Moon, Sun, Menu, X, Zap,
  Paperclip, Terminal as TerminalIcon, HardDrive,
  FileText, FileCode, FileJson, Eye, Minimize2, RefreshCw, Folder,
  Upload, Download, Save, Wrench, Copy, Check, PanelRight,
  FilePlus, ArrowUpCircle, Info, Cpu, Database
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

function getFileIcon(filename: string, size = 14) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, React.ReactNode> = {
    ts: <FileCode size={size} />, tsx: <FileCode size={size} />,
    js: <FileCode size={size} />, jsx: <FileCode size={size} />,
    py: <FileCode size={size} />, json: <FileJson size={size} />,
    md: <FileText size={size} />, txt: <FileText size={size} />,
    css: <FileCode size={size} />, html: <FileCode size={size} />,
    sql: <FileCode size={size} />, sh: <FileCode size={size} />,
    yaml: <FileText size={size} />, yml: <FileText size={size} />,
    csv: <FileText size={size} />, prisma: <FileCode size={size} />,
  };
  return iconMap[ext] || <FileText size={size} />;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================
// CodeBlock with Copy Button
// =============================================
function CodeBlock({ children, className, filename }: { children: React.ReactNode; className?: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const isMultiLine = typeof children === 'string' && children.includes('\n');

  const handleCopy = async () => {
    const text = typeof children === 'string' ? children : String(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!isMultiLine && !filename) {
    return (
      <code className={`${className || ''} bg-white/[0.06] px-1.5 py-0.5 rounded-md text-[13px]`}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-2 rounded-xl overflow-hidden border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-[11px] text-white/40 font-medium">
          {filename || (className?.replace('language-', '') || 'code')}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
          style={{ touchAction: 'manipulation', minHeight: '28px' }}
        >
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      {/* Content */}
      <pre className="p-3 overflow-x-auto bg-black/30 text-[13px] leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
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
  onWorkspaceToggle,
  onNewChat,
  isDark,
  onThemeToggle,
}: {
  onMenuClick: () => void;
  onWorkspaceToggle: () => void;
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
    <header className="shrink-0 relative backdrop-blur-2xl bg-white/[0.03] border-b border-white/[0.06] z-30">
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
              <h1 className="font-bold text-sm leading-tight gradient-text">VenAI</h1>
              <p className="text-[10px] text-white/40 font-medium">Gemma 4 • Sandbox</p>
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
            onClick={onWorkspaceToggle}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95"
            style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            title="Workspace"
          >
            <PanelRight size={18} className="text-white/60" />
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

  // Enhanced markdown with code block copy button
  const markdownComponents = {
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: unknown }) {
      // Extract filename from className like "language-typescript:path/to/file.ts"
      let language = '';
      let filename = '';
      if (className) {
        const langMatch = className.match(/language-(\w+)(?::(.+))?/);
        if (langMatch) {
          language = langMatch[1];
          filename = langMatch[2] || '';
        }
      }
      const isBlock = typeof children === 'string' && children.includes('\n');
      if (isBlock || filename) {
        return (
          <CodeBlock className={className} filename={filename || language}>
            {children}
          </CodeBlock>
        );
      }
      return (
        <code className={`${className || ''} bg-white/[0.06] px-1.5 py-0.5 rounded-md text-[13px]`} {...props}>
          {children}
        </code>
      );
    },
  };

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

        {/* Tool calls section */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {message.toolCalls.map((tc) => (
              <div key={tc.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px]">
                <Wrench size={11} className="text-violet-400 shrink-0" />
                <span className="text-white/50 truncate">{tc.name}: {JSON.stringify(tc.arguments).substring(0, 80)}</span>
                {tc.result && (
                  <span className="text-emerald-400/70 truncate max-w-[150px]">→ {tc.result.substring(0, 60)}</span>
                )}
              </div>
            ))}
          </div>
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30"
            onClick={onClose}
          />

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
                  <h2 className="font-bold text-sm text-white/90">VenAI</h2>
                  <p className="text-[10px] text-white/40 font-medium">Multi-Agent • Sandbox</p>
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
                  <span className="text-[10px] text-white/20 shrink-0">{session.messages.length}</span>
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
// Unified WorkspacePanel
// =============================================
interface SandboxFile {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  path: string;
}

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  sandboxSize: number;
  sandboxPath: string;
  totalFiles: number;
  totalDirs: number;
}

function FileEditor({
  file,
  sessionId,
  onClose,
}: {
  file: SandboxFile;
  sessionId: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadFile() {
      try {
        const res = await fetch(`/api/sandbox/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', path: file.path }),
        });
        const data = await res.json();
        setContent(data.content || '');
      } catch {
        setContent('Error loading file');
      } finally {
        setLoading(false);
      }
    }
    loadFile();
  }, [file.path, sessionId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/sandbox/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: file.path, content }),
      });
      setDirty(false);
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={getFileColor(file.name)}>{getFileIcon(file.name, 14)}</span>
          <span className="text-sm text-white/80 truncate">{file.path}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all active:scale-90" style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}>
            <Download size={14} />
          </button>
          <button onClick={handleSave} disabled={saving || !dirty} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-emerald-400 transition-all active:scale-90 disabled:opacity-30" style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}>
            <Save size={14} />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all active:scale-90" style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            className="w-full h-full bg-transparent text-sm text-white/80 p-3 resize-none outline-none font-mono leading-relaxed"
            style={{ touchAction: 'manipulation', fontSize: '13px' }}
            spellCheck={false}
          />
        )}
      </div>

      {/* Editor footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] text-[10px] text-white/30">
        <span>{content.length} chars</span>
        {dirty && <span className="text-amber-400">Unsaved changes</span>}
      </div>
    </div>
  );
}

function WorkspacePanel({
  isOpen,
  onClose,
  sessionId,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}) {
  const [activeTab, setActiveTab] = useState<'files' | 'terminal' | 'system'>('files');
  const [files, setFiles] = useState<SandboxFile[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [editingFile, setEditingFile] = useState<SandboxFile | null>(null);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<Array<{ type: string; text: string }>>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLTextAreaElement>(null);

  // Upload ref
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchSandboxData = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/sandbox/${sessionId}`);
      const data = await res.json();
      setFiles(data.files || []);
      setSystemInfo(data.systemInfo || null);
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  }, [sessionId]);

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      fetchSandboxData();
      setEditingFile(null);
    }
  }, [isOpen, fetchSandboxData]);

  // Terminal auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Focus terminal when switching to terminal tab
  useEffect(() => {
    if (activeTab === 'terminal' && isOpen) {
      setTimeout(() => terminalInputRef.current?.focus(), 100);
    }
  }, [activeTab, isOpen]);

  // Execute command in sandbox
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim() || terminalLoading) return;
    const trimmed = cmd.trim();

    setTerminalHistory(prev => [...prev, { type: 'command', text: trimmed }]);
    setTerminalInput('');
    setCmdHistory(prev => [...prev, trimmed]);
    setCmdHistoryIdx(-1);
    setTerminalLoading(true);

    try {
      const res = await fetch(`/api/sandbox/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exec', command: trimmed }),
      });
      const data = await res.json();
      const output = data.output || data.result || JSON.stringify(data, null, 2);
      setTerminalHistory(prev => [...prev, { type: 'output', text: output }]);
    } catch (err) {
      setTerminalHistory(prev => [...prev, { type: 'error', text: `Error: ${err instanceof Error ? err.message : 'Unknown'}` }]);
    } finally {
      setTerminalLoading(false);
      fetchSandboxData();
    }
  }, [terminalLoading, sessionId, fetchSandboxData]);

  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(terminalInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = cmdHistoryIdx === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistoryIdx - 1);
        setCmdHistoryIdx(newIdx);
        setTerminalInput(cmdHistory[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIdx >= 0) {
        const newIdx = cmdHistoryIdx + 1;
        if (newIdx >= cmdHistory.length) {
          setCmdHistoryIdx(-1);
          setTerminalInput('');
        } else {
          setCmdHistoryIdx(newIdx);
          setTerminalInput(cmdHistory[newIdx]);
        }
      }
    }
  };

  // Upload file to sandbox
  const handleUpload = useCallback(async (file: File, subPath?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (subPath) formData.append('path', subPath);

      const res = await fetch(`/api/sandbox/${sessionId}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchSandboxData();
      }
    } catch {
      // error
    }
  }, [sessionId, fetchSandboxData]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      await handleUpload(file);
    }
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }, [handleUpload]);

  // New file creation
  const handleNewFile = useCallback(async () => {
    const name = prompt('File name:');
    if (!name) return;
    try {
      await fetch(`/api/sandbox/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: name, content: '' }),
      });
      fetchSandboxData();
    } catch {
      // error
    }
  }, [sessionId, fetchSandboxData]);

  // Delete file
  const handleDeleteFile = useCallback(async (filePath: string) => {
    if (!confirm(`Delete "${filePath}"?`)) return;
    try {
      await fetch(`/api/sandbox/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path: filePath }),
      });
      fetchSandboxData();
      if (editingFile?.path === filePath) setEditingFile(null);
    } catch {
      // error
    }
  }, [sessionId, fetchSandboxData, editingFile]);

  // Clear sandbox
  const handleClearSandbox = useCallback(async () => {
    if (!confirm('Clear all sandbox files?')) return;
    try {
      await fetch(`/api/sandbox/${sessionId}`, { method: 'DELETE' });
      fetchSandboxData();
      setEditingFile(null);
      setTerminalHistory([]);
    } catch {
      // error
    }
  }, [sessionId, fetchSandboxData]);

  // Drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(f => handleUpload(f));
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const tabs = [
    { key: 'files' as const, label: 'Files', icon: <Folder size={14} /> },
    { key: 'terminal' as const, label: 'Terminal', icon: <TerminalIcon size={14} /> },
    { key: 'system' as const, label: 'System', icon: <Info size={14} /> },
  ];

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
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] backdrop-blur-2xl bg-black/40 border-l border-white/[0.08] flex flex-col"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-violet-400" />
                <span className="text-sm font-medium text-white/80">Workspace</span>
                <span className="text-[10px] text-white/30 font-mono">{sessionId.substring(0, 8)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchSandboxData}
                  className="p-2 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95 text-white/40 hover:text-white/70"
                  style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
                >
                  <RefreshCw size={16} className={loadingFiles ? 'animate-spin' : ''} />
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

            {/* Tab bar */}
            <div className="flex border-b border-white/[0.06] shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'text-violet-400 border-violet-400'
                      : 'text-white/40 border-transparent hover:text-white/60'
                  }`}
                  style={{ touchAction: 'manipulation', minHeight: '44px' }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 flex flex-col relative">
              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-violet-500/10 border-2 border-dashed border-violet-400/40 rounded-lg m-2 pointer-events-none">
                  <div className="text-center">
                    <Upload size={32} className="mx-auto mb-2 text-violet-400" />
                    <p className="text-sm text-violet-400">Drop files to upload</p>
                  </div>
                </div>
              )}

              {/* FILES TAB */}
              {activeTab === 'files' && !editingFile && (
                <div className="flex flex-col h-full">
                  {/* File actions bar */}
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04] shrink-0">
                    <button
                      onClick={handleNewFile}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all active:scale-95"
                      style={{ touchAction: 'manipulation', minHeight: '32px' }}
                    >
                      <FilePlus size={13} />
                      <span>New File</span>
                    </button>
                    <button
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all active:scale-95"
                      style={{ touchAction: 'manipulation', minHeight: '32px' }}
                    >
                      <Upload size={13} />
                      <span>Upload</span>
                    </button>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    {files.length > 0 && (
                      <button
                        onClick={handleClearSandbox}
                        className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                        style={{ touchAction: 'manipulation', minHeight: '32px' }}
                      >
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  {/* File list */}
                  <div className="flex-1 overflow-y-auto panel-scroll">
                    {loadingFiles && files.length === 0 && (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                      </div>
                    )}
                    {files.length === 0 && !loadingFiles && (
                      <div className="flex flex-col items-center justify-center py-12 text-white/30 px-4">
                        <Folder size={32} className="mb-3 opacity-40" />
                        <p className="text-sm mb-1">No files yet</p>
                        <p className="text-[11px] text-white/20">Create a file or drag & drop files here</p>
                      </div>
                    )}
                    {files.map((file, i) => (
                      <div
                        key={`${file.path}-${i}`}
                        className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                        style={{ touchAction: 'manipulation', minHeight: '44px' }}
                        onClick={() => file.type === 'file' && setEditingFile(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (file.type === 'file') {
                            if (confirm(`Delete "${file.path}"?`)) handleDeleteFile(file.path);
                          }
                        }}
                      >
                        <div className={`${file.type === 'directory' ? 'text-violet-400/70' : getFileColor(file.name)} shrink-0`}>
                          {file.type === 'directory' ? <Folder size={16} /> : getFileIcon(file.name, 16)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/70 truncate">{file.name}</p>
                          <p className="text-[10px] text-white/30">
                            {file.type === 'directory' ? 'Directory' : formatSize(file.size)}
                            {' • '}
                            {new Date(file.modified).toLocaleString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {file.type === 'file' && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingFile(file); }}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
                              style={{ minHeight: '28px', minWidth: '28px', touchAction: 'manipulation' }}
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.path); }}
                              className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all"
                              style={{ minHeight: '28px', minWidth: '28px', touchAction: 'manipulation' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FILE EDITOR */}
              {activeTab === 'files' && editingFile && (
                <div className="h-full">
                  <FileEditor
                    file={editingFile}
                    sessionId={sessionId}
                    onClose={() => { setEditingFile(null); fetchSandboxData(); }}
                  />
                </div>
              )}

              {/* TERMINAL TAB */}
              {activeTab === 'terminal' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto px-3 py-3 panel-scroll">
                    {terminalHistory.length === 0 && (
                      <div className="flex items-center gap-2 text-white/25 text-xs terminal-text">
                        <span className="text-emerald-400/60">&gt;</span>
                        <span>Sandbox terminal ready...</span>
                      </div>
                    )}
                    {terminalHistory.map((entry, i) => (
                      <div key={i} className="mb-1.5 terminal-text">
                        {entry.type === 'command' && (
                          <div className="text-emerald-400/80">
                            <span className="text-emerald-400 mr-2">$</span>
                            <span>{entry.text}</span>
                          </div>
                        )}
                        {entry.type === 'output' && (
                          <pre className="text-white/70 whitespace-pre-wrap break-all text-[13px]">{entry.text}</pre>
                        )}
                        {entry.type === 'error' && (
                          <pre className="text-red-400/80 whitespace-pre-wrap break-all text-[13px]">{entry.text}</pre>
                        )}
                      </div>
                    ))}
                    {terminalLoading && (
                      <div className="flex items-center gap-2 text-white/40 text-xs terminal-text">
                        <div className="w-3 h-3 border border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
                        <span>Executing...</span>
                      </div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>

                  <div className="shrink-0 px-3 py-2 border-t border-white/[0.06]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/[0.06] px-3 py-2">
                      <span className="text-emerald-400/70 terminal-text shrink-0">$</span>
                      <textarea
                        ref={terminalInputRef}
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={handleTerminalKeyDown}
                        placeholder="Enter command..."
                        rows={1}
                        className="flex-1 bg-transparent resize-none outline-none text-sm text-white/80 placeholder:text-white/20 terminal-text"
                        style={{ touchAction: 'manipulation', fontSize: '13px' }}
                      />
                      <button
                        onClick={() => executeCommand(terminalInput)}
                        disabled={!terminalInput.trim() || terminalLoading}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 disabled:opacity-30 transition-all active:scale-90"
                        style={{ touchAction: 'manipulation', minHeight: '32px', minWidth: '32px' }}
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SYSTEM TAB */}
              {activeTab === 'system' && (
                <div className="flex-1 overflow-y-auto p-4 panel-scroll">
                  {systemInfo ? (
                    <div className="space-y-3">
                      <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-[11px] text-white/40 mb-2">
                          <Cpu size={12} />
                          <span className="font-medium uppercase tracking-wider">System</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/50">Platform</span>
                            <span className="text-white/70 font-mono">{systemInfo.platform} {systemInfo.arch}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Node.js</span>
                            <span className="text-white/70 font-mono">{systemInfo.nodeVersion}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Memory</span>
                            <span className="text-white/70 font-mono">{formatSize(systemInfo.freeMemory)} / {formatSize(systemInfo.totalMemory)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2 text-[11px] text-white/40 mb-2">
                          <Database size={12} />
                          <span className="font-medium uppercase tracking-wider">Sandbox</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/50">Path</span>
                            <span className="text-white/70 font-mono text-[10px] truncate max-w-[200px]" title={systemInfo.sandboxPath}>{systemInfo.sandboxPath}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Files</span>
                            <span className="text-white/70 font-mono">{systemInfo.totalFiles} files, {systemInfo.totalDirs} dirs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Size</span>
                            <span className="text-white/70 font-mono">{formatSize(systemInfo.sandboxSize)} / 50 MB</span>
                          </div>
                          {/* Size bar */}
                          <div className="mt-2">
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-gradient-to-r from-violet-500 to-purple-500"
                                style={{ width: `${Math.min(100, (systemInfo.sandboxSize / (50 * 1024 * 1024)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleClearSandbox}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs text-red-400/60 hover:text-red-400 border border-red-500/10 hover:bg-red-500/10 transition-all active:scale-[0.98]"
                        style={{ touchAction: 'manipulation', minHeight: '44px' }}
                      >
                        <Trash2 size={14} />
                        Clear All Sandbox Data
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
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
    { text: 'Tạo file và chạy lệnh trong sandbox', icon: <Wrench size={16} />, role: 'coder' },
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
        Xin chào! Tôi là VenAI
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-sm text-white/45 max-w-md mb-8 leading-relaxed"
      >
        VenAI - AI Multi-Agent với 6 chuyên gia thông minh và Sandbox workspace cho mỗi phiên chat. Sẵn sàng hỗ trợ bạn.
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
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Upload files to sandbox and add to chat
  const uploadFilesToSandbox = useCallback(async (files: File[]) => {
    if (!session?.id) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" quá lớn. Max 10MB.`);
        continue;
      }
      try {
        // Try reading as text first
        const content = await file.text();
        addFile({
          id: generateFileId(),
          name: file.name,
          content,
          size: file.size,
          type: file.type || 'text/plain',
        });
      } catch {
        addFile({
          id: generateFileId(),
          name: file.name,
          content: `[Binary file: ${file.name}]`,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      }
    }
  }, [session?.id, addFile]);

  // Drag & drop on chat area
  const handleChatDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFilesToSandbox(files);
    }
  }, [uploadFilesToSandbox]);

  const handleChatDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleChatDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if leaving the container
    if (chatContainerRef.current && !chatContainerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  // Handle file selection from input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFilesToSandbox(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFilesToSandbox]);

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
          sessionId: session?.id,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to connect');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            setLastMessageComplete();
            setIsGenerating(false);
            continue;
          }

          try {
            const chunk: StreamChunk = JSON.parse(data);

            switch (chunk.type) {
              case 'agent_switch':
                if (chunk.agentId && chunk.agentName && chunk.agentColor && chunk.agentRole) {
                  setLastMessageAgent(chunk.agentId, chunk.agentName, chunk.agentColor, chunk.agentRole as AgentRole);
                }
                break;
              case 'thinking':
                if (chunk.content) {
                  addThinkingToLastMessage(chunk.content);
                }
                break;
              case 'token':
                if (chunk.content) {
                  updateLastMessage(chunk.content);
                }
                break;
              case 'tool_call':
                if (chunk.content) {
                  addThinkingToLastMessage(`🔧 Tool Call: ${chunk.content}`);
                }
                break;
              case 'tool_result':
                if (chunk.content) {
                  addThinkingToLastMessage(`✅ Tool Result: ${chunk.content}`);
                }
                break;
              case 'error':
                if (chunk.error) {
                  updateLastMessage(`\n\n❌ ${chunk.error}`);
                }
                break;
              case 'done':
                break;
              case 'chain_start':
              case 'chain_step':
                if (chunk.content) {
                  addThinkingToLastMessage(chunk.content);
                }
                break;
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      setLastMessageComplete();
    } catch (err) {
      updateLastMessage(`\n\n❌ Lỗi kết nối: ${err instanceof Error ? err.message : 'Unknown'}`);
      setLastMessageComplete();
    } finally {
      setIsGenerating(false);
    }
  }, [input, attachedFiles, isGenerating, selectedAgent, messages, session?.id, addUserMessage, addAssistantMessage, clearFiles, updateLastMessage, setLastMessageComplete, setLastMessageAgent, addThinkingToLastMessage, setIsGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string, role: AgentRole) => {
    setSelectedAgent(role);
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* WebGL Background */}
      <WebGLBackground />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Workspace Panel */}
      <WorkspacePanel
        isOpen={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        sessionId={session?.id || 'default'}
      />

      {/* Drag overlay for entire chat area */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-violet-600/10 backdrop-blur-sm pointer-events-none"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-3xl bg-black/40 border-2 border-dashed border-violet-400/50">
            <Upload size={48} className="text-violet-400" />
            <p className="text-lg font-medium text-violet-300">Drop files here</p>
            <p className="text-sm text-white/40">Files will be uploaded to sandbox & attached to chat</p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <GlassHeader
        onMenuClick={toggleSidebar}
        onWorkspaceToggle={() => setWorkspaceOpen(prev => !prev)}
        onNewChat={() => createSession()}
        isDark={isDark}
        onThemeToggle={() => setIsDark(prev => !prev)}
      />

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 panel-scroll relative z-10"
        onDrop={handleChatDrop}
        onDragOver={handleChatDragOver}
        onDragLeave={handleChatDragLeave}
      >
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent selector */}
      <div className="shrink-0 px-3 sm:px-6 py-1.5 relative z-10">
        <div className="max-w-3xl mx-auto">
          <AgentSelector selected={selectedAgent} onSelect={setSelectedAgent} />
        </div>
      </div>

      {/* File chips */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 px-3 sm:px-6 overflow-hidden relative z-10"
          >
            <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5 py-1">
              {attachedFiles.map((file) => (
                <FileChip key={file.id} file={file} onRemove={() => removeFile(file.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className="shrink-0 relative z-10 backdrop-blur-2xl bg-white/[0.02] border-t border-white/[0.06]"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5">
          <div className="flex items-end gap-2 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] px-3 py-2 focus-within:border-white/[0.15] transition-all">
            {/* File attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all active:scale-90 mb-0.5"
              style={{ touchAction: 'manipulation', minHeight: '36px', minWidth: '36px' }}
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-white/80 placeholder:text-white/25 py-2 leading-relaxed"
              style={{ touchAction: 'manipulation', fontSize: '15px', maxHeight: '120px' }}
              disabled={isGenerating}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isGenerating || (!input.trim() && attachedFiles.length === 0)}
              className="shrink-0 p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white hover:shadow-lg hover:shadow-violet-600/20 transition-all active:scale-90 disabled:opacity-30 disabled:hover:shadow-none mb-0.5"
              style={{ touchAction: 'manipulation', minHeight: '36px', minWidth: '36px' }}
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-white/20 mt-1.5 hidden sm:block">
            VenAI • Sandbox • Gemma 4 • Mỗi session có workspace riêng
          </p>
        </div>
      </div>
    </div>
  );
}
