'use client'

import { useState, useCallback, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles,
  User,
  Loader2,
  Search,
  Database,
  BookOpen,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ChevronDown,
  MessageSquare,
  BarChart3,
  GraduationCap,
  Users,
  CalendarCheck,
  ShieldQuestion,
  Target,
  TrendingUp,
  Handshake,
  BrainCircuit,
  Lightbulb,
  Route,
} from 'lucide-react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TOOL_RENDERERS } from './tool-renderers'
import { DATA_RENDERERS } from './data-renderers'
import type { MyUIMessage } from './types'

interface ChatMessagesProps {
  messages: MyUIMessage[]
  status: string
  onSuggestionClick: (text: string) => void
  onRetry?: () => void
}

const SUGGESTIONS: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: BarChart3, label: 'Dashboard stats', text: 'Show me my dashboard stats and pipeline summary' },
  { icon: GraduationCap, label: 'Start a coaching skill', text: 'Start the Financial Ladder Assessment' },
  { icon: Users, label: 'My contacts', text: 'Show me all my contacts' },
  { icon: CalendarCheck, label: 'Follow-up reminders', text: 'What follow-ups are due today?' },
  { icon: ShieldQuestion, label: 'Handle objections', text: 'How do I handle the objection that patches are too expensive?' },
  { icon: TrendingUp, label: 'Sales analytics', text: 'Show me my sales analytics and conversion rates' },
  { icon: Target, label: 'Coaching progress', text: 'Show my coaching progress' },
  { icon: MessageSquare, label: 'Opening scripts', text: 'What are the best opening scripts for a cold approach?' },
  { icon: Handshake, label: 'Closing techniques', text: 'What closing techniques work best for warm prospects?' },
  { icon: BrainCircuit, label: 'Mindset coaching', text: 'Help me build a winning mindset for sales' },
  { icon: Lightbulb, label: 'Discovery questions', text: 'What discovery questions should I ask a new prospect?' },
  { icon: Route, label: 'My sales pipeline', text: 'Walk me through my current sales pipeline and next steps' },
]

export function ChatMessages({ messages, status, onSuggestionClick, onRetry }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
            <Sparkles className="size-7 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold tracking-tight">J.Ai</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your AI sales &amp; coaching assistant
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <p className="mb-2.5 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Try asking
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => onSuggestionClick(s.text)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
                  'text-xs font-medium transition-all',
                  'hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
                  'active:scale-[0.97]',
                )}
              >
                <s.icon className="size-3 shrink-0 text-muted-foreground" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isStreaming = status === 'streaming' || status === 'submitted'
  const lastMessage = messages[messages.length - 1]
  const showTyping = isStreaming && lastMessage?.role === 'user'

  return (
    <StickToBottom className="relative min-h-0 flex-1 overflow-hidden" resize="smooth" initial="smooth">
      <StickToBottom.Content
        className="flex flex-col gap-1 px-4 py-4"
        role="log"
        aria-live="polite"
      >
        {messages.map((message, idx) => (
          <MessageRow
            key={message.id}
            message={message}
            isLast={idx === messages.length - 1}
            onRetry={onRetry}
          />
        ))}

        {showTyping && <TypingIndicator />}
      </StickToBottom.Content>

      <ScrollToBottomButton />
    </StickToBottom>
  )
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <div className="sticky bottom-2 flex justify-center">
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1 rounded-full px-3 text-xs shadow-md"
        onClick={() => scrollToBottom()}
        aria-label="Scroll to bottom"
      >
        <ChevronDown className="size-3" />
        New messages
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message row — flat layout for assistant, bubble for user
// ---------------------------------------------------------------------------

function MessageRow({
  message,
  isLast,
  onRetry,
}: {
  message: MyUIMessage
  isLast: boolean
  onRetry?: () => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="group flex flex-row-reverse gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
          <User className="size-3.5" />
        </div>
        <div className="flex max-w-[80%] flex-col items-end gap-1">
          <span className="text-[10px] font-medium text-muted-foreground mr-1">You</span>
          <div className="rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
            {message.parts.map((part, idx) => (
              <MessagePart key={idx} part={part} isUser />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3" />
        </div>
        <span className="text-xs font-semibold">J.Ai</span>
      </div>

      <div className="pl-8 text-sm leading-relaxed text-foreground">
        {message.parts.map((part, idx) => (
          <MessagePart key={idx} part={part} isUser={false} />
        ))}
      </div>

      <MessageActions message={message} isLast={isLast} onRetry={onRetry} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message actions — copy, thumbs, retry
// ---------------------------------------------------------------------------

function MessageActions({
  message,
  isLast,
  onRetry,
}: {
  message: MyUIMessage
  isLast: boolean
  onRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  const fullText = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [fullText])

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 pl-8 mt-1.5 transition-opacity',
        isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy message'}
      >
        {copied ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Copy className="size-3 text-muted-foreground" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
        aria-label="Good response"
      >
        <ThumbsUp
          className={cn(
            'size-3',
            feedback === 'up' ? 'fill-current text-primary' : 'text-muted-foreground',
          )}
        />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
        aria-label="Bad response"
      >
        <ThumbsDown
          className={cn(
            'size-3',
            feedback === 'down' ? 'fill-current text-destructive' : 'text-muted-foreground',
          )}
        />
      </Button>

      {isLast && onRetry && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onRetry}
          aria-label="Retry response"
        >
          <RotateCcw className="size-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message part dispatcher
// ---------------------------------------------------------------------------

function MessagePart({ part, isUser }: { part: MyUIMessage['parts'][number]; isUser: boolean }) {
  if (part.type === 'text') {
    return <RichText text={part.text} isUser={isUser} />
  }

  if (part.type === 'dynamic-tool') {
    const p = part as {
      type: 'dynamic-tool'
      toolName: string
      toolCallId: string
      state: string
      input?: unknown
      output?: unknown
    }
    const Renderer = TOOL_RENDERERS[p.toolName]
    if (!Renderer) {
      return <ToolProgressCard toolName={p.toolName} state={p.state} />
    }
    return (
      <Renderer
        input={(p.input ?? {}) as Record<string, unknown>}
        output={p.output}
        state={p.state}
      />
    )
  }

  const p = part as { type: string; data?: unknown }
  if (p.type.startsWith('data-')) {
    const dataType = p.type.replace(/^data-/, '')
    const Renderer = DATA_RENDERERS[dataType]
    if (Renderer) {
      return <Renderer data={p.data} />
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Tool progress card
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, { label: string; icon: typeof Search }> = {
  get_contact: { label: 'Looking up contact', icon: Search },
  list_contacts_by_filter: { label: 'Searching contacts', icon: Search },
  get_dashboard_stats: { label: 'Loading dashboard', icon: Database },
  get_sales_analytics: { label: 'Analyzing sales data', icon: Database },
  get_product_info: { label: 'Loading product info', icon: BookOpen },
  get_follow_up_reminders: { label: 'Checking reminders', icon: Search },
  search_scripts: { label: 'Searching scripts', icon: Search },
  advance_contact_step: { label: 'Advancing pipeline', icon: Database },
  advance_follow_up_day: { label: 'Updating follow-up', icon: Database },
  update_contact_fields: { label: 'Updating contact', icon: Database },
  load_skill_definition: { label: 'Loading skill', icon: BookOpen },
  compute_assessment_score: { label: 'Computing score', icon: Database },
  get_coaching_progress: { label: 'Loading progress', icon: BookOpen },
  save_skill_completion: { label: 'Saving progress', icon: Database },
}

function ToolProgressCard({ toolName, state }: { toolName: string; state: string }) {
  const info = TOOL_LABELS[toolName] ?? { label: toolName.replace(/_/g, ' '), icon: Search }
  const Icon = info.icon
  const isRunning = state !== 'result'

  return (
    <div className="my-1.5 flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
      {isRunning ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Icon className="size-3.5" />
      )}
      <span>
        {info.label}
        {isRunning ? '...' : ''}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3" />
        </div>
        <span className="text-xs font-semibold">J.Ai</span>
      </div>
      <div className="pl-8">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rich text rendering — headings, code blocks, lists, paragraphs, inline
// ---------------------------------------------------------------------------

function RichText({ text, isUser }: { text: string; isUser: boolean }) {
  const blocks = parseBlocks(text)
  return (
    <>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} isUser={isUser} index={i} />
      ))}
    </>
  )
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code-block'; language: string; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'hr' }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')
  let current: Block | null = null
  let inCodeBlock = false
  let codeLanguage = ''
  let codeLines: string[] = []

  const flushCurrent = () => {
    if (current) {
      blocks.push(current)
      current = null
    }
  }

  for (const raw of lines) {
    const line = raw

    if (inCodeBlock) {
      if (/^```\s*$/.test(line)) {
        blocks.push({ kind: 'code-block', language: codeLanguage, code: codeLines.join('\n') })
        inCodeBlock = false
        codeLanguage = ''
        codeLines = []
      } else {
        codeLines.push(line)
      }
      continue
    }

    const fenceMatch = line.match(/^```(\w*)/)
    if (fenceMatch) {
      flushCurrent()
      inCodeBlock = true
      codeLanguage = fenceMatch[1] ?? ''
      codeLines = []
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      flushCurrent()
      blocks.push({ kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] })
      continue
    }

    if (/^---+$/.test(line.trim())) {
      flushCurrent()
      blocks.push({ kind: 'hr' })
      continue
    }

    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)/)
    if (ulMatch) {
      if (current?.kind !== 'ul') {
        flushCurrent()
        current = { kind: 'ul', items: [] }
      }
      ;(current as { kind: 'ul'; items: string[] }).items.push(ulMatch[1])
      continue
    }

    const olMatch = line.match(/^[\s]*\d+[.)]\s+(.+)/)
    if (olMatch) {
      if (current?.kind !== 'ol') {
        flushCurrent()
        current = { kind: 'ol', items: [] }
      }
      ;(current as { kind: 'ol'; items: string[] }).items.push(olMatch[1])
      continue
    }

    if (line.trim() === '') {
      flushCurrent()
      continue
    }

    if (current?.kind !== 'paragraph') {
      flushCurrent()
      current = { kind: 'paragraph', lines: [] }
    }
    ;(current as { kind: 'paragraph'; lines: string[] }).lines.push(line)
  }

  // Handle unclosed code fence gracefully (streaming)
  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ kind: 'code-block', language: codeLanguage, code: codeLines.join('\n') })
  }

  flushCurrent()
  return blocks
}

function RenderBlock({ block, isUser, index }: { block: Block; isUser: boolean; index: number }) {
  switch (block.kind) {
    case 'heading':
      return (
        <p
          className={cn(
            'font-semibold',
            block.level === 1 && 'text-base mt-3',
            block.level === 2 && 'text-[0.9375rem] mt-2.5',
            block.level === 3 && 'text-sm mt-2',
            index === 0 && 'mt-0',
          )}
        >
          {renderInline(block.text)}
        </p>
      )
    case 'code-block':
      return <CodeBlock language={block.language} code={block.code} />
    case 'hr':
      return (
        <hr
          className={cn('my-2 border-t', isUser ? 'border-primary-foreground/20' : 'border-border')}
        />
      )
    case 'ul':
      return (
        <ul className={cn('my-1 ml-4 list-disc space-y-0.5', index > 0 && 'mt-2')}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className={cn('my-1 ml-4 list-decimal space-y-0.5', index > 0 && 'mt-2')}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      )
    case 'paragraph':
      return (
        <p className={cn(index > 0 && 'mt-2')}>
          {block.lines.map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {renderInline(line)}
            </span>
          ))}
        </p>
      )
  }
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group/code relative my-2 rounded-lg border bg-muted/50 text-xs">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3 text-muted-foreground" />
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-[11px] leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  // Match: **bold**, *italic*, `code`, [link](url)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10"
        >
          {match[4]}
        </code>,
      )
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={match.index}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary"
        >
          {match[5]}
        </a>,
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}
