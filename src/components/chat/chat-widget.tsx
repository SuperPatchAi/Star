'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { Sparkles, X, RotateCcw } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useChatContext } from '@/contexts/chat-context'
import { ChatMessages } from './chat-messages'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { StarAgentTransport } from './transport'
import type { MyUIMessage } from './types'

const transport = new StarAgentTransport()

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const pathname = usePathname()
  const { selectedContactId } = useChatContext()
  const fabRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<ChatInputHandle>(null)

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport,
    onFinish: () => {
      if (!open) setHasUnread(true)
    },
  })

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(
        { text },
        {
          body: {
            context: {
              current_page: pathname,
              selected_contact_id: selectedContactId,
            },
          },
        },
      )
    },
    [sendMessage, pathname, selectedContactId],
  )

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return
    const text = lastUserMsg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
    if (text) {
      const withoutLastAssistant = messages.filter(
        (_, i) => i < messages.length - 1 || messages[messages.length - 1].role !== 'assistant',
      )
      setMessages(withoutLastAssistant)
      handleSend(text)
    }
  }, [messages, setMessages, handleSend])

  const handleNewConversation = useCallback(() => {
    setMessages([])
  }, [setMessages])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) setHasUnread(false)
    },
    [],
  )

  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg [&>button:last-child]:hidden"
        >
          {/* Header */}
          <SheetHeader className="border-b border-b-border/50 bg-gradient-to-b from-background to-muted/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold leading-tight">
                    J.Ai
                  </SheetTitle>
                  <SheetDescription className="text-[11px] leading-tight" aria-live="polite">
                    <span
                      className={cn(
                        'mr-1.5 inline-block size-1.5 rounded-full',
                        isStreaming ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
                      )}
                    />
                    {isStreaming ? 'Thinking...' : 'Online'}
                  </SheetDescription>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={handleNewConversation}
                    disabled={messages.length === 0}
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="sr-only">New conversation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New conversation</TooltipContent>
              </Tooltip>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ChatMessages
            messages={messages as MyUIMessage[]}
            status={status}
            onSuggestionClick={handleSend}
            onRetry={handleRetry}
          />

          {/* Input */}
          <ChatInput
            ref={inputRef}
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
          />
        </SheetContent>
      </Sheet>

      {/* FAB */}
      <Button
        ref={fabRef}
        size="icon-lg"
        className={cn(
          'fixed right-4 z-50 rounded-full shadow-lg transition-all',
          'bottom-20 md:bottom-6',
          'bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70',
          !open && 'animate-in fade-in zoom-in-90 duration-300',
        )}
        onClick={() => handleOpenChange(!open)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? (
          <X className="size-5" />
        ) : (
          <span className="relative">
            <Sparkles className="size-5" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
              </span>
            )}
          </span>
        )}
      </Button>
    </>
  )
}
