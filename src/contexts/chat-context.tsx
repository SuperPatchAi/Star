'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface ChatContextType {
  selectedContactId: string | null
  setSelectedContactId: (id: string | null) => void
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [selectedContactId, setSelectedContactIdState] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null)

  const setSelectedContactId = useCallback((id: string | null) => {
    setSelectedContactIdState(id)
  }, [])

  const setActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionIdState(id)
  }, [])

  return (
    <ChatContext.Provider value={{ selectedContactId, setSelectedContactId, activeSessionId, setActiveSessionId }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatContextProvider')
  }
  return context
}
