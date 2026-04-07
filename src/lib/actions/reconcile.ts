"use server";

import { createClient } from "@/lib/supabase/server";
import { lookupCustomer, getCustomerOrders } from "@/lib/actions/bydesign";
import type { ByDesignCustomer } from "@/lib/actions/bydesign";
import { matchByDesignProduct } from "@/data/products";
import { logActivity } from "@/lib/actions/activity";
import type { MatchConfidence, PurchaseMatch } from "@/lib/db/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// ---------------------------------------------------------------------------
// matchContactToCustomer — tiered lookup against ByDesign
// ---------------------------------------------------------------------------

export async function matchContactToCustomer(contactId: string): Promise<{
  customer: ByDesignCustomer | null;
  confidence: MatchConfidence | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { customer: null, confidence: null, error: "Not authenticated" };

  const { data: contact, error: fetchErr } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select(
      "id, user_id, first_name, last_name, email, phone, bydesign_customer_did"
    )
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !contact)
    return {
      customer: null,
      confidence: null,
      error: fetchErr?.message ?? "Contact not found",
    };

  if (contact.bydesign_customer_did)
    return {
      customer: null,
      confidence: null,
      error: "Contact already matched",
    };

  // Tier A: email (auto-accept)
  if (contact.email) {
    const { data: customers, error: lookupErr } = await lookupCustomer(
      user.id,
      { email: contact.email }
    );
    if (lookupErr)
      return { customer: null, confidence: null, error: lookupErr };
    if (customers && customers.length > 0) {
      return { customer: customers[0], confidence: "email", error: null };
    }
  }

  // Tier B: phone (auto-accept)
  if (contact.phone) {
    const { data: customers, error: lookupErr } = await lookupCustomer(
      user.id,
      { phone: contact.phone }
    );
    if (lookupErr)
      return { customer: null, confidence: null, error: lookupErr };
    if (customers && customers.length > 0) {
      return { customer: customers[0], confidence: "phone", error: null };
    }
  }

  // Tier C: first+last name (needs manual confirm)
  if (contact.first_name && contact.last_name) {
    const { data: customers, error: lookupErr } = await lookupCustomer(
      user.id,
      { firstName: contact.first_name, lastName: contact.last_name }
    );
    if (lookupErr)
      return { customer: null, confidence: null, error: lookupErr };
    if (customers && customers.length > 0) {
      return { customer: customers[0], confidence: "name", error: null };
    }
  }

  return { customer: null, confidence: null, error: null };
}

// ---------------------------------------------------------------------------
// fetchAndStoreOrders — internal helper
// ---------------------------------------------------------------------------

async function fetchAndStoreOrders(
  userId: string,
  contactId: string,
  customerDID: number
): Promise<{ orderCount: number; totalSpent: number; error: string | null }> {
  const { data: orders, error: ordersErr } = await getCustomerOrders(
    userId,
    customerDID
  );
  if (ordersErr) return { orderCount: 0, totalSpent: 0, error: ordersErr };
  if (!orders || orders.length === 0)
    return { orderCount: 0, totalSpent: 0, error: null };

  const supabase = await createClient();

  let totalSpent = 0;
  for (const order of orders) {
    totalSpent += order.OrderTotal ?? 0;

    const productsPurchased = (order.OrderDetails ?? []).map((d) => ({
      product_id: matchByDesignProduct(d.ProductName) ?? "unknown",
      name: d.ProductName,
      quantity: d.Quantity,
    }));

    await (supabase as SupabaseAny).from("d2c_purchase_matches").upsert(
      {
        user_id: userId,
        contact_id: contactId,
        bydesign_customer_did: String(customerDID),
        bydesign_order_id: order.OrderID,
        order_date: order.OrderDate ?? null,
        order_total: order.OrderTotal ?? null,
        order_status_id: order.OrderStatusID ?? null,
        products_purchased: productsPurchased,
        matched_at: new Date().toISOString(),
      },
      { onConflict: "contact_id,bydesign_order_id" }
    );
  }

  await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .update({
      bydesign_order_count: orders.length,
      bydesign_total_spent: totalSpent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", userId);

  return { orderCount: orders.length, totalSpent, error: null };
}

// ---------------------------------------------------------------------------
// reconcileContact — match + auto-link if high confidence
// ---------------------------------------------------------------------------

export async function reconcileContact(contactId: string): Promise<{
  matched: boolean;
  confidence: MatchConfidence | null;
  orders_found: number;
  customer: ByDesignCustomer | null;
  error: string | null;
}> {
  const { customer, confidence, error } =
    await matchContactToCustomer(contactId);
  if (error)
    return {
      matched: false,
      confidence: null,
      orders_found: 0,
      customer: null,
      error,
    };
  if (!customer || !confidence)
    return {
      matched: false,
      confidence: null,
      orders_found: 0,
      customer: null,
      error: null,
    };

  // Name matches need manual confirmation
  if (confidence === "name") {
    return {
      matched: false,
      confidence: "name",
      orders_found: 0,
      customer,
      error: null,
    };
  }

  // Auto-link for email/phone
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      matched: false,
      confidence: null,
      orders_found: 0,
      customer: null,
      error: "Not authenticated",
    };

  await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .update({
      bydesign_customer_did: String(customer.CustomerDID),
      bydesign_matched_at: new Date().toISOString(),
      bydesign_match_confidence: confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  const { orderCount, totalSpent, error: ordersErr } =
    await fetchAndStoreOrders(user.id, contactId, customer.CustomerDID);

  if (ordersErr)
    return {
      matched: true,
      confidence,
      orders_found: 0,
      customer,
      error: ordersErr,
    };

  if (orderCount > 0) {
    await (supabase as SupabaseAny)
      .from("d2c_contacts")
      .update({ outcome: "won", updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", user.id);
  }

  logActivity("purchase_matched", contactId, {
    order_total: totalSpent,
    order_count: orderCount,
    confidence,
    customer_did: customer.CustomerDID,
  }).catch(() => {});

  return {
    matched: true,
    confidence,
    orders_found: orderCount,
    customer,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// confirmMatch — manually confirm a name-based match
// ---------------------------------------------------------------------------

export async function confirmMatch(
  contactId: string,
  customerDID: string
): Promise<{ orders_found: number; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orders_found: 0, error: "Not authenticated" };

  const { data: contact } = await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .select("id, user_id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  if (!contact) return { orders_found: 0, error: "Contact not found" };

  await (supabase as SupabaseAny)
    .from("d2c_contacts")
    .update({
      bydesign_customer_did: customerDID,
      bydesign_matched_at: new Date().toISOString(),
      bydesign_match_confidence: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  const { orderCount, totalSpent, error: ordersErr } =
    await fetchAndStoreOrders(user.id, contactId, Number(customerDID));

  if (ordersErr) return { orders_found: 0, error: ordersErr };

  if (orderCount > 0) {
    await (supabase as SupabaseAny)
      .from("d2c_contacts")
      .update({ outcome: "won", updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", user.id);
  }

  logActivity("purchase_matched", contactId, {
    order_total: totalSpent,
    order_count: orderCount,
    confidence: "manual",
    customer_did: Number(customerDID),
  }).catch(() => {});

  return { orders_found: orderCount, error: null };
}

// ---------------------------------------------------------------------------
// getContactPurchaseMatches — read matches for a contact
// ---------------------------------------------------------------------------

export async function getContactPurchaseMatches(
  contactId: string
): Promise<{ data: PurchaseMatch[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_purchase_matches")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("order_date", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as PurchaseMatch[]) ?? [], error: null };
}
