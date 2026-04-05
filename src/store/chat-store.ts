// ============================================
// NovaMind AI - Chat Store (Zustand)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ChatSession, AgentRole } from '@/lib/types';
import { AGENT_DEFINITIONS } from '@/lib/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createNewSession(title?: string): ChatSession {
  return {
    id: generateId(),
    title: title || 'Cuộc trò chuyện mới',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeAgent: 'orchestrator',
    status: 'active',
  };
}

interface ChatStore {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // UI State
  sidebarOpen: boolean;
  selectedAgent: AgentRole;
  isGenerating: boolean;
  modelStatus: 'loading' | 'ready' | 'error';
  modelMessage: string;
  
  // Actions - Sessions
  createSession: (title?: string) => ChatSession;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  
  // Actions - Messages
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, agentId?: string, agentName?: string, agentColor?: string, agentRole?: AgentRole) => void;
  updateLastMessage: (content: string) => void;
  setLastMessageComplete: () => void;
  setLastMessageAgent: (agentId: string, agentName: string, agentColor: string, agentRole: AgentRole) => void;
  addThinkingToLastMessage: (content: string) => void;
  
  // Actions - UI
  toggleSidebar: () => void;
  setSelectedAgent: (role: AgentRole) => void;
  setIsGenerating: (value: boolean) => void;
  setModelStatus: (status: 'loading' | 'ready' | 'error', message: string) => void;
  clearSessions: () => void;
  
  // Computed
  activeSession: () => ChatSession | null;
  activeMessages: () => Message[];
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [createNewSession('Xin chào! 👋')],
      activeSessionId: null,
      sidebarOpen: false,
      selectedAgent: 'orchestrator',
      isGenerating: false,
      modelStatus: 'loading',
      modelMessage: 'Đang kiểm tra model...',

      createSession: (title) => {
        const session = createNewSession(title);
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }));
        return session;
      },

      deleteSession: (id) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          if (state.activeSessionId === id) {
            return {
              sessions: newSessions,
              activeSessionId: newSessions[0]?.id || null,
            };
          }
          return { sessions: newSessions };
        });
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      renameSession: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }));
      },

      addUserMessage: (content) => {
        const state = get();
        let sessionId = state.activeSessionId;

        if (!sessionId) {
          const session = state.sessions[0];
          if (session) {
            sessionId = session.id;
            set({ activeSessionId: sessionId });
          } else {
            return;
          }
        }

        const message: Message = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: Date.now(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  updatedAt: Date.now(),
                  title: s.messages.length === 0 ? content.slice(0, 50) : s.title,
                }
              : s
          ),
        }));
      },

      addAssistantMessage: (content, agentId, agentName, agentColor, agentRole) => {
        const state = get();
        const sessionId = state.activeSessionId || state.sessions[0]?.id;
        if (!sessionId) return;

        const message: Message = {
          id: generateId(),
          role: 'assistant',
          content,
          agentId,
          agentName,
          agentColor,
          agentRole,
          timestamp: Date.now(),
          isStreaming: true,
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
              : s
          ),
        }));
      },

      updateLastMessage: (content) => {
        const state = get();
        const sessionId = state.activeSessionId || state.sessions[0]?.id;
        if (!sessionId) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || s.messages.length === 0) return s;
            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[messages.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + content,
              };
            }
            return { ...s, messages, updatedAt: Date.now() };
          }),
        }));
      },

      setLastMessageComplete: () => {
        const state = get();
        const sessionId = state.activeSessionId || state.sessions[0]?.id;
        if (!sessionId) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || s.messages.length === 0) return s;
            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[messages.length - 1] = { ...lastMsg, isStreaming: false };
            }
            return { ...s, messages, updatedAt: Date.now() };
          }),
        }));
      },

      setLastMessageAgent: (agentId, agentName, agentColor, agentRole) => {
        const state = get();
        const sessionId = state.activeSessionId || state.sessions[0]?.id;
        if (!sessionId) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || s.messages.length === 0) return s;
            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
              messages[messages.length - 1] = {
                ...lastMsg,
                agentId,
                agentName,
                agentColor,
                agentRole,
              };
            }
            return { ...s, messages, updatedAt: Date.now() };
          }),
        }));
      },

      addThinkingToLastMessage: (content) => {
        const state = get();
        const sessionId = state.activeSessionId || state.sessions[0]?.id;
        if (!sessionId) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || s.messages.length === 0) return s;
            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[messages.length - 1] = {
                ...lastMsg,
                thinking: (lastMsg.thinking ? lastMsg.thinking + '\n' : '') + content,
              };
            }
            return { ...s, messages, updatedAt: Date.now() };
          }),
        }));
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSelectedAgent: (role) => set({ selectedAgent: role }),
      
      setIsGenerating: (value) => set({ isGenerating: value }),
      
      setModelStatus: (status, message) => set({ modelStatus: status, modelMessage: message }),

      clearSessions: () => {
        const newSession = createNewSession('Xin chào! 👋');
        set({ sessions: [newSession], activeSessionId: newSession.id });
      },

      activeSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.activeSessionId) || state.sessions[0] || null;
      },

      activeMessages: () => {
        const state = get();
        const session = state.sessions.find((s) => s.id === state.activeSessionId) || state.sessions[0];
        return session?.messages || [];
      },
    }),
    {
      name: 'novamind-chat-store',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
