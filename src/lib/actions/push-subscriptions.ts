"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { NotificationPreferences } from "@/lib/db/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/db/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribePush(subscription: PushSubscriptionPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await (supabase as SupabaseAny)
    .from("d2c_push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

  return { error: error?.message || null };
}

export async function unsubscribePush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await (supabase as SupabaseAny)
    .from("d2c_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return { error: error?.message || null };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;

  const adminClient = await createAdminClient();
  const { data } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  return (data?.notification_preferences as NotificationPreferences) ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();

  const { data: current } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const merged = {
    ...(current?.notification_preferences ?? DEFAULT_NOTIFICATION_PREFERENCES),
    ...prefs,
  };

  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({
      notification_preferences: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return { error: error?.message ?? null };
}
