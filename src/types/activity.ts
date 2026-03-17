import type { FollowUpReminder } from "./reminders";

export type ActivityEventType =
  | "contact_created"
  | "step_changed"
  | "sample_sent"
  | "sample_confirmed"
  | "followup_completed"
  | "outcome_changed";

export interface ActivityEvent {
  id: string;
  user_id: string;
  contact_id: string | null;
  event_type: ActivityEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type UnifiedFeedItem =
  | { kind: "reminder"; data: FollowUpReminder; timestamp: string }
  | { kind: "event"; data: ActivityEvent; timestamp: string };

export type TimeBucket = "today" | "this_week" | "older";

export const EVENT_LABELS: Record<ActivityEventType, string> = {
  contact_created: "New Contact",
  step_changed: "Step Changed",
  sample_sent: "Samples Sent",
  sample_confirmed: "Samples Received",
  followup_completed: "Follow-Up Done",
  outcome_changed: "Outcome Updated",
};

export function getTimeBucket(dateStr: string): TimeBucket {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  const d = new Date(dateStr);
  if (d >= todayStart) return "today";
  if (d >= weekStart) return "this_week";
  return "older";
}
