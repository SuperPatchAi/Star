"use server";

import { createClient } from "@/lib/supabase/server";
import { getRoadmapSpec } from "@/lib/roadmap-data";
import { SALES_STEPS } from "@/types/roadmap";
import type { Contact, ContactStep } from "@/lib/db/types";
import type { FollowUpReminder, ReminderUrgency } from "@/types/reminders";
import { STALENESS_THRESHOLDS, FOLLOWUP_DAY_OFFSETS } from "@/types/reminders";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function getStageName(step: ContactStep): string {
  const found = SALES_STEPS.find((s) => s.id === step);
  return found?.label ?? step;
}

function daysBetween(date1: Date, date2: Date): number {
  const ms = date2.getTime() - date1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return result;
}

function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeUrgency(daysSinceEntry: number, thresholdDays: number): ReminderUrgency {
  if (daysSinceEntry > thresholdDays) return "overdue";
  if (daysSinceEntry === thresholdDays) return "due_today";
  return "upcoming";
}

export async function getFollowUpReminders(): Promise<{
  data: FollowUpReminder[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: contacts, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("*")
    .eq("user_id", user.id)
    .neq("current_step", "closed")
    .not("outcome", "in", '("won","lost")')
    .order("stage_entered_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  if (!contacts || contacts.length === 0) return { data: [], error: null };

  const now = new Date();
  const reminders: FollowUpReminder[] = [];

  for (const contact of contacts as Contact[]) {
    const enteredAt = new Date(contact.stage_entered_at);
    const daysSinceEntry = daysBetween(enteredAt, now);
    const step = contact.current_step;

    if (step === "followup") {
      const currentDayIndex = contact.follow_up_day ?? 0;
      const primaryProductId = contact.product_ids[0];
      const roadmap = primaryProductId ? getRoadmapSpec(primaryProductId) : null;
      const followUpSequence = roadmap?.sections["7_followup"]?.sequence;

      for (let dayIndex = currentDayIndex; dayIndex < FOLLOWUP_DAY_OFFSETS.length; dayIndex++) {
        const dueOffset = FOLLOWUP_DAY_OFFSETS[dayIndex];
        const daysUntilDue = dueOffset - daysSinceEntry;
        const followUpStep = followUpSequence?.[dayIndex];

        let urgency: ReminderUrgency;
        if (dayIndex === currentDayIndex) {
          urgency = daysUntilDue < 0 ? "overdue" : daysUntilDue === 0 ? "due_today" : "upcoming";
        } else {
          urgency = "upcoming";
        }

        const followupDueDate = addDays(enteredAt, dueOffset);
        reminders.push({
          contact,
          type: "followup_due",
          urgency,
          stageName: getStageName(step),
          daysSinceEntry,
          dueDate: toISODateString(followupDueDate),
          followUpStep: followUpStep ?? undefined,
          followUpDayIndex: dayIndex,
          productId: primaryProductId,
        });
      }
    } else if (step !== "closed") {
      const threshold = STALENESS_THRESHOLDS[step];
      if (threshold === Infinity || threshold === 0) continue;

      const previewWindow = threshold - 1;
      if (daysSinceEntry < previewWindow) continue;

      const staleDueDate = addDays(enteredAt, threshold);
      reminders.push({
        contact,
        type: "stale",
        urgency: computeUrgency(daysSinceEntry, threshold),
        stageName: getStageName(step),
        daysSinceEntry,
        dueDate: toISODateString(staleDueDate),
      });
    }
  }

  reminders.sort((a, b) => {
    const urgencyOrder: Record<ReminderUrgency, number> = {
      overdue: 0,
      due_today: 1,
      upcoming: 2,
    };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return { data: reminders, error: null };
}

export async function getFollowUpReminderCount(): Promise<number> {
  const { data } = await getFollowUpReminders();
  return data?.length ?? 0;
}
