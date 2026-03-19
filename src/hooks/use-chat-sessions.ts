'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getChatSessions,
  upsertChatSession,
  deleteChatSession as deleteSessionAction,
} from '@/lib/actions/chat-sessions'
import type { ChatSession } from '@/lib/db/types'

interface SerializedToolPart {
  type: 'dynamic-tool'
  toolName: string
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
}

interface SerializedTextPart {
  type: 'text'
  text: string
}

type SerializedPart = SerializedTextPart | SerializedToolPart | { type: string; [key: string]: unknown }

export interface SerializedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: SerializedPart[]
  /** @deprecated kept for backward compat with old sessions */
  content?: string
}

interface UseChatSessionsReturn {
  sessions: ChatSession[]
  activeSessionId: string | null
  isLoading: boolean
  createSession: (firstMessageText?: string) => string
  switchSession: (sessionId: string) => SerializedMessage[]
  saveMessages: (sessionId: string, messages: SerializedMessage[], title?: string) => void
  deleteSession: (sessionId: string) => void
  getSessionMessages: (sessionId: string) => SerializedMessage[]
}

const LS_PREFIX = 'jai-sessions-'

function getLocalSessions(userId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalSessions(userId: string, sessions: ChatSession[]): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${userId}`, JSON.stringify(sessions))
  } catch {
    // localStorage full or unavailable
  }
}

function serializeMessages(messages: SerializedMessage[]): SerializedMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
  }))
}

export function useChatSessions(): UseChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const local = getLocalSessions(user.id)
      if (local.length > 0) {
        setSessions(local)
        setActiveSessionId(local[0].id)
      }

      getChatSessions().then((remote) => {
        if (remote.length > 0) {
          setSessions(remote)
          setLocalSessions(user.id, remote)
          if (!activeSessionId && local.length === 0) {
            setActiveSessionId(remote[0].id)
          }
        }
        setIsLoading(false)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateLocalSession = useCallback(
    (session: ChatSession) => {
      if (!userId) return
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === session.id)
        const next = idx >= 0 ? [...prev] : [session, ...prev]
        if (idx >= 0) {
          next[idx] = session
          next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        }
        setLocalSessions(userId, next)
        return next
      })
    },
    [userId],
  )

  const createSession = useCallback(
    (firstMessageText?: string): string => {
      const id = crypto.randomUUID()
      const title = firstMessageText
        ? firstMessageText.slice(0, 50) + (firstMessageText.length > 50 ? '...' : '')
        : 'New conversation'
      const now = new Date().toISOString()
      const session: ChatSession = {
        id,
        user_id: userId ?? '',
        title,
        messages: [],
        created_at: now,
        updated_at: now,
      }
      updateLocalSession(session)
      setActiveSessionId(id)
      return id
    },
    [userId, updateLocalSession],
  )

  const switchSession = useCallback(
    (sessionId: string): SerializedMessage[] => {
      setActiveSessionId(sessionId)
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) return []
      const raw = (session.messages as unknown as SerializedMessage[]) ?? []
      return raw.map((m) => {
        if (m.parts) return m
        const text = (m as unknown as { content?: string }).content ?? ''
        return { ...m, parts: [{ type: 'text' as const, text }] }
      })
    },
    [sessions],
  )

  const saveMessages = useCallback(
    (sessionId: string, messages: SerializedMessage[], title?: string) => {
      if (!userId) return

      const serialized = serializeMessages(messages)
      const session = sessions.find((s) => s.id === sessionId)
      const now = new Date().toISOString()

      const firstUserText = (msg: SerializedMessage): string => {
        if (msg.parts) {
          const tp = msg.parts.find((p): p is SerializedTextPart => p.type === 'text')
          return tp?.text ?? ''
        }
        return msg.content ?? ''
      }

      const sessionTitle =
        title ??
        (session?.title === 'New conversation' && messages.length > 0
          ? (() => {
              const firstUser = messages.find((m) => m.role === 'user')
              const text = firstUser ? firstUserText(firstUser) : ''
              return text.slice(0, 50) + (text.length > 50 ? '...' : '')
            })()
          : undefined) ??
        session?.title ??
        'New conversation'

      const updated: ChatSession = {
        id: sessionId,
        user_id: userId,
        title: sessionTitle,
        messages: serialized as unknown as ChatSession['messages'],
        created_at: session?.created_at ?? now,
        updated_at: now,
      }

      updateLocalSession(updated)

      const existing = debounceTimers.current.get(sessionId)
      if (existing) clearTimeout(existing)
      debounceTimers.current.set(
        sessionId,
        setTimeout(() => {
          upsertChatSession(sessionId, sessionTitle, serialized as unknown as import('@/lib/db/types').Json).catch(() => {})
          debounceTimers.current.delete(sessionId)
        }, 2000),
      )
    },
    [userId, sessions, updateLocalSession],
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      if (!userId) return
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId)
        setLocalSessions(userId, next)
        return next
      })
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
      }
      deleteSessionAction(sessionId).catch(() => {})
    },
    [userId, activeSessionId],
  )

  const getSessionMessages = useCallback(
    (sessionId: string): SerializedMessage[] => {
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) return []
      const raw = (session.messages as unknown as SerializedMessage[]) ?? []
      return raw.map((m) => {
        if (m.parts) return m
        const text = (m as unknown as { content?: string }).content ?? ''
        return { ...m, parts: [{ type: 'text' as const, text }] }
      })
    },
    [sessions],
  )

  return {
    sessions,
    activeSessionId,
    isLoading,
    createSession,
    switchSession,
    saveMessages,
    deleteSession,
    getSessionMessages,
  }
}
