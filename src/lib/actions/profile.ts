"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/db/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

/**
 * Fetch the current user's profile via the admin client (bypasses RLS).
 * Safe because we authenticate the user first via the regular client.
 */
export async function getMyProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    data: data ? (data as unknown as UserProfile) : null,
    error: error?.message ?? null,
  };
}

export async function getStoreSubdomain(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = await createAdminClient();
  const { data } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("store_subdomain")
    .eq("id", user.id)
    .single();

  return data?.store_subdomain ?? null;
}

export async function updateStoreSubdomain(
  subdomain: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cleaned = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleaned) return { error: "Invalid subdomain" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ store_subdomain: cleaned, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return { error: error?.message ?? null };
}
