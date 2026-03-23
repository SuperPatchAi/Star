"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { OnboardingStep, OnboardingChecklist } from "@/lib/db/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export interface OnboardingState {
  step: OnboardingStep;
  checklist: OnboardingChecklist;
}

const DEFAULT_CHECKLIST: OnboardingChecklist = {
  add_first_contact: false,
  start_first_conversation: false,
  complete_sales_step: false,
  send_first_sample: false,
  setup_followup: false,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { step: "completed", checklist: DEFAULT_CHECKLIST };

  const adminClient = await createAdminClient();
  const { data: profile } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("onboarding_step, onboarding_checklist")
    .eq("id", user.id)
    .single();

  return {
    step: (profile?.onboarding_step as OnboardingStep) ?? "completed",
    checklist: (profile?.onboarding_checklist as OnboardingChecklist) ?? DEFAULT_CHECKLIST,
  };
}

export async function completeCarousel(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "tour", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function completeTour(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "checklist", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function updateChecklistItem(
  item: keyof OnboardingChecklist
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { data: profile } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("onboarding_step, onboarding_checklist")
    .eq("id", user.id)
    .single();

  if (!profile || profile.onboarding_step === "completed") {
    return { error: null };
  }

  const checklist: OnboardingChecklist = profile.onboarding_checklist ?? DEFAULT_CHECKLIST;
  if (checklist[item]) return { error: null };

  checklist[item] = true;

  const updates: Record<string, unknown> = {
    onboarding_checklist: checklist,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update(updates)
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function resetOnboarding(
  phase: "carousel" | "tour" | "all"
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const step: OnboardingStep = phase === "all" ? "carousel" : phase;

  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: step, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return { error: error?.message || null };
}

export async function dismissOnboarding(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "completed", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}
