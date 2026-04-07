"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Contact, Activity } from "lucide-react";
import type { TeamOverview } from "@/lib/db/types";

interface TeamOverviewCardsProps {
  overview: TeamOverview | null;
}

const stats = [
  {
    key: "team_size" as const,
    label: "Team Size",
    icon: Users,
    color: "text-primary",
    format: (v: number) => String(v),
  },
  {
    key: "win_rate" as const,
    label: "Win Rate",
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    format: (v: number) => `${v}%`,
  },
  {
    key: "total_contacts" as const,
    label: "Total Contacts",
    icon: Contact,
    color: "text-blue-600 dark:text-blue-400",
    format: (v: number) => String(v),
  },
  {
    key: "active_follow_ups" as const,
    label: "Active Follow-Ups",
    icon: Activity,
    color: "text-amber-600 dark:text-amber-400",
    format: (v: number) => String(v),
  },
] as const;

export function TeamOverviewCards({ overview }: TeamOverviewCardsProps) {
  if (!overview || overview.team_size === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">
          No connected team members yet
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Sync your downline and invite reps to see team stats here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(({ key, label, icon: Icon, color, format }) => (
        <Card key={key} className="py-4">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {label}
              </span>
              <Icon className={`size-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {format(overview[key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
