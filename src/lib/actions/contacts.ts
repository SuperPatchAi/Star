"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/db/types";
import { updateChecklistItem } from "@/lib/actions/onboarding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function getContacts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return { data: data as Contact[] | null, error: error?.message || null };
}

export async function getContact(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data: data as Contact | null, error: error?.message || null };
}

export async function createContact(contact: Omit<ContactInsert, "user_id">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .insert({ ...contact, user_id: user.id })
    .select()
    .single();

  if (!error) {
    revalidatePath("/contacts");
    revalidatePath("/dashboard");
    updateChecklistItem("add_first_contact").catch(() => {});
  }

  return { data: data as Contact | null, error: error?.message || null };
}

export async function updateContact(id: string, updates: ContactUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.current_step) {
    payload.stage_entered_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (!error && data) {
    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    const updated = data as Contact;

    if (updated.current_step && updated.current_step !== "add_contact") {
      updateChecklistItem("start_first_conversation").catch(() => {});
    }

    const advancedSteps = ["presentation", "samples", "objections", "closing", "followup", "closed"];
    if (updated.current_step && advancedSteps.includes(updated.current_step)) {
      updateChecklistItem("complete_sales_step").catch(() => {});
    }

    if (updated.sample_sent) {
      updateChecklistItem("send_first_sample").catch(() => {});
    }

    if (updated.follow_up_day !== null && updated.follow_up_day !== undefined && updated.follow_up_day >= 0) {
      updateChecklistItem("setup_followup").catch(() => {});
    }
  }

  return { data: data as Contact | null, error: error?.message || null };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (!error) {
    revalidatePath("/contacts");
    revalidatePath("/dashboard");
  }

  return { error: error?.message || null };
}

export async function toggleSampleSent(id: string, sent: boolean) {
  return updateContact(id, {
    sample_sent: sent,
    sample_sent_at: sent ? new Date().toISOString() : null,
  });
}

export async function updateContactOutcome(id: string, outcome: "pending" | "won" | "lost" | "follow_up") {
  return updateContact(id, { outcome });
}

const STEP_ORDER = ["add_contact", "opening", "discovery", "presentation", "samples", "objections", "closing", "followup", "closed"];

export async function updateContactStep(id: string, step: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: contact } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("peak_step, current_step")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const updates: Record<string, unknown> = {
    current_step: step,
    stage_entered_at: new Date().toISOString(),
  };

  const newIdx = STEP_ORDER.indexOf(step);
  const peakIdx = STEP_ORDER.indexOf(contact?.peak_step ?? contact?.current_step ?? "add_contact");
  if (newIdx > peakIdx) {
    updates.peak_step = step;
  }

  return updateContact(id, updates as ContactUpdate);
}

export async function advanceFollowUpDay(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: contact } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("follow_up_day")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!contact) return { data: null, error: "Contact not found" };

  const currentDay = contact.follow_up_day ?? -1;
  const nextDay = currentDay + 1;

  return updateContact(id, {
    follow_up_day: nextDay,
    stage_entered_at: new Date().toISOString(),
  } as ContactUpdate);
}

export async function dismissReminder(id: string) {
  return updateContact(id, {
    stage_entered_at: new Date().toISOString(),
  } as ContactUpdate);
}

export interface DashboardStats {
  pipelineCounts: Record<string, number>;
  outcomeCounts: Record<string, number>;
  recentActivity: { id: string; name: string; step: string; outcome: string; updatedAt: string }[];
  totalActive: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  contactsThisWeek: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {
    pipelineCounts: {}, outcomeCounts: {}, recentActivity: [],
    totalActive: 0, wonCount: 0, lostCount: 0, winRate: 0, contactsThisWeek: 0,
  };

  const { data: contacts } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("id, first_name, last_name, current_step, outcome, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const all = (contacts as Contact[]) || [];

  const pipelineCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};
  let wonCount = 0;
  let lostCount = 0;
  let contactsThisWeek = 0;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  for (const c of all) {
    pipelineCounts[c.current_step] = (pipelineCounts[c.current_step] || 0) + 1;
    outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] || 0) + 1;
    if (c.outcome === "won") wonCount++;
    if (c.outcome === "lost") lostCount++;
    if (new Date(c.created_at) >= weekStart) contactsThisWeek++;
  }

  const totalActive = all.filter(c => c.outcome === "pending" || c.outcome === "follow_up").length;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  const recentActivity = all.slice(0, 10).map(c => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    step: c.current_step,
    outcome: c.outcome,
    updatedAt: c.updated_at,
  }));

  return { pipelineCounts, outcomeCounts, recentActivity, totalActive, wonCount, lostCount, winRate, contactsThisWeek };
}
