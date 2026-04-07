"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Trophy,
  XCircle,
  Clock,
  Package,
  Activity,
  Loader2,
} from "lucide-react";
import { getTeamMemberStats } from "@/lib/actions/team";
import type { MemberStats } from "@/lib/db/types";

interface MemberCoachingDrawerProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_LABELS: Record<string, string> = {
  add_contact: "Add Contact",
  rapport: "Rapport",
  discovery: "Discovery",
  samples: "Samples",
  followup: "Follow-Up",
  close: "Close",
  purchase_links: "Purchase Links",
  closed: "Closed",
};

function StatRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function MemberCoachingDrawer({
  memberId,
  open,
  onOpenChange,
}: MemberCoachingDrawerProps) {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setStats(null);
    const { data, error: fetchError } = await getTeamMemberStats(id);
    if (fetchError || !data) {
      setError(fetchError || "Failed to load member stats");
    } else {
      setStats(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open && memberId) {
      fetchStats(memberId);
    }
  }, [open, memberId, fetchStats]);

  const stepEntries = stats
    ? Object.entries(stats.current_steps).sort(
        ([, a], [, b]) => b - a
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {loading
              ? "Loading..."
              : stats?.member_name || "Team Member"}
          </SheetTitle>
          <SheetDescription>
            {stats?.rank ? (
              <Badge variant="secondary">{stats.rank}</Badge>
            ) : (
              "Member details and performance"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {stats && !loading && (
            <>
              <div className="divide-y divide-border">
                <StatRow
                  icon={Users}
                  label="Total Contacts"
                  value={stats.total_contacts}
                  color="text-primary"
                />
                <StatRow
                  icon={Trophy}
                  label="Won"
                  value={stats.won}
                  color="text-green-600 dark:text-green-400"
                />
                <StatRow
                  icon={XCircle}
                  label="Lost"
                  value={stats.lost}
                  color="text-red-600 dark:text-red-400"
                />
                <StatRow
                  icon={Clock}
                  label="Pending"
                  value={stats.pending}
                  color="text-amber-600 dark:text-amber-400"
                />
                <StatRow
                  icon={Package}
                  label="Samples Sent"
                  value={stats.samples_sent}
                  color="text-blue-600 dark:text-blue-400"
                />
                <StatRow
                  icon={Activity}
                  label="Active Follow-Ups"
                  value={stats.active_follow_ups}
                  color="text-primary"
                />
              </div>

              {stepEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Step Distribution
                  </h3>
                  <div className="space-y-2">
                    {stepEntries.map(([step, count]) => {
                      const max = Math.max(
                        ...Object.values(stats.current_steps)
                      );
                      const pct = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <div key={step} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {STEP_LABELS[step] || step}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.last_activity_at && (
                <p className="text-xs text-muted-foreground text-center">
                  Last active:{" "}
                  {new Date(stats.last_activity_at).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
