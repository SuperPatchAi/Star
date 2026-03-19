'use client'

import { useState, useRef, useCallback, forwardRef, useImperativeHandle, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
}

export interface ChatInputHandle {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ onSend, onStop, isStreaming }, ref) {
    const [value, setValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    const handleSubmit = useCallback(() => {
      const trimmed = value.trim()
      if (!trimmed || isStreaming) return
      onSend(trimmed)
      setValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }, [value, isStreaming, onSend])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      },
      [handleSubmit],
    )

    const handleInput = useCallback(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`
    }, [])

    const hasText = value.trim().length > 0

    return (
      <div className="border-t px-3 pb-3 pt-2">
        <div
          className={cn(
            'flex items-end gap-1.5 rounded-xl border bg-background px-3 py-1.5',
            'ring-ring/20 focus-within:ring-2 transition-shadow',
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Message J.Ai..."
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none',
              'min-h-[28px] max-h-[140px]',
            )}
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="size-7 shrink-0 rounded-lg"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              className={cn(
                'size-7 shrink-0 rounded-lg transition-all',
                hasText
                  ? 'bg-primary text-primary-foreground opacity-100'
                  : 'bg-muted text-muted-foreground opacity-60',
              )}
              onClick={handleSubmit}
              disabled={!hasText}
              aria-label="Send message"
            >
              <ArrowUp className="size-3.5" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          J.Ai can make mistakes. Verify important info.
        </p>
      </div>
    )
  },
)
