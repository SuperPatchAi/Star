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
  /** ISO date string (YYYY-MM-DD) when this reminder is due */
  dueDate: string;
  followUpStep?: RoadmapFollowUpStep;
  followUpDayIndex?: number;
  productId?: string;
}

export const STALENESS_THRESHOLDS: Record<ContactStep, number> = {
  add_contact: 2,
  opening: 2,
  discovery: 2,
  presentation: 2,
  samples: 2,
  followup: 0, // handled by DAY sequence, not staleness
  closing: 2,
  objections: 2,
  purchase_links: 2,
  closed: Infinity,
};

export const FOLLOWUP_DAY_OFFSETS = [1, 3, 4, 5, 7, 14, 14];
