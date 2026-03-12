import type { Contact, ContactStep } from "@/lib/db/types";
import type { RoadmapFollowUpStep } from "./roadmap";

export type ReminderUrgency = "overdue" | "due_today" | "upcoming";
export type ReminderType = "stale" | "followup_due";

export interface FollowUpReminder {
  contact: Contact;
  type: ReminderType;
  urgency: ReminderUrgency;
  stageName: string;
  daysSinceEntry: number;
  followUpStep?: RoadmapFollowUpStep;
  followUpDayIndex?: number;
  productId?: string;
}

export const STALENESS_THRESHOLDS: Record<ContactStep, number> = {
  add_contact: 1,
  opening: 2,
  discovery: 2,
  presentation: 3,
  samples: 3,
  objections: 2,
  closing: 2,
  followup: 0, // handled by DAY sequence, not staleness
  closed: Infinity,
};

export const FOLLOWUP_DAY_OFFSETS = [1, 3, 7, 14];
