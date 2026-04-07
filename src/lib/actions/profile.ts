"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserProfile, SocialLinks } from "@/lib/db/types";
import { revalidatePath } from "next/cache";

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

export async function updateProfile(fields: {
  full_name?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const update: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.full_name !== undefined) {
    update.full_name = fields.full_name.trim();
  }

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update(update)
    .eq("id", user.id);

  if (!error) revalidatePath("/settings");
  return { error: error?.message ?? null };
}

export async function uploadAvatar(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

  const file = formData.get("avatar") as File | null;
  if (!file) return { url: null, error: "No file provided" };

  if (file.size > 2 * 1024 * 1024) {
    return { url: null, error: "File must be under 2MB" };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { url: null, error: "Only JPEG, PNG, WebP, or GIF images are allowed" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${user.id}/avatar.${ext}`;

  const adminClient = await createAdminClient();

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data: publicUrlData } = adminClient.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return { url: null, error: updateError.message };
  }

  revalidatePath("/settings");
  return { url: avatarUrl, error: null };
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const adminClient = await createAdminClient();
  const { data } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("social_links")
    .eq("id", user.id)
    .single();

  return (data?.social_links as SocialLinks) ?? {};
}

export async function updateSocialLinks(
  links: SocialLinks
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cleaned: SocialLinks = {};
  for (const [key, value] of Object.entries(links)) {
    const trimmed = (value as string)?.trim().replace(/^@/, "");
    if (trimmed) {
      cleaned[key as keyof SocialLinks] = trimmed;
    }
  }

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ social_links: cleaned, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (!error) revalidatePath("/settings");
  return { error: error?.message ?? null };
}

export async function getPublicProfile(subdomain: string): Promise<{
  full_name: string | null;
  avatar_url: string | null;
  store_subdomain: string;
  social_links: SocialLinks;
  bydesign_rank: string | null;
} | null> {
  const adminClient = await createAdminClient();
  const { data } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("full_name, avatar_url, store_subdomain, social_links, bydesign_rank")
    .eq("store_subdomain", subdomain)
    .eq("is_active", true)
    .single();

  if (!data) return null;
  return {
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    store_subdomain: data.store_subdomain,
    social_links: (data.social_links as SocialLinks) ?? {},
    bydesign_rank: data.bydesign_rank ?? null,
  };
}

export async function requestPasswordReset(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const { error } = await supabase.auth.resetPasswordForEmail(user.email);

  return { error: error?.message ?? null };
}
