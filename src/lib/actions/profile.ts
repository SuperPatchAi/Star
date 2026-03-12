"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/db/types";

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
