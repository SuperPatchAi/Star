"use server";

import { createClient } from "@/lib/supabase/server";
import { getRoadmapSpec } from "@/lib/roadmap-data";
import { SALES_STEPS } from "@/types/roadmap";
import type { Contact, ContactStep } from "@/lib/db/types";
import type { FollowUpReminder, ReminderUrgency } from "@/types/reminders";
import { STALENESS_THRESHOLDS, FOLLOWUP_DAY_OFFSETS } from "@/types/reminders";

const SAMPLE_CHECKIN_SCRIPT = "Did you get it?";
const SAMPLE_EXPERIENCE_SCRIPT = "Before we open it, I want you to understand. This isn't about hype. It's about experience. I want you to pay attention to what you notice, not what you expect.";
const SAMPLE_FOLLOWUP_THRESHOLD_DAYS = 2;

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

    if (
      contact.sample_sent &&
      contact.sample_sent_at &&
      !contact.sample_followup_done
    ) {
      const sentAt = new Date(contact.sample_sent_at);
      const daysSinceSent = daysBetween(sentAt, now);
      if (daysSinceSent >= SAMPLE_FOLLOWUP_THRESHOLD_DAYS - 1) {
        const urgency: ReminderUrgency =
          daysSinceSent > SAMPLE_FOLLOWUP_THRESHOLD_DAYS
            ? "overdue"
            : daysSinceSent === SAMPLE_FOLLOWUP_THRESHOLD_DAYS
              ? "due_today"
              : "upcoming";

        reminders.push({
          contact,
          type: "sample_followup",
          urgency,
          stageName: "Sample Follow-Up",
          daysSinceEntry: daysSinceSent,
          sampleScript: `${SAMPLE_CHECKIN_SCRIPT}\n\n${SAMPLE_EXPERIENCE_SCRIPT}`,
        });
      }
    }

    if (step === "followup") {
      const dayIndex = contact.follow_up_day ?? 0;
      if (dayIndex >= FOLLOWUP_DAY_OFFSETS.length) continue;

      const dueOffset = FOLLOWUP_DAY_OFFSETS[dayIndex];
      const daysUntilDue = dueOffset - daysSinceEntry;

      if (daysUntilDue > 2) continue;

      const urgency: ReminderUrgency =
        daysUntilDue < 0 ? "overdue" : daysUntilDue === 0 ? "due_today" : "upcoming";

      const primaryProductId = contact.product_ids[0];
      const roadmap = primaryProductId ? getRoadmapSpec(primaryProductId) : null;
      const followUpSequence = roadmap?.sections["7_followup"]?.sequence;
      const followUpStep = followUpSequence?.[dayIndex];

      reminders.push({
        contact,
        type: "followup_due",
        urgency,
        stageName: getStageName(step),
        daysSinceEntry,
        followUpStep: followUpStep ?? undefined,
        followUpDayIndex: dayIndex,
        productId: primaryProductId,
      });
    } else if (step !== "closed") {
      const threshold = STALENESS_THRESHOLDS[step];
      if (threshold === Infinity || threshold === 0) continue;

      const previewWindow = threshold - 1;
      if (daysSinceEntry < previewWindow) continue;

      reminders.push({
        contact,
        type: "stale",
        urgency: computeUrgency(daysSinceEntry, threshold),
        stageName: getStageName(step),
        daysSinceEntry,
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
