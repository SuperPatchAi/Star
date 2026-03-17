"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getFollowUpReminders } from "@/lib/actions/reminders";
import { FeedEntry } from "./feed-entry";
import { PushPermissionBanner } from "./push-permission-banner";
import type { FollowUpReminder, ReminderUrgency } from "@/types/reminders";

type FilterOption = "all" | ReminderUrgency;

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due_today", label: "Due Today" },
  { id: "due_tomorrow", label: "Due Tomorrow" },
  { id: "due_this_week", label: "Due This Week" },
  { id: "overdue", label: "Overdue" },
];

interface ActivityFeedProps {
  onCountChange?: (count: number) => void;
  selectedDate?: Date | null;
}

export function ActivityFeed({ onCountChange, selectedDate }: ActivityFeedProps) {
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("due_today");

  const fetchReminders = useCallback(async () => {
    const { data } = await getFollowUpReminders();
    const list = data ?? [];
    setReminders(list);
    onCountChange?.(list.length);
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleAction = () => {
    fetchReminders();
  };

  const filtered = filter === "all" ? reminders : reminders.filter((r) => r.urgency === filter);

  const grouped: Record<ReminderUrgency, FollowUpReminder[]> = {
    due_today: [],
    due_tomorrow: [],
    due_this_week: [],
    overdue: [],
  };
  for (const r of filtered) {
    grouped[r.urgency].push(r);
  }

  const sectionConfig: { key: ReminderUrgency; label: string; accent: string }[] = [
    { key: "due_today", label: "Due Today", accent: "text-amber-600 dark:text-amber-400" },
    { key: "due_tomorrow", label: "Due Tomorrow", accent: "text-blue-600 dark:text-blue-400" },
    { key: "due_this_week", label: "Due This Week", accent: "text-muted-foreground" },
    { key: "overdue", label: "Overdue", accent: "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="py-16 text-center px-4">
        <Bell className="size-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-base mb-1">All caught up</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No follow-ups due right now. Keep selling!
        </p>
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <MessageSquarePlus className="size-4 mr-1.5" />
            Start New Conversation
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PushPermissionBanner />

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto scrollbar-none">
        {FILTER_OPTIONS.map((opt) => {
          const count =
            opt.id === "all"
              ? reminders.length
              : reminders.filter((r) => r.urgency === opt.id).length;
          return (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                filter === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className="tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reminder list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {sectionConfig.map(({ key, label, accent }) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${accent}`}>
                  {label} <span className="tabular-nums">{items.length}</span>
                </h3>
                <div className="rounded-lg border divide-y divide-border">
                  {items.map((reminder) => (
                    <FeedEntry
                      key={reminder.contact.id}
                      reminder={reminder}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
