'use client'

import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DataPartSchemas } from './types'

interface DataRendererProps<T> {
  data: T
}

function CoachingQuestionRenderer({ data }: DataRendererProps<DataPartSchemas['coaching-question']>) {
  return (
    <div className="my-1 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">Question</Badge>
        <span className="text-[10px] text-muted-foreground">{data.type}</span>
      </div>
      <p className="font-medium">{data.text}</p>
      {data.options && data.options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {data.options.map((opt) => (
            <li key={opt.value} className="text-muted-foreground text-xs">
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScoreResultRenderer({ data }: DataRendererProps<DataPartSchemas['score-result']>) {
  return (
    <div className="my-1 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="default" className="text-[10px]">Score</Badge>
        <span className="text-[10px] text-muted-foreground">{data.scoringType}</span>
      </div>
      {data.level && (
        <p className="text-base font-semibold">{data.level}</p>
      )}
      {data.score != null && (
        <p className="text-muted-foreground text-xs">Score: {data.score}</p>
      )}
      <p className="mt-1">{data.interpretation}</p>
      {data.populationPct != null && (
        <p className="text-muted-foreground text-xs mt-1">
          Top {data.populationPct}% of population
        </p>
      )}
    </div>
  )
}

function PrerequisiteBlockedRenderer({ data }: DataRendererProps<DataPartSchemas['prerequisite-blocked']>) {
  return (
    <div className="my-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="mb-2">
        <Badge variant="destructive" className="text-[10px]">Prerequisite Required</Badge>
      </div>
      <p className="text-muted-foreground text-xs mb-1">
        Complete these skills first:
      </p>
      <ul className="space-y-0.5">
        {data.missingSkills.map((skill) => (
          <li key={skill.id} className="text-sm font-medium">
            {skill.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkillProgressRenderer({ data }: DataRendererProps<DataPartSchemas['skill-progress']>) {
  const pct = data.totalCount > 0
    ? Math.round((data.completedCount / data.totalCount) * 100)
    : 0
  return (
    <div className="my-1 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">Progress</Badge>
        <span className="text-[10px] text-muted-foreground">{data.program}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{pct}%</span>
        <span className="text-muted-foreground text-xs">
          {data.completedCount}/{data.totalCount} skills &middot; Phase {data.currentPhase}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {data.nextSkill && (
        <p className="mt-2 text-xs text-muted-foreground">
          Next: <span className="font-medium text-foreground">{data.nextSkill.name}</span>
        </p>
      )}
    </div>
  )
}

export const DATA_RENDERERS: Record<string, ComponentType<{ data: unknown }>> = {
  'coaching-question': CoachingQuestionRenderer as ComponentType<{ data: unknown }>,
  'score-result': ScoreResultRenderer as ComponentType<{ data: unknown }>,
  'prerequisite-blocked': PrerequisiteBlockedRenderer as ComponentType<{ data: unknown }>,
  'skill-progress': SkillProgressRenderer as ComponentType<{ data: unknown }>,
}
