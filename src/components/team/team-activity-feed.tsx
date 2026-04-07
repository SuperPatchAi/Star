"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Activity,
  UserPlus,
  ArrowRight,
  Package,
  PackageCheck,
  CalendarCheck,
  Trophy,
} from "lucide-react";
import type { TeamActivityEvent } from "@/lib/db/types";

interface TeamActivityFeedProps {
  events: TeamActivityEvent[];
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  contact_created: UserPlus,
  step_changed: ArrowRight,
  sample_sent: Package,
  sample_confirmed: PackageCheck,
  followup_completed: CalendarCheck,
  outcome_changed: Trophy,
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function TeamActivityFeed({ events }: TeamActivityFeedProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-primary" />
          Team Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No team activity yet. Activity will appear here as your team uses
            S.T.A.R.
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto -mx-6">
            <div className="divide-y divide-border">
              {events.map((event, i) => {
                const Icon = EVENT_ICONS[event.event_type] ?? Activity;
                return (
                  <div
                    key={`${event.created_at}-${i}`}
                    className="flex items-start gap-3 px-6 py-3"
                  >
                    <div className="mt-0.5 shrink-0 rounded-full bg-muted p-1.5">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{event.member_name}</span>{" "}
                        <span className="text-muted-foreground">
                          {event.description}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {getRelativeTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
