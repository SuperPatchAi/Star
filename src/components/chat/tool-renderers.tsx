'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import {
  User,
  Phone,
  Mail,
  Loader2,
  Package,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Trophy,
  Search,
  FlaskConical,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { products } from '@/data/products'

// ---------------------------------------------------------------------------
// Shared types and helpers
// ---------------------------------------------------------------------------

export interface ToolRendererProps {
  input: Record<string, unknown>
  output: unknown
  state: string
}

function parseOutput(output: unknown): Record<string, unknown> | unknown[] | null {
  if (output == null) return null
  if (typeof output === 'object') return output as Record<string, unknown>
  if (typeof output === 'string') {
    try {
      return JSON.parse(output)
    } catch {
      return null
    }
  }
  return null
}

function LoadingShell({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="my-2 rounded-xl border bg-card p-3 text-xs shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
      <span className="text-destructive">{message}</span>
    </div>
  )
}

const PIPELINE_STEPS = [
  { id: 'add_contact', label: 'Contact' },
  { id: 'opening', label: 'Opening' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'presentation', label: 'Present' },
  { id: 'samples', label: 'Samples' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'closing', label: 'Closing' },
  { id: 'objections', label: 'Objections' },
  { id: 'purchase_links', label: 'Purchase' },
]

function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <Badge
      variant={outcome === 'won' ? 'default' : outcome === 'lost' ? 'destructive' : 'secondary'}
      className={cn(
        'text-[10px]',
        outcome === 'won' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        outcome === 'pending' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      )}
    >
      {outcome}
    </Badge>
  )
}

function ProductBadges({ productIds }: { productIds: string[] }) {
  if (!productIds?.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {productIds.map((pid) => {
        const p = products.find((pr) => pr.id === pid)
        return (
          <span
            key={pid}
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            style={{
              backgroundColor: p ? `${p.color}20` : undefined,
              color: p?.color ?? undefined,
            }}
          >
            {p?.emoji} {p?.name ?? pid}
          </span>
        )
      })}
    </div>
  )
}

function PipelineDots({ currentStep }: { currentStep: string }) {
  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.id === currentStep)
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STEPS.map((step, i) => (
        <div
          key={step.id}
          title={step.label}
          className={cn(
            'size-1.5 rounded-full transition-colors',
            i < currentIdx && 'bg-primary/60',
            i === currentIdx && 'bg-primary ring-1 ring-primary/30 ring-offset-1',
            i > currentIdx && 'bg-muted-foreground/20',
          )}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. Contact Card
// ---------------------------------------------------------------------------

function ContactCardRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Looking up contact..." />
  }

  const data = parseOutput(output)
  if (!data || Array.isArray(data)) return null
  if ((data as Record<string, unknown>).error) {
    return <ErrorBanner message={String((data as Record<string, unknown>).error)} />
  }

  const d = data as Record<string, unknown>
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown'
  const phone = d.phone as string | null
  const email = d.email as string | null
  const step = (d.current_step as string) ?? ''
  const outcome = (d.outcome as string) ?? 'pending'
  const pids = (d.product_ids as string[]) ?? []
  const stepLabel = PIPELINE_STEPS.find((s) => s.id === step)?.label ?? step

  return (
    <div className="my-2 rounded-xl border bg-card p-3 text-xs shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{stepLabel}</Badge>
              <OutcomeBadge outcome={outcome} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Phone className="size-3" />
            {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-foreground truncate">
            <Mail className="size-3" />
            {email}
          </a>
        )}
      </div>

      {pids.length > 0 && (
        <div className="mt-2">
          <ProductBadges productIds={pids} />
        </div>
      )}

      <div className="mt-2.5">
        <PipelineDots currentStep={step} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contact List Card
// ---------------------------------------------------------------------------

function ContactListRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Searching contacts..." />
  }

  const data = parseOutput(output)
  if (!data) return null
  const arr = Array.isArray(data) ? data : []
  if (arr.length === 1 && (arr[0] as Record<string, unknown>)?.error) {
    return <ErrorBanner message={String((arr[0] as Record<string, unknown>).error)} />
  }
  if (arr.length === 0) {
    return (
      <div className="my-2 rounded-xl border bg-card p-3 text-xs text-muted-foreground shadow-sm">
        No contacts found matching that filter.
      </div>
    )
  }

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm">
      <div className="border-b px-3 py-2 text-[11px] font-medium text-muted-foreground">
        Found {arr.length} contact{arr.length !== 1 ? 's' : ''}
      </div>
      <div className="divide-y">
        {arr.slice(0, 8).map((item, i) => {
          const d = item as Record<string, unknown>
          const name = [d.first_name, d.last_name].filter(Boolean).join(' ')
          const step = PIPELINE_STEPS.find((s) => s.id === d.current_step)?.label ?? String(d.current_step ?? '')
          const outcome = String(d.outcome ?? 'pending')
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-muted">
                  <User className="size-3 text-muted-foreground" />
                </div>
                <span className="font-medium">{name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px]">{step}</Badge>
                <OutcomeBadge outcome={outcome} />
              </div>
            </div>
          )
        })}
        {arr.length > 8 && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground">
            +{arr.length - 8} more
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Product Card
// ---------------------------------------------------------------------------

function ProductCardRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Loading product info..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.error) {
    const available = data.available_products as string[] | undefined
    return (
      <div className="my-2 rounded-xl border bg-card p-3 text-xs shadow-sm">
        <ErrorBanner message={String(data.error)} />
        {available && available.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {available.map((pid) => {
              const p = products.find((pr) => pr.id === pid)
              return (
                <Badge key={pid} variant="outline" className="text-[10px]">
                  {p?.emoji} {p?.name ?? pid}
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const productName = String(data.product ?? '')
  const p = products.find((pr) => pr.name === productName || pr.id === productName.toLowerCase())
  const category = String(data.category ?? '')
  const tagline = String(data.tagline ?? '')
  const benefits = (data.benefits as string[]) ?? []
  const hasClinical = p?.hasClinicalStudy ?? false
  const studyName = p?.studyName ?? ''

  return (
    <div
      className="my-2 rounded-xl border bg-card shadow-sm overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: p?.color ?? '#888' }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">{p?.emoji}</span>
              <span className="text-sm font-semibold">{productName}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-[10px] capitalize">{category}</Badge>
            {hasClinical && (
              <Badge variant="outline" className="gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                <FlaskConical className="size-2.5" />
                {studyName}
              </Badge>
            )}
          </div>
        </div>

        {benefits.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Pipeline Stats Card
// ---------------------------------------------------------------------------

function PipelineStatsRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Loading dashboard stats..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.error) return <ErrorBanner message={String(data.error)} />

  const total = Number(data.total_contacts ?? 0)
  const pending = Number(data.pending_follow_ups ?? 0)
  const outcomes = (data.contacts_per_outcome ?? {}) as Record<string, number>
  const won = outcomes.won ?? 0
  const lost = outcomes.lost ?? 0
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0
  const perStep = (data.contacts_per_step ?? {}) as Record<string, number>
  const maxStep = Math.max(1, ...Object.values(perStep))

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-3 divide-x border-b">
        <StatTile label="Total Contacts" value={total} />
        <StatTile label="Follow-ups Due" value={pending} highlight={pending > 0} />
        <StatTile label="Win Rate" value={`${winRate}%`} />
      </div>

      <div className="p-3">
        <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pipeline</p>
        <div className="space-y-1.5">
          {PIPELINE_STEPS.map((step) => {
            const count = perStep[step.id] ?? 0
            const pct = maxStep > 0 ? (count / maxStep) * 100 : 0
            return (
              <div key={step.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 text-right text-muted-foreground truncate">{step.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-5 text-right font-medium">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-3 py-2">
        <span className="text-[10px] text-muted-foreground">Outcomes:</span>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]">
          Won {won}
        </Badge>
        <Badge variant="destructive" className="text-[10px]">Lost {lost}</Badge>
        <Badge variant="secondary" className="text-[10px]">Pending {outcomes.pending ?? 0}</Badge>
      </div>
    </div>
  )
}

function StatTile({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className={cn('text-lg font-bold', highlight && 'text-amber-600 dark:text-amber-400')}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Sales Analytics Card
// ---------------------------------------------------------------------------

function AnalyticsRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Analyzing sales data..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.error) return <ErrorBanner message={String(data.error)} />

  const openingDist = (data.opening_distribution ?? {}) as Record<string, number>
  const closingDist = (data.closing_distribution ?? {}) as Record<string, number>
  const objections = (data.common_objections ?? {}) as Record<string, number>
  const questions = (data.common_questions ?? {}) as Record<string, number>

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm divide-y">
      <DistributionBar title="Opening Approach" data={openingDist} />
      <DistributionBar title="Closing Techniques" data={closingDist} />
      <RankedList title="Top Objections" data={objections} icon={<AlertCircle className="size-3 text-amber-500" />} />
      <RankedList title="Top Questions" data={questions} icon={<Search className="size-3 text-blue-500" />} />
    </div>
  )
}

function DistributionBar({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return null
  const colors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

  return (
    <div className="p-3">
      <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="flex h-3 overflow-hidden rounded-full">
        {entries.map(([key, val], i) => (
          <div
            key={key}
            className={cn('h-full', colors[i % colors.length])}
            style={{ width: `${(val / total) * 100}%` }}
            title={`${key}: ${val}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map(([key, val], i) => (
          <span key={key} className="flex items-center gap-1 text-[10px]">
            <span className={cn('inline-block size-2 rounded-full', colors[i % colors.length])} />
            {key} ({Math.round((val / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

function RankedList({ title, data, icon }: { title: string; data: Record<string, number>; icon: ReactNode }) {
  const entries = Object.entries(data).slice(0, 3)
  if (entries.length === 0) return null

  return (
    <div className="p-3">
      <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="space-y-1.5">
        {entries.map(([key, count], i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="flex-1 line-clamp-2">{key}</span>
            <Badge variant="secondary" className="text-[9px] shrink-0">{count}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 5. Follow-up Reminders Card
// ---------------------------------------------------------------------------

function FollowUpRemindersRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Checking reminders..." />
  }

  const data = parseOutput(output)
  if (!data) return null
  const arr = Array.isArray(data) ? data : []
  if (arr.length === 1 && (arr[0] as Record<string, unknown>)?.error) {
    return <ErrorBanner message={String((arr[0] as Record<string, unknown>).error)} />
  }

  if (arr.length === 0) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-xl border bg-card p-3 text-xs shadow-sm">
        <CheckCircle2 className="size-4 text-emerald-500" />
        <span className="text-muted-foreground">No follow-ups due right now.</span>
      </div>
    )
  }

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Calendar className="size-3.5 text-amber-500" />
        <span className="text-[11px] font-medium">{arr.length} follow-up{arr.length !== 1 ? 's' : ''} due</span>
      </div>
      <div className="divide-y">
        {arr.map((item, i) => {
          const d = item as Record<string, unknown>
          const name = [d.first_name, d.last_name].filter(Boolean).join(' ')
          const day = d.follow_up_day as number | null
          const phone = d.phone as string | null
          const pids = (d.product_ids as string[]) ?? []
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">{name}</span>
                {day != null && (
                  <Badge variant="secondary" className="text-[9px]">Day {day}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ProductBadges productIds={pids} />
                {phone && (
                  <a href={`tel:${phone}`} className="text-muted-foreground hover:text-foreground">
                    <Phone className="size-3" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 6. Coaching Renderers
// ---------------------------------------------------------------------------

function SkillDefinitionRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Loading skill..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.status === 'not_found') {
    return <ErrorBanner message={String(data.message ?? 'Skill not found')} />
  }

  const skill = (data.skill ?? {}) as Record<string, unknown>
  const name = String(skill.name ?? data.skill_id ?? '')
  const program = String(skill.program ?? '')
  const phase = skill.phase as number | undefined
  const week = skill.week as number | undefined
  const questions = (skill.questions as unknown[]) ?? []
  const prerequisites = (skill.prerequisites as string[]) ?? []
  const actions = (skill.actions as string[]) ?? []

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm">
      <div className="border-b p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[9px]">{program.replace(/_/g, ' ')}</Badge>
                {phase != null && <span className="text-[10px] text-muted-foreground">Phase {phase}{week != null ? `, Week ${week}` : ''}</span>}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">{questions.length} questions</Badge>
        </div>
      </div>

      {prerequisites.length > 0 && (
        <div className="border-b px-3 py-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Prerequisites</p>
          <div className="flex flex-wrap gap-1">
            {prerequisites.map((p) => (
              <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Action Items</p>
          <ul className="space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <Target className="mt-0.5 size-3 shrink-0 text-primary" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ScoreResultRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Computing score..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.status === 'not_found' || data.status === 'no_rubric' || data.status === 'unknown_rubric') {
    return <ErrorBanner message={String(data.message ?? 'Could not score')} />
  }

  const skillName = String(data.skill_name ?? '')
  const type = String(data.type ?? '')

  if (type === 'ladder') {
    const levels = ['Survival', 'Status', 'Freedom', 'Purpose']
    const currentLevel = String(data.current_level ?? '')
    const currentIdx = levels.indexOf(currentLevel)
    return (
      <div className="my-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-primary" />
          <span className="text-sm font-semibold">{skillName}</span>
        </div>
        <div className="flex items-end gap-1">
          {levels.map((level, i) => (
            <div key={level} className="flex-1 text-center">
              <div
                className={cn(
                  'mx-auto rounded-md transition-all',
                  i <= currentIdx ? 'bg-primary' : 'bg-muted',
                )}
                style={{ height: `${(i + 1) * 12}px` }}
              />
              <span className={cn(
                'mt-1 block text-[9px]',
                i === currentIdx ? 'font-bold text-primary' : 'text-muted-foreground',
              )}>
                {level}
              </span>
            </div>
          ))}
        </div>
        {typeof data.income_range === 'string' && (
          <p className="mt-2 text-xs text-muted-foreground">{data.income_range}</p>
        )}
      </div>
    )
  }

  if (type === 'scale') {
    const pct = Number(data.overall_pct ?? 0)
    const interpretation = String(data.interpretation ?? '')
    return (
      <div className="my-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="size-4 text-primary" />
          <span className="text-sm font-semibold">{skillName}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{Math.round(pct)}%</span>
          <Badge variant="secondary" className="text-[10px]">{interpretation}</Badge>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
        {data.dimension_scores != null && typeof data.dimension_scores === 'object' && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {Object.entries(data.dimension_scores as Record<string, number>).map(([dim, score]) => (
              <div key={dim} className="text-[10px] text-muted-foreground">
                {dim}: <span className="font-medium text-foreground">{Math.round(score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === 'ratio') {
    const target = String(data.target_ratio ?? '')
    const actual = String(data.actual_ratio ?? '')
    const alignment = Number(data.alignment_score ?? 0)
    const interpretation = String(data.interpretation ?? '')
    return (
      <div className="my-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="size-4 text-primary" />
          <span className="text-sm font-semibold">{skillName}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground">Target</p>
            <p className="font-bold text-sm">{target}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Actual</p>
            <p className="font-bold text-sm">{actual}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Alignment</p>
            <p className="font-bold text-sm">{alignment}%</p>
          </div>
        </div>
        <Badge
          variant={interpretation === 'Well-Aligned' ? 'default' : 'destructive'}
          className={cn('mt-2 text-[10px]', interpretation === 'Well-Aligned' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400')}
        >
          {interpretation}
        </Badge>
      </div>
    )
  }

  return <ErrorBanner message={`Unknown scoring type: ${type}`} />
}

function CoachingProgressRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Loading progress..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.error) return <ErrorBanner message={String(data.error)} />
  if (data.message && (data.completed_skills as string[])?.length === 0) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-xl border bg-card p-3 text-xs shadow-sm text-muted-foreground">
        <BookOpen className="size-4" />
        {String(data.message)}
      </div>
    )
  }

  const program = String(data.program ?? '')
  const phase = data.current_phase as number | null
  const completed = (data.completed_skills as string[]) ?? []
  const skillOutputs = (data.skill_outputs ?? {}) as Record<string, unknown>
  const totalSkills = Object.keys(skillOutputs).length || completed.length || 1
  const pct = Math.round((completed.length / Math.max(totalSkills, completed.length)) * 100)

  return (
    <div className="my-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="size-4 text-primary" />
        <span className="text-sm font-semibold">{program.replace(/_/g, ' ')}</span>
        {phase != null && <Badge variant="secondary" className="text-[9px]">Phase {phase}</Badge>}
      </div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-lg font-bold">{pct}%</span>
        <span className="text-xs text-muted-foreground">{completed.length} skills completed</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}

function SkillCompletionRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Saving progress..." />
  }

  const data = parseOutput(output) as Record<string, unknown> | null
  if (!data) return null
  if (data.error) return <ErrorBanner message={String(data.error)} />

  const completed = (data.completed_skills as string[]) ?? []

  return (
    <div className="my-2 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs shadow-sm">
      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Skill saved!</p>
        <p className="text-muted-foreground">{completed.length} skill{completed.length !== 1 ? 's' : ''} completed total</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7. Search Results Card
// ---------------------------------------------------------------------------

function SearchResultsRenderer({ output, state }: ToolRendererProps) {
  if (state !== 'output-available' && state !== 'result') {
    return <LoadingShell label="Searching scripts..." />
  }

  const data = parseOutput(output)
  const arr = Array.isArray(data) ? data : []
  if (arr.length === 0) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-xl border bg-card p-3 text-xs shadow-sm text-muted-foreground">
        <Search className="size-3.5" />
        No matching scripts found.
      </div>
    )
  }

  return (
    <div className="my-2 rounded-xl border bg-card shadow-sm divide-y">
      {arr.slice(0, 5).map((item, i) => (
        <SearchResultItem key={i} item={item as Record<string, unknown>} />
      ))}
    </div>
  )
}

function SearchResultItem({ item }: { item: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const content = String(item.content ?? '')
  const source = String(item.source_id ?? '')
  const contentType = String(item.content_type ?? '')
  const similarity = Number(item.similarity ?? 0)
  const truncated = content.length > 200 ? content.slice(0, 200) + '...' : content

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant="outline" className="text-[9px]">{contentType}</Badge>
        <Badge variant="secondary" className="text-[9px]">{source}</Badge>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary/60" style={{ width: `${similarity * 100}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{Math.round(similarity * 100)}%</span>
        </div>
      </div>
      <p className="text-xs whitespace-pre-wrap">{expanded ? content : truncated}</p>
      {content.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wire all renderers
// ---------------------------------------------------------------------------

export const TOOL_RENDERERS: Record<string, ComponentType<ToolRendererProps>> = {
  get_contact: ContactCardRenderer,
  list_contacts_by_filter: ContactListRenderer,
  get_dashboard_stats: PipelineStatsRenderer,
  get_sales_analytics: AnalyticsRenderer,
  get_product_info: ProductCardRenderer,
  get_follow_up_reminders: FollowUpRemindersRenderer,
  search_scripts: SearchResultsRenderer,
  advance_contact_step: ContactCardRenderer,
  advance_follow_up_day: ContactCardRenderer,
  update_contact_fields: ContactCardRenderer,
  load_skill_definition: SkillDefinitionRenderer,
  compute_assessment_score: ScoreResultRenderer,
  get_coaching_progress: CoachingProgressRenderer,
  save_skill_completion: SkillCompletionRenderer,
}
