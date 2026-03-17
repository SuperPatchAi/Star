"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/db/types";
import { SALES_STEPS } from "@/types/roadmap";
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

    const advancedStepIds = SALES_STEPS.filter(s => s.number >= 3).map(s => s.id);
    const advancedSteps = [...advancedStepIds, "closed"];
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

const STEP_ORDER = [...SALES_STEPS.map(s => s.id), "closed"];

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
  } as ContactUpdate);
}

export async function dismissReminder(id: string) {
  return updateContact(id, {
    stage_entered_at: new Date().toISOString(),
  } as ContactUpdate);
}

export async function markSamplesReceived(id: string) {
  return updateContact(id, {
    sample_followup_done: true,
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

export interface SalesAnalytics {
  topWinningQuestions: { question: string; count: number }[];
  topLostObjections: { objection: string; count: number }[];
  openingWinRates: { approach: string; wins: number; total: number; rate: number }[];
  closingWinRates: { technique: string; wins: number; total: number; rate: number }[];
  avgQuestionsWon: number;
  avgQuestionsLost: number;
}

export async function getSalesAnalytics(): Promise<SalesAnalytics> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empty: SalesAnalytics = {
    topWinningQuestions: [], topLostObjections: [],
    openingWinRates: [], closingWinRates: [],
    avgQuestionsWon: 0, avgQuestionsLost: 0,
  };
  if (!user) return empty;

  const { data: contacts } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("outcome, questions_asked, objections_encountered, opening_types, closing_techniques")
    .eq("user_id", user.id)
    .in("outcome", ["won", "lost"]);

  if (!contacts || contacts.length === 0) return empty;

  const questionCounts: Record<string, number> = {};
  const objectionCounts: Record<string, number> = {};
  const openingStats: Record<string, { wins: number; total: number }> = {};
  const closingStats: Record<string, { wins: number; total: number }> = {};
  let totalQuestionsWon = 0;
  let wonCount = 0;
  let totalQuestionsLost = 0;
  let lostCount = 0;

  for (const c of contacts) {
    const isWon = c.outcome === "won";

    const qa = c.questions_asked as Record<string, unknown[]> | null;
    if (qa) {
      let contactQuestionCount = 0;
      for (const arr of Object.values(qa)) {
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          const q = typeof item === "string" ? item : (item as { question?: string })?.question;
          if (!q) continue;
          contactQuestionCount++;
          if (isWon) questionCounts[q] = (questionCounts[q] || 0) + 1;
        }
      }
      if (isWon) { totalQuestionsWon += contactQuestionCount; wonCount++; }
      else { totalQuestionsLost += contactQuestionCount; lostCount++; }
    }

    if (!isWon) {
      const oe = c.objections_encountered as Record<string, unknown[]> | null;
      if (oe) {
        for (const arr of Object.values(oe)) {
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            const o = typeof item === "string" ? item : (item as { objection?: string })?.objection;
            if (o) objectionCounts[o] = (objectionCounts[o] || 0) + 1;
          }
        }
      }
    }

    const ot = c.opening_types as Record<string, string> | null;
    if (ot) {
      for (const approach of Object.values(ot)) {
        if (!openingStats[approach]) openingStats[approach] = { wins: 0, total: 0 };
        openingStats[approach].total++;
        if (isWon) openingStats[approach].wins++;
      }
    }

    const ct = c.closing_techniques as Record<string, string> | null;
    if (ct) {
      for (const technique of Object.values(ct)) {
        if (!closingStats[technique]) closingStats[technique] = { wins: 0, total: 0 };
        closingStats[technique].total++;
        if (isWon) closingStats[technique].wins++;
      }
    }
  }

  return {
    topWinningQuestions: Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count })),
    topLostObjections: Object.entries(objectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([objection, count]) => ({ objection, count })),
    openingWinRates: Object.entries(openingStats)
      .map(([approach, s]) => ({ approach, wins: s.wins, total: s.total, rate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate),
    closingWinRates: Object.entries(closingStats)
      .map(([technique, s]) => ({ technique, wins: s.wins, total: s.total, rate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate),
    avgQuestionsWon: wonCount > 0 ? Math.round((totalQuestionsWon / wonCount) * 10) / 10 : 0,
    avgQuestionsLost: lostCount > 0 ? Math.round((totalQuestionsLost / lostCount) * 10) / 10 : 0,
  };
}
