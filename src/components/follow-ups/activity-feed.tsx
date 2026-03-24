"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getUnifiedFeed } from "@/lib/actions/activity";
import { getFollowUpReminders } from "@/lib/actions/reminders";
import { FeedEntry } from "./feed-entry";
import { ActivityEventEntry } from "./activity-event-entry";
import { PushPermissionBanner } from "./push-permission-banner";
import type { UnifiedFeedItem, TimeBucket } from "@/types/activity";
import { getItemBucket } from "@/types/activity";

type FilterOption = "all" | TimeBucket;

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "this_week", label: "This Week" },
  { id: "older", label: "Older" },
];

const SECTION_CONFIG: { key: TimeBucket; label: string; accent: string }[] = [
  { key: "overdue", label: "Overdue", accent: "text-destructive" },
  { key: "today", label: "Today", accent: "text-amber-600 dark:text-amber-400" },
  { key: "upcoming", label: "Upcoming", accent: "text-violet-600 dark:text-violet-400" },
  { key: "this_week", label: "This Week", accent: "text-blue-600 dark:text-blue-400" },
  { key: "older", label: "Older", accent: "text-muted-foreground" },
];

interface ActivityFeedProps {
  mode?: "all" | "reminders-only";
  selectedDate?: Date | null;
  onCountChange?: (count: number) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ActivityFeed({ mode = "all", selectedDate, onCountChange }: ActivityFeedProps) {
  const [items, setItems] = useState<UnifiedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");

  const fetchFeed = useCallback(async () => {
    let feedItems: UnifiedFeedItem[];

    if (mode === "reminders-only") {
      const { data } = await getFollowUpReminders();
      feedItems = (data ?? []).map((r) => ({
        kind: "reminder" as const,
        data: r,
        timestamp: r.dueDate,
      }));
    } else {
      const feedResult = await getUnifiedFeed();
      feedItems = feedResult.data ?? [];
    }

    setItems(feedItems);
    const reminderCount = feedItems.filter((i) => i.kind === "reminder").length;
    onCountChange?.(reminderCount);
    setLoading(false);
  }, [mode, onCountChange]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleAction = () => {
    fetchFeed();
  };

  const bucketFiltered =
    filter === "all"
      ? items
      : items.filter((item) => getItemBucket(item) === filter);

  const filtered = selectedDate
    ? bucketFiltered.filter((item) => isSameDay(new Date(item.timestamp), selectedDate))
    : bucketFiltered;

  const grouped: Record<TimeBucket, UnifiedFeedItem[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    this_week: [],
    older: [],
  };
  for (const item of filtered) {
    grouped[getItemBucket(item)].push(item);
  }

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

  if (items.length === 0) {
    return (
      <div className="py-16 text-center px-4">
        <Bell className="size-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-base mb-1">No activity yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add a contact to start tracking your sales activity.
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
    <div className="flex flex-col h-full min-h-0">
      <PushPermissionBanner />

      <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto scrollbar-none">
        {FILTER_OPTIONS.map((opt) => {
          const count =
            opt.id === "all"
              ? items.length
              : items.filter((i) => getItemBucket(i) === opt.id).length;
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
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-5">
          {SECTION_CONFIG.map(({ key, label, accent }) => {
            const sectionItems = grouped[key];
            if (sectionItems.length === 0) return null;
            return (
              <div key={key}>
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${accent}`}
                >
                  {label}{" "}
                  <span className="tabular-nums">{sectionItems.length}</span>
                </h3>
                <div className="rounded-lg border divide-y divide-border">
                  {sectionItems.map((item, idx) => {
                    if (item.kind === "reminder") {
                      return (
                        <FeedEntry
                          key={`r-${item.data.contact.id}-${item.data.followUpDayIndex ?? idx}`}
                          reminder={item.data}
                          onAction={handleAction}
                        />
                      );
                    }
                    return (
                      <ActivityEventEntry
                        key={`e-${item.data.id}`}
                        event={item.data}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
