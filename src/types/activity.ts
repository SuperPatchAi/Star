import type { FollowUpReminder } from "./reminders";

export type ActivityEventType =
  | "contact_created"
  | "step_changed"
  | "sample_sent"
  | "sample_confirmed"
  | "followup_completed"
  | "outcome_changed"
  | "invite_sent"
  | "member_joined"
  | "purchase_matched"
  | "downline_synced";

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

export type TimeBucket = "overdue" | "today" | "upcoming" | "this_week" | "older";

export const EVENT_LABELS: Record<ActivityEventType, string> = {
  contact_created: "New Contact",
  step_changed: "Step Changed",
  sample_sent: "Samples Sent",
  sample_confirmed: "Samples Received",
  followup_completed: "Follow-Up Done",
  outcome_changed: "Outcome Updated",
  invite_sent: "Invite Sent",
  member_joined: "Member Joined",
  purchase_matched: "Purchase Matched",
  downline_synced: "Downline Synced",
};

export function getItemBucket(item: UnifiedFeedItem): TimeBucket {
  if (item.kind === "reminder") {
    switch (item.data.urgency) {
      case "overdue":       return "overdue";
      case "due_today":     return "today";
      case "due_tomorrow":
      case "due_this_week": return "upcoming";
    }
  }
  return getTimeBucket(item.timestamp);
}

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
