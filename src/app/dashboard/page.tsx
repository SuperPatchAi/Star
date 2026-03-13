"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  Trophy,
  XCircle,
  CalendarCheck,
  Clock,
  Plus,
  Bell,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { getDashboardStats, getSalesAnalytics, type DashboardStats, type SalesAnalytics } from "@/lib/actions/contacts";
import { getFollowUpReminders } from "@/lib/actions/reminders";
import { FeedEntry } from "@/components/follow-ups/feed-entry";
import { SALES_STEPS } from "@/types/roadmap";
import type { FollowUpReminder } from "@/types/reminders";
import { cn } from "@/lib/utils";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import { PushPermissionBanner } from "@/components/follow-ups/push-permission-banner";
import { ContactSheet } from "@/components/contacts/contact-sheet";

const STEP_LABELS: Record<string, string> = {};
for (const s of SALES_STEPS) {
  STEP_LABELS[s.id] = s.label;
}
STEP_LABELS["closed"] = "Closed";

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCard({ label, value, icon: Icon, color, href }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className={cn(
      "rounded-lg border p-4 space-y-1 transition-colors",
      href && "hover:bg-muted/50 active:bg-muted cursor-pointer"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        <Icon className={cn("size-4", color)} />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [s, r, a] = await Promise.all([
      getDashboardStats(),
      getFollowUpReminders(),
      getSalesAnalytics(),
    ]);
    setStats(s);
    setAnalytics(a);
    const list = r.data ?? [];
    setReminders(list.filter(rem => rem.urgency === "overdue" || rem.urgency === "due_today"));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4 h-20 bg-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="rounded-lg border p-4 h-48 bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  const stageOrder = SALES_STEPS.filter(s => s.id !== "add_contact").map(s => s.id);
  const maxStageCount = Math.max(1, ...stageOrder.map(s => stats.pipelineCounts[s] || 0));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your sales pipeline at a glance.</p>
        </div>
        <div data-tour-step="new-contact">
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            New Contact
          </Button>
        </div>
      </div>

      {/* Getting Started checklist */}
      <GettingStartedChecklist />

      <PushPermissionBanner />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active" value={stats.totalActive} icon={Users} color="text-primary" href="/contacts" />
        <StatCard label="Won" value={stats.wonCount} icon={Trophy} color="text-green-600 dark:text-green-400" href="/contacts" />
        <StatCard label="Lost" value={stats.lostCount} icon={XCircle} color="text-red-600 dark:text-red-400" href="/contacts" />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={TrendingUp} color="text-primary" href="/contacts" />
      </div>

      {/* Pipeline breakdown */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pipeline</h2>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link href="/contacts">View all</Link>
          </Button>
        </div>
        <div className="space-y-1">
          {stageOrder.map((stepId) => {
            const count = stats.pipelineCounts[stepId] || 0;
            const pct = (count / maxStageCount) * 100;
            return (
              <Link
                key={stepId}
                href="/contacts"
                className="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <span className="text-xs text-muted-foreground w-24 truncate">{STEP_LABELS[stepId] || stepId}</span>
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-xs font-semibold tabular-nums w-6 text-right">{count}</span>
                <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Today's follow-ups */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Bell className="size-3.5" />
            Follow-Ups
          </h2>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link href="/activity">View all</Link>
          </Button>
        </div>
        {reminders.length > 0 ? (
          <div className="rounded-lg border divide-y divide-border">
            {reminders.slice(0, 5).map((r) => (
              <FeedEntry key={r.contact.id} reminder={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center">All caught up. No follow-ups due.</p>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Recent Activity
          </h2>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link href="/contacts">View all</Link>
          </Button>
        </div>
        {stats.recentActivity.length > 0 ? (
          <div className="rounded-lg border divide-y divide-border">
            {stats.recentActivity.map((entry) => (
              <Link
                key={entry.id}
                href={`/contacts?openContact=${entry.id}`}
                className="px-3 py-2.5 flex items-center justify-between transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {STEP_LABELS[entry.step] || entry.step}
                    {entry.outcome !== "pending" && (
                      <span className={cn(
                        "ml-1.5",
                        entry.outcome === "won" && "text-green-600 dark:text-green-400",
                        entry.outcome === "lost" && "text-red-600 dark:text-red-400",
                      )}>
                        · {entry.outcome}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{getTimeAgo(entry.updatedAt)}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center">No activity yet.</p>
        )}
      </div>

      {/* Sales Analytics */}
      {analytics && (analytics.topWinningQuestions.length > 0 || analytics.topLostObjections.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* What's Working */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="size-3.5 text-green-600 dark:text-green-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s Working</h2>
            </div>
            {analytics.topWinningQuestions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Top questions in won deals</p>
                <ul className="space-y-1">
                  {analytics.topWinningQuestions.slice(0, 3).map((q, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <span className="font-semibold text-green-600 dark:text-green-400 shrink-0">{q.count}x</span>
                      <span className="text-foreground truncate">{q.question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analytics.openingWinRates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Best opening approach</p>
                <p className="text-sm font-medium">{analytics.openingWinRates[0].approach} <span className="text-green-600 dark:text-green-400">({analytics.openingWinRates[0].rate}% win rate)</span></p>
              </div>
            )}
            {analytics.closingWinRates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Best closing technique</p>
                <p className="text-sm font-medium">{analytics.closingWinRates[0].technique} <span className="text-green-600 dark:text-green-400">({analytics.closingWinRates[0].rate}% win rate)</span></p>
              </div>
            )}
          </div>

          {/* Watch Out */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Watch Out</h2>
            </div>
            {analytics.topLostObjections.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Top objections in lost deals</p>
                <ul className="space-y-1">
                  {analytics.topLostObjections.slice(0, 3).map((o, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <span className="font-semibold text-red-600 dark:text-red-400 shrink-0">{o.count}x</span>
                      <span className="text-foreground truncate">{o.objection}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No lost deal data yet.</p>
            )}
            {analytics.openingWinRates.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lowest performing opening</p>
                <p className="text-sm font-medium">{analytics.openingWinRates[analytics.openingWinRates.length - 1].approach} <span className="text-red-600 dark:text-red-400">({analytics.openingWinRates[analytics.openingWinRates.length - 1].rate}% win rate)</span></p>
              </div>
            )}
          </div>

          {/* Discovery Depth */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discovery Depth</h2>
            </div>
            <p className="text-xs text-muted-foreground">Average questions asked</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Won deals</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{analytics.avgQuestionsWon}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, (analytics.avgQuestionsWon / Math.max(analytics.avgQuestionsWon, analytics.avgQuestionsLost, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Lost deals</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{analytics.avgQuestionsLost}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${Math.min(100, (analytics.avgQuestionsLost / Math.max(analytics.avgQuestionsWon, analytics.avgQuestionsLost, 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This Week" value={stats.contactsThisWeek} icon={CalendarCheck} color="text-primary" href="/contacts" />
        <StatCard label="Active Conversations" value={stats.totalActive} icon={Users} color="text-primary" href="/contacts" />
      </div>

      <ContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={null}
        onSaved={loadData}
      />
    </div>
  );
}
