"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ActivityFeed } from "./activity-feed";
import { getFollowUpReminderCount } from "@/lib/actions/reminders";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const n = await getFollowUpReminderCount();
      setCount(n);
    } catch {
      // silently ignore auth/network errors
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchCount]);

  const handleCountChange = useCallback((newCount: number) => {
    setCount(newCount);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 min-h-[44px] min-w-[44px] shrink-0"
          aria-label={`Follow-up reminders${count > 0 ? ` (${count})` : ""}`}
        >
          <Bell
            className={cn(
              "size-5 transition-colors",
              count > 0 && "text-primary"
            )}
          />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full animate-in zoom-in-50"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">Activity</SheetTitle>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count} due
              </Badge>
            )}
          </div>
          <SheetDescription>
            Follow-ups, milestones, and recent activity
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          <ActivityFeed onCountChange={handleCountChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
