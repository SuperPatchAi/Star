"use client";

import Link from "next/link";
import {
  UserPlus,
  ArrowRight,
  Package,
  CheckCircle2,
  CalendarCheck,
  Trophy,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityEventType } from "@/types/activity";
import { EVENT_LABELS } from "@/types/activity";

interface ActivityEventEntryProps {
  event: ActivityEvent;
}

const EVENT_ICONS: Record<ActivityEventType, React.ElementType> = {
  contact_created: UserPlus,
  step_changed: ArrowRight,
  sample_sent: Package,
  sample_confirmed: CheckCircle2,
  followup_completed: CalendarCheck,
  outcome_changed: Trophy,
};

const EVENT_COLORS: Record<ActivityEventType, string> = {
  contact_created: "text-blue-500",
  step_changed: "text-violet-500",
  sample_sent: "text-amber-500",
  sample_confirmed: "text-green-500",
  followup_completed: "text-emerald-500",
  outcome_changed: "text-primary",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getEventDescription(event: ActivityEvent): string {
  const m = event.metadata as Record<string, unknown>;
  const name = (m.contact_name as string) || "Contact";

  switch (event.event_type) {
    case "contact_created":
      return `${name} was added`;
    case "step_changed": {
      const to = (m.to_step as string) || "next step";
      return `${name} moved to ${to.replace(/_/g, " ")}`;
    }
    case "sample_sent":
      return `Samples sent to ${name}`;
    case "sample_confirmed":
      return `${name} confirmed samples received`;
    case "followup_completed": {
      const dayIdx = m.day_index as number | undefined;
      return dayIdx !== undefined
        ? `Day ${dayIdx + 1} follow-up completed for ${name}`
        : `Follow-up completed for ${name}`;
    }
    case "outcome_changed": {
      const outcome = m.outcome as string;
      if (outcome === "won") return `${name} marked as Won`;
      if (outcome === "lost") return `${name} marked as Lost`;
      if (outcome === "follow_up") return `${name} set to re-engage`;
      return `${name} outcome updated`;
    }
    default:
      return `Activity for ${name}`;
  }
}

function getOutcomeIcon(outcome: unknown): React.ElementType {
  if (outcome === "won") return Trophy;
  if (outcome === "lost") return XCircle;
  if (outcome === "follow_up") return RotateCcw;
  return Trophy;
}

function getOutcomeColor(outcome: unknown): string {
  if (outcome === "won") return "text-green-500";
  if (outcome === "lost") return "text-destructive";
  if (outcome === "follow_up") return "text-amber-500";
  return "text-primary";
}

export function ActivityEventEntry({ event }: ActivityEventEntryProps) {
  const isOutcome = event.event_type === "outcome_changed";
  const outcome = isOutcome ? (event.metadata as Record<string, unknown>).outcome : null;

  const Icon = isOutcome ? getOutcomeIcon(outcome) : EVENT_ICONS[event.event_type];
  const colorClass = isOutcome ? getOutcomeColor(outcome) : EVENT_COLORS[event.event_type];

  const description = getEventDescription(event);
  const relTime = formatRelativeTime(event.created_at);

  const content = (
    <div className="flex items-start gap-3 px-3 py-3 group">
      <div className="shrink-0 mt-0.5">
        <Icon className={cn("size-5", colorClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {EVENT_LABELS[event.event_type]}
          </span>
          <span className="text-[11px] text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground">{relTime}</span>
        </div>
      </div>
    </div>
  );

  if (event.contact_id) {
    return (
      <Link
        href={`/contacts?openContact=${event.contact_id}`}
        className="block hover:bg-muted/40 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return content;
}
