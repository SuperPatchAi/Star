"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const BASE_URL =
  process.env.BYDESIGN_API_BASE_URL || "https://webapi.securefreedom.com/VoxxLife";

// ---------------------------------------------------------------------------
// Credential resolution: user encrypted → env fallback → error
// ---------------------------------------------------------------------------

interface ByDesignCredentials {
  username: string;
  password: string;
}

async function resolveCredentials(
  userId: string
): Promise<{ creds: ByDesignCredentials | null; error: string | null }> {
  const admin = await createAdminClient();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("bydesign_api_username, bydesign_api_key_encrypted")
    .eq("id", userId)
    .single();

  if (profile?.bydesign_api_username && profile?.bydesign_api_key_encrypted) {
    const encKey = process.env.BYDESIGN_ENCRYPTION_KEY;
    if (!encKey) {
      return { creds: null, error: "Server encryption key not configured" };
    }

    const { data: decrypted, error: decryptError } = await admin.rpc(
      "pgp_sym_decrypt_text",
      {
        encrypted_data: profile.bydesign_api_key_encrypted,
        encryption_key: encKey,
      }
    );

    if (decryptError || !decrypted) {
      return { creds: null, error: "Failed to decrypt stored credentials" };
    }

    return {
      creds: { username: profile.bydesign_api_username, password: decrypted as string },
      error: null,
    };
  }

  const envUser = process.env.BYDESIGN_API_USERNAME;
  const envPass = process.env.BYDESIGN_API_PASSWORD;
  if (envUser && envPass) {
    return { creds: { username: envUser, password: envPass }, error: null };
  }

  return { creds: null, error: "No ByDesign credentials configured" };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function bydesignFetch<T>(
  path: string,
  creds: ByDesignCredentials,
  options?: { method?: string; body?: Json }
): Promise<{ data: T | null; error: string | null }> {
  const url = `${BASE_URL}/${path}`;
  const auth = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { data: null, error: `ByDesign API ${res.status}: ${text}` };
    }

    const json = await res.json();
    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "ByDesign API request failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Typed ByDesign API response shapes (matched to real API)
// ---------------------------------------------------------------------------

export interface ByDesignRep {
  RepID: number;
  RepDID: string;
  FirstName: string;
  LastName: string;
  Company?: string;
  Email: string;
  Phone1?: string;
  BillCity?: string;
  BillState?: string;
  BillCountry?: string;
  SponsorRepDID?: string;
  UplineRepDID?: string;
  SponsorRepCount: number;
  RankTypeID: number;
  RepStatusTypeID: number;
  RepStatusType: string;
  URL: string;
  JoinDate: string;
  RepTypeID: number;
}

export interface ByDesignVolumeDetail {
  BCDID: number;
  Level: string;
  RepDID: string;
  RepName: string;
  Rank: string;
  CustomerDID: string;
  OrderID: number;
  OrderDate: string;
  OrderAmount: number;
  Volume: number;
}

export interface ByDesignCustomer {
  CustomerDID: number;
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  Phone: string;
  RepDID: number;
}

export interface ByDesignOrder {
  OrderID: number;
  CustomerDID: number;
  OrderDate: string;
  OrderTotal: number;
  OrderStatusID: number;
  OrderStatus: string;
  BVTotal: number;
  OrderDetails: {
    ProductID: number;
    ProductName: string;
    Quantity: number;
    Price: number;
  }[];
}

export interface ByDesignRankType {
  ID: number;
  Description: string;
  Abbreviation: string;
  Explanation?: string;
}

/** GET api/user/rep/{repDID}/info */
export async function getRep(
  creds: ByDesignCredentials,
  repDID: string
): Promise<{ data: ByDesignRep | null; error: string | null }> {
  return bydesignFetch<ByDesignRep>(`api/user/rep/${repDID}/info`, creds);
}

/** Fetch rep info for multiple RepDIDs, returning a map keyed by RepDID. */
export async function getRepInfoBatch(
  userId: string,
  repDIDs: string[]
): Promise<{ data: Map<string, ByDesignRep>; error: string | null }> {
  const { creds, error } = await resolveCredentials(userId);
  if (!creds) return { data: new Map(), error: error! };

  const CONCURRENCY = 5;
  const results = new Map<string, ByDesignRep>();
  for (let i = 0; i < repDIDs.length; i += CONCURRENCY) {
    const batch = repDIDs.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((did) => getRep(creds, did))
    );
    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      if (outcome.status === "fulfilled" && outcome.value.data) {
        results.set(batch[j], outcome.value.data);
      }
    }
  }
  return { data: results, error: null };
}

/** GET api/user/rep/{repDID}/rank — returns rank name as a plain string */
async function getRepRank(
  creds: ByDesignCredentials,
  repDID: string
): Promise<{ data: string | null; error: string | null }> {
  return bydesignFetch<string>(`api/user/rep/${repDID}/rank`, creds);
}

interface VolumeReportSummary {
  VolumeTypeID: number;
  Description: string;
  PlanType: string;
  OrderStartDate: string;
  OrderEndDate: string;
}

/**
 * Finds the current month's bonus volume type ID by scanning the volume report
 * summary for a description matching the current month/year pattern.
 */
async function resolveCurrentVolumeTypeID(
  creds: ByDesignCredentials,
  repDID: string
): Promise<number | null> {
  const { data: summaries } = await bydesignFetch<VolumeReportSummary[]>(
    `api/commissions/volumeReport/${repDID}`,
    creds
  );
  if (!summaries || summaries.length === 0) return null;

  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const pattern = `${currentMonth} ${currentYear}`;

  const bonusMatch = summaries.find(
    (s) => s.Description.includes(pattern) && /bonus/i.test(s.Description)
  );
  if (bonusMatch) return bonusMatch.VolumeTypeID;

  const qualMatch = summaries.find(
    (s) => s.Description.includes(pattern) && /qualif/i.test(s.Description)
  );
  if (qualMatch) return qualMatch.VolumeTypeID;

  const anyMatch = summaries.find((s) => s.Description.includes(pattern));
  if (anyMatch) return anyMatch.VolumeTypeID;

  return summaries[0].VolumeTypeID;
}

/** GET api/commissions/volumeReport/{repDID}/details/{volumeTypeID}/{columnName} */
export async function getVolumeReportDetails(
  userId: string,
  repDID: string,
  volumeTypeID?: number,
  columnName: string = "RepGV"
): Promise<{ data: ByDesignVolumeDetail[] | null; error: string | null }> {
  const { creds, error } = await resolveCredentials(userId);
  if (!creds) return { data: null, error: error! };

  const typeID = volumeTypeID ?? await resolveCurrentVolumeTypeID(creds, repDID);
  if (!typeID) {
    return { data: null, error: "Could not determine current volume period" };
  }

  return bydesignFetch<ByDesignVolumeDetail[]>(
    `api/commissions/volumeReport/${repDID}/details/${typeID}/${columnName}`,
    creds
  );
}

/** GET api/Party/Search?SearchText=...&RepDID=... — search customers by text */
export async function lookupCustomer(
  userId: string,
  params: { email?: string; phone?: string; firstName?: string; lastName?: string }
): Promise<{ data: ByDesignCustomer[] | null; error: string | null }> {
  const { creds, error } = await resolveCredentials(userId);
  if (!creds) return { data: null, error: error! };

  const searchTerms: string[] = [];
  if (params.email) searchTerms.push(params.email);
  else if (params.phone) searchTerms.push(params.phone);
  else if (params.firstName && params.lastName)
    searchTerms.push(`${params.firstName} ${params.lastName}`);
  else if (params.firstName) searchTerms.push(params.firstName);
  else if (params.lastName) searchTerms.push(params.lastName);

  if (searchTerms.length === 0) {
    return { data: [], error: null };
  }

  const qs = new URLSearchParams();
  qs.set("SearchText", searchTerms[0]);

  return bydesignFetch<ByDesignCustomer[]>(
    `api/Party/Search?${qs.toString()}`,
    creds
  );
}

/** GET api/order/OnlineOrder/GetFromOrderID/{orderID} */
export async function getCustomerOrders(
  userId: string,
  customerDID: number
): Promise<{ data: ByDesignOrder[] | null; error: string | null }> {
  const { creds, error } = await resolveCredentials(userId);
  if (!creds) return { data: null, error: error! };
  return bydesignFetch<ByDesignOrder[]>(
    `api/Personal/Order/InventorySoldByDate?repDID=${customerDID}`,
    creds
  );
}

/** GET api/admin/rankType — returns all rank definitions */
async function getRankTypes(
  creds: ByDesignCredentials
): Promise<{ data: ByDesignRankType[] | null; error: string | null }> {
  return bydesignFetch<ByDesignRankType[]>("api/admin/rankType", creds);
}

// ---------------------------------------------------------------------------
// verifyConnection — test creds + fetch rep info
// ---------------------------------------------------------------------------

export async function verifyConnection(
  repDID: string,
  username?: string,
  password?: string
): Promise<{
  success: boolean;
  repName: string | null;
  rank: string | null;
  error: string | null;
}> {
  const creds: ByDesignCredentials =
    username && password
      ? { username, password }
      : {
          username: process.env.BYDESIGN_API_USERNAME ?? "",
          password: process.env.BYDESIGN_API_PASSWORD ?? "",
        };

  if (!creds.username || !creds.password) {
    return { success: false, repName: null, rank: null, error: "Missing credentials" };
  }

  const { data: rep, error } = await getRep(creds, repDID);

  if (error || !rep) {
    return {
      success: false,
      repName: null,
      rank: null,
      error: error || "Rep not found",
    };
  }

  const { data: rankName } = await getRepRank(creds, repDID);

  const displayName = [rep.FirstName, rep.LastName].filter(Boolean).join(" ")
    || rep.Company
    || `Rep ${repDID}`;

  return {
    success: true,
    repName: displayName,
    rank: rankName ?? null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// connectByDesign — save credentials and rep info
// ---------------------------------------------------------------------------

export async function connectByDesign(input: {
  repDID: string;
  apiUsername?: string;
  apiPassword?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const verify = await verifyConnection(
    input.repDID,
    input.apiUsername,
    input.apiPassword
  );
  if (!verify.success) return { error: verify.error || "Connection failed" };

  const admin = await createAdminClient();
  const update: Record<string, unknown> = {
    bydesign_rep_did: input.repDID,
    bydesign_connected_at: new Date().toISOString(),
    bydesign_rank: verify.rank,
    updated_at: new Date().toISOString(),
  };

  if (input.apiUsername && input.apiPassword) {
    update.bydesign_api_username = input.apiUsername;

    const encKey = process.env.BYDESIGN_ENCRYPTION_KEY;
    if (encKey) {
      const { data: encrypted, error: encError } = await admin.rpc(
        "pgp_sym_encrypt_text",
        {
          plain_text: input.apiPassword,
          encryption_key: encKey,
        }
      );
      if (encError) return { error: "Failed to encrypt credentials" };
      update.bydesign_api_key_encrypted = encrypted;
    }
  }

  const { error } = await admin
    .from("user_profiles")
    .update(update)
    .eq("id", user.id);

  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// disconnectByDesign — clear ByDesign fields
// ---------------------------------------------------------------------------

export async function disconnectByDesign(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = await createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({
      bydesign_rep_did: null,
      bydesign_api_username: null,
      bydesign_api_key_encrypted: null,
      bydesign_connected_at: null,
      bydesign_rank: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return { error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// syncRepRank — refresh rank from ByDesign
// ---------------------------------------------------------------------------

export async function syncRepRank(userId: string): Promise<{ error: string | null }> {
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("bydesign_rep_did")
    .eq("id", userId)
    .single();

  if (!profile?.bydesign_rep_did) return { error: "No ByDesign RepDID configured" };

  const { creds, error: credError } = await resolveCredentials(userId);
  if (!creds) return { error: credError! };

  const { data: rankName, error: rankError } = await getRepRank(
    creds,
    profile.bydesign_rep_did
  );

  if (rankError) return { error: rankError };
  if (!rankName) return { error: "Could not determine rank from ByDesign" };

  const { error: updateError } = await admin
    .from("user_profiles")
    .update({ bydesign_rank: rankName, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) return { error: updateError.message };

  return { error: null };
}
