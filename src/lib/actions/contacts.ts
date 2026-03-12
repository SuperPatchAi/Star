"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/db/types";

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
    revalidatePath("/sales");
  }

  return { data: data as Contact | null, error: error?.message || null };
}

export async function updateContact(id: string, updates: ContactUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (!error) {
    revalidatePath("/contacts");
    revalidatePath("/sales");
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
    revalidatePath("/sales");
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

export async function updateContactStep(id: string, step: string) {
  return updateContact(id, { current_step: step as ContactInsert["current_step"] });
}
