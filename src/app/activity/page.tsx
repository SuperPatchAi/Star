"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityFeed } from "@/components/follow-ups/activity-feed";
import { FollowUpCalendar } from "@/components/follow-ups/follow-up-calendar";
import { getFollowUpReminders } from "@/lib/actions/reminders";
import type { FollowUpReminder } from "@/types/reminders";

export default function ActivityPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);

  const fetchReminders = useCallback(async () => {
    const { data } = await getFollowUpReminders();
    setReminders(data ?? []);
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Follow-up reminders and upcoming tasks.
        </p>
      </div>

      <FollowUpCalendar
        reminders={reminders}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div className="-mx-4 md:-mx-6 flex-1 min-h-0">
        <ActivityFeed
          selectedDate={selectedDate}
          onCountChange={() => fetchReminders()}
        />
      </div>
    </div>
  );
}
