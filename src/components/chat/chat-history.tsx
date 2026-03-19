'use client'

import { MessageSquare, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/lib/db/types'

interface ChatHistoryProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onBack: () => void
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function messagePreview(session: ChatSession): string {
  const msgs = session.messages as { role: string; content: string }[]
  if (!Array.isArray(msgs) || msgs.length === 0) return 'Empty conversation'
  const last = msgs[msgs.length - 1]
  const text = last?.content ?? ''
  return text.slice(0, 80) + (text.length > 80 ? '...' : '')
}

export function ChatHistory({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onBack,
}: ChatHistoryProps) {
  const nonEmpty = sessions.filter((s) => {
    const msgs = s.messages as unknown[]
    return Array.isArray(msgs) && msgs.length > 0
  })

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Button variant="ghost" size="icon" className="size-7" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
        </Button>
        <h3 className="text-sm font-semibold">Chat History</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {nonEmpty.length} conversation{nonEmpty.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {nonEmpty.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <MessageSquare className="size-8 opacity-40" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {nonEmpty.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelect(session.id)}
                className={cn(
                  'group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  'hover:bg-accent/50',
                  session.id === activeSessionId && 'bg-accent/30',
                )}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelativeTime(session.updated_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {messagePreview(session)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </Button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
