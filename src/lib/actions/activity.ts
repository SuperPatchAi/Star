"use server";

import { createClient } from "@/lib/supabase/server";
import { getFollowUpReminders } from "@/lib/actions/reminders";
import type {
  ActivityEvent,
  ActivityEventType,
  UnifiedFeedItem,
} from "@/types/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function logActivity(
  eventType: ActivityEventType,
  contactId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase as SupabaseAny).from("d2c_activity_log").insert({
    user_id: user.id,
    contact_id: contactId,
    event_type: eventType,
    metadata,
  });
}

export async function getActivityLog(
  limit = 50
): Promise<{ data: ActivityEvent[] | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_activity_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: (data as ActivityEvent[]) ?? [], error: null };
}

export async function getUnifiedFeed(): Promise<{
  data: UnifiedFeedItem[] | null;
  error: string | null;
}> {
  const [remindersResult, activityResult] = await Promise.all([
    getFollowUpReminders(),
    getActivityLog(50),
  ]);

  if (remindersResult.error && activityResult.error) {
    return { data: null, error: remindersResult.error };
  }

  const items: UnifiedFeedItem[] = [];

  for (const r of remindersResult.data ?? []) {
    items.push({
      kind: "reminder",
      data: r,
      timestamp: r.dueDate,
    });
  }

  for (const e of activityResult.data ?? []) {
    items.push({
      kind: "event",
      data: e,
      timestamp: e.created_at,
    });
  }

  items.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return tb - ta;
  });

  return { data: items, error: null };
}
