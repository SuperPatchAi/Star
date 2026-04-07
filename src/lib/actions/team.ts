"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getVolumeReportDetails, getRepInfoBatch } from "@/lib/actions/bydesign";
import { logActivity } from "@/lib/actions/activity";
import type {
  DownlineMember,
  TeamMember,
  TeamOverview,
  TeamLeaderboardEntry,
  StrugglingMember,
} from "@/lib/db/types";
import { randomUUID } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// ---------------------------------------------------------------------------
// syncDownlineForUser — shared core logic used by both the server action
// and the cron job route. Accepts a pre-created admin client.
// ---------------------------------------------------------------------------

export async function syncDownlineForUser(
  userId: string,
  repDID: string,
  admin: SupabaseAny
): Promise<{ count: number; error: string | null }> {
  const { data: volumeDetails, error: apiError } = await getVolumeReportDetails(
    userId,
    repDID
  );

  if (apiError || !volumeDetails) {
    return { count: 0, error: apiError || "Failed to fetch downline" };
  }

  const allStarUsers = await admin
    .from("user_profiles")
    .select("id, bydesign_rep_did")
    .not("bydesign_rep_did", "is", null);
  const starUserMap = new Map<string, string>();
  for (const u of (allStarUsers.data ?? []) as { id: string; bydesign_rep_did: string }[]) {
    starUserMap.set(String(u.bydesign_rep_did), u.id);
  }

  const existing = await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .select("rep_did, invite_token, invite_status")
    .eq("leader_id", userId);
  const existingTokens = new Map<string, string>();
  const existingStatuses = new Map<string, string>();
  for (const row of (existing.data ?? []) as { rep_did: string; invite_token: string | null; invite_status: string }[]) {
    if (row.invite_token) existingTokens.set(row.rep_did, row.invite_token);
    if (row.invite_status) existingStatuses.set(row.rep_did, row.invite_status);
  }

  const now = new Date().toISOString();

  // Deduplicate volume details by RepDID (API returns one row per order)
  const repMap = new Map<string, { repName: string; rank: string; level: number; totalVolume: number; totalAmount: number }>();
  for (const v of volumeDetails) {
    const repDidStr = String(v.RepDID);
    const existing2 = repMap.get(repDidStr);
    if (existing2) {
      existing2.totalVolume += v.Volume ?? 0;
      existing2.totalAmount += v.OrderAmount ?? 0;
    } else {
      repMap.set(repDidStr, {
        repName: v.RepName,
        rank: v.Rank,
        level: parseInt(String(v.Level), 10) || 0,
        totalVolume: v.Volume ?? 0,
        totalAmount: v.OrderAmount ?? 0,
      });
    }
  }

  const repDIDs = Array.from(repMap.keys());
  const { data: repInfoMap } = await getRepInfoBatch(userId, repDIDs);

  const rows = Array.from(repMap.entries()).map(([repDidStr, v]) => {
    const starUserId = starUserMap.get(repDidStr) ?? null;
    const info = repInfoMap.get(repDidStr);
    return {
      leader_id: userId,
      rep_did: repDidStr,
      rep_name: info
        ? [info.FirstName, info.LastName].filter(Boolean).join(" ") || v.repName
        : v.repName,
      email: info?.Email || null,
      phone: info?.Phone1 || null,
      rank: v.rank,
      level: v.level,
      pv: v.totalVolume,
      gv: v.totalAmount,
      join_date: info?.JoinDate || null,
      rep_status: info?.RepStatusType || null,
      star_user_id: starUserId,
      invite_token: existingTokens.get(repDidStr) ?? randomUUID(),
      invite_status: starUserId ? "accepted" : (existingStatuses.get(repDidStr) || "not_invited"),
      synced_at: now,
    };
  });

  if (rows.length > 0) {
    const { error: upsertError } = await (admin as SupabaseAny)
      .from("d2c_downline_cache")
      .upsert(rows, { onConflict: "leader_id,rep_did" });

    if (upsertError) return { count: 0, error: upsertError.message };
  }

  return { count: rows.length, error: null };
}

// ---------------------------------------------------------------------------
// syncDownline — authenticated wrapper for the server action
// ---------------------------------------------------------------------------

export async function syncDownline(): Promise<{
  count: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: profile } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("bydesign_rep_did")
    .eq("id", user.id)
    .single();

  if (!profile?.bydesign_rep_did) {
    return { count: 0, error: "ByDesign not connected" };
  }

  const result = await syncDownlineForUser(user.id, profile.bydesign_rep_did, admin);

  if (!result.error) {
    logActivity("downline_synced", null, { synced_count: result.count }).catch(() => {});
  }

  return result;
}

// ---------------------------------------------------------------------------
// getDownlineList
// ---------------------------------------------------------------------------

export async function getDownlineList(): Promise<{
  data: DownlineMember[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("d2c_downline_cache")
    .select("*")
    .eq("leader_id", user.id)
    .order("level", { ascending: true });

  return {
    data: (data as DownlineMember[]) ?? null,
    error: error?.message ?? null,
  };
}

// ---------------------------------------------------------------------------
// generateInviteLink
// ---------------------------------------------------------------------------

export async function generateInviteLink(downlineMemberId: string): Promise<{
  url: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: member } = await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .select("invite_token, rep_name")
    .eq("id", downlineMemberId)
    .eq("leader_id", user.id)
    .single();

  if (!member) return { url: null, error: "Member not found" };

  let token = member.invite_token;
  if (!token) {
    token = randomUUID();
    await (admin as SupabaseAny)
      .from("d2c_downline_cache")
      .update({ invite_token: token, invite_status: "invited", invited_at: new Date().toISOString() })
      .eq("id", downlineMemberId);
  } else {
    await (admin as SupabaseAny)
      .from("d2c_downline_cache")
      .update({ invite_status: "invited", invited_at: new Date().toISOString() })
      .eq("id", downlineMemberId);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://star-seven-sigma.vercel.app";
  const url = `${baseUrl}/signup?invite=${token}`;

  logActivity("invite_sent", null, { invitee_name: member.rep_name }).catch(() => {});

  return { url, error: null };
}

// ---------------------------------------------------------------------------
// acceptInvite — validate token, link team membership
// ---------------------------------------------------------------------------

export async function acceptInvite(token: string): Promise<{
  leaderName: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { leaderName: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: invite } = await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .select("id, leader_id, rep_did, level")
    .eq("invite_token", token)
    .neq("invite_status", "accepted")
    .single();

  if (!invite) return { leaderName: null, error: "Invalid or expired invite" };

  const { data: leader } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("full_name")
    .eq("id", invite.leader_id)
    .single();

  await (admin as SupabaseAny).from("d2c_team_members").upsert(
    {
      leader_id: invite.leader_id,
      member_id: user.id,
      member_rep_did: invite.rep_did,
      level: invite.level,
    },
    { onConflict: "leader_id,member_id" }
  );

  await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .update({ star_user_id: user.id, invite_status: "accepted" })
    .eq("id", invite.id);

  logActivity("member_joined", null, {
    member_name: user.user_metadata?.full_name || user.email,
    leader_id: invite.leader_id,
  }).catch(() => {});

  return { leaderName: leader?.full_name ?? null, error: null };
}

// ---------------------------------------------------------------------------
// validateInviteToken — for displaying info before accepting
// ---------------------------------------------------------------------------

export async function validateInviteToken(token: string): Promise<{
  valid: boolean;
  leaderName: string | null;
}> {
  const admin = await createAdminClient();
  const { data: invite } = await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .select("leader_id")
    .eq("invite_token", token)
    .neq("invite_status", "accepted")
    .single();

  if (!invite) return { valid: false, leaderName: null };

  const { data: leader } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("full_name")
    .eq("id", invite.leader_id)
    .single();

  return { valid: true, leaderName: leader?.full_name ?? null };
}

// ---------------------------------------------------------------------------
// getTeamOverview
// ---------------------------------------------------------------------------

export async function getTeamOverview(): Promise<{
  data: TeamOverview | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: members } = await (admin as SupabaseAny)
    .from("d2c_team_members")
    .select("member_id")
    .eq("leader_id", user.id);

  if (!members || members.length === 0) {
    return {
      data: {
        team_size: 0,
        total_contacts: 0,
        won_count: 0,
        lost_count: 0,
        pending_count: 0,
        win_rate: 0,
        avg_contacts_per_rep: 0,
        active_follow_ups: 0,
      },
      error: null,
    };
  }

  const memberIds = (members as Pick<TeamMember, "member_id">[]).map((m) => m.member_id);
  const { data: contacts } = await (admin as SupabaseAny)
    .from("d2c_contacts")
    .select("outcome, follow_up_day")
    .in("user_id", memberIds);

  const all = (contacts ?? []) as { outcome: string; follow_up_day: number | null }[];
  const won = all.filter((c) => c.outcome === "won").length;
  const lost = all.filter((c) => c.outcome === "lost").length;
  const pending = all.filter((c) => c.outcome === "pending").length;
  const activeFollowUps = all.filter(
    (c) => c.follow_up_day !== null && c.follow_up_day >= 0 && c.outcome === "pending"
  ).length;

  return {
    data: {
      team_size: memberIds.length,
      total_contacts: all.length,
      won_count: won,
      lost_count: lost,
      pending_count: pending,
      win_rate: all.length > 0 ? Math.round((won / all.length) * 100) : 0,
      avg_contacts_per_rep: memberIds.length > 0 ? Math.round(all.length / memberIds.length) : 0,
      active_follow_ups: activeFollowUps,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getTeamMemberStats
// ---------------------------------------------------------------------------

export async function getTeamMemberStats(memberId: string): Promise<{
  data: {
    member_name: string | null;
    rank: string | null;
    total_contacts: number;
    won: number;
    lost: number;
    pending: number;
    samples_sent: number;
    active_follow_ups: number;
    current_steps: Record<string, number>;
    last_activity_at: string | null;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: membership } = await (admin as SupabaseAny)
    .from("d2c_team_members")
    .select("id")
    .eq("leader_id", user.id)
    .eq("member_id", memberId)
    .single();

  if (!membership) return { data: null, error: "Not a team member" };

  const { data: memberProfile } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("full_name, bydesign_rank")
    .eq("id", memberId)
    .single();

  const { data: contacts } = await (admin as SupabaseAny)
    .from("d2c_contacts")
    .select("outcome, current_step, sample_sent, follow_up_day, updated_at")
    .eq("user_id", memberId);

  const all = (contacts ?? []) as {
    outcome: string;
    current_step: string;
    sample_sent: boolean;
    follow_up_day: number | null;
    updated_at: string;
  }[];

  const stepCounts: Record<string, number> = {};
  for (const c of all) {
    stepCounts[c.current_step] = (stepCounts[c.current_step] || 0) + 1;
  }

  const lastActivity = all.length > 0
    ? all.reduce((latest, c) => (c.updated_at > latest ? c.updated_at : latest), all[0].updated_at)
    : null;

  return {
    data: {
      member_name: memberProfile?.full_name ?? null,
      rank: memberProfile?.bydesign_rank ?? null,
      total_contacts: all.length,
      won: all.filter((c) => c.outcome === "won").length,
      lost: all.filter((c) => c.outcome === "lost").length,
      pending: all.filter((c) => c.outcome === "pending").length,
      samples_sent: all.filter((c) => c.sample_sent).length,
      active_follow_ups: all.filter(
        (c) => c.follow_up_day !== null && c.follow_up_day >= 0 && c.outcome === "pending"
      ).length,
      current_steps: stepCounts,
      last_activity_at: lastActivity,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getStrugglingMembers
// ---------------------------------------------------------------------------

export async function getStrugglingMembers(
  metric: "inactive" | "low_win_rate" | "no_contacts" = "inactive",
  limit = 5
): Promise<{
  data: StrugglingMember[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: members } = await (admin as SupabaseAny)
    .from("d2c_team_members")
    .select("member_id")
    .eq("leader_id", user.id);

  if (!members || members.length === 0) return { data: [], error: null };

  const memberIds = (members as Pick<TeamMember, "member_id">[]).map((m) => m.member_id);

  const { data: profiles } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("id, full_name")
    .in("id", memberIds);

  const nameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
    nameMap.set(p.id, p.full_name || "Unknown");
  }

  const { data: contacts } = await (admin as SupabaseAny)
    .from("d2c_contacts")
    .select("user_id, outcome, updated_at")
    .in("user_id", memberIds);

  const contactsByMember = new Map<string, { outcome: string; updated_at: string }[]>();
  for (const c of (contacts ?? []) as { user_id: string; outcome: string; updated_at: string }[]) {
    if (!contactsByMember.has(c.user_id)) contactsByMember.set(c.user_id, []);
    contactsByMember.get(c.user_id)!.push(c);
  }

  const now = Date.now();
  const struggling: StrugglingMember[] = [];

  for (const mid of memberIds) {
    const memberContacts = contactsByMember.get(mid) ?? [];

    if (metric === "no_contacts" && memberContacts.length === 0) {
      struggling.push({
        member_id: mid,
        member_name: nameMap.get(mid) || "Unknown",
        reason: "No contacts added yet",
        severity_count: 0,
      });
    } else if (metric === "inactive") {
      const lastUpdate = memberContacts.reduce(
        (max, c) => Math.max(max, new Date(c.updated_at).getTime()),
        0
      );
      const daysInactive = lastUpdate
        ? Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24))
        : 999;
      if (daysInactive >= 3) {
        struggling.push({
          member_id: mid,
          member_name: nameMap.get(mid) || "Unknown",
          reason: `Inactive for ${daysInactive} days`,
          severity_count: daysInactive,
          days_inactive: daysInactive,
        });
      }
    } else if (metric === "low_win_rate") {
      const total = memberContacts.length;
      const won = memberContacts.filter((c) => c.outcome === "won").length;
      if (total >= 3 && won / total < 0.2) {
        struggling.push({
          member_id: mid,
          member_name: nameMap.get(mid) || "Unknown",
          reason: `Win rate: ${Math.round((won / total) * 100)}% (${won}/${total})`,
          severity_count: total - won,
        });
      }
    }
  }

  struggling.sort((a, b) => b.severity_count - a.severity_count);
  return { data: struggling.slice(0, limit), error: null };
}

// ---------------------------------------------------------------------------
// getTeamLeaderboard
// ---------------------------------------------------------------------------

export async function getTeamLeaderboard(
  metric: "wins" | "contacts" | "samples" = "wins",
  period: "week" | "month" | "all" = "month"
): Promise<{
  data: TeamLeaderboardEntry[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: members } = await (admin as SupabaseAny)
    .from("d2c_team_members")
    .select("member_id")
    .eq("leader_id", user.id);

  if (!members || members.length === 0) return { data: [], error: null };

  const memberIds = (members as Pick<TeamMember, "member_id">[]).map((m) => m.member_id);

  const { data: profiles } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("id, full_name")
    .in("id", memberIds);

  const nameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
    nameMap.set(p.id, p.full_name || "Unknown");
  }

  let query = (admin as SupabaseAny)
    .from("d2c_contacts")
    .select("user_id, outcome, sample_sent, created_at")
    .in("user_id", memberIds);

  if (period === "week") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", weekAgo);
  } else if (period === "month") {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", monthAgo);
  }

  const { data: contacts } = await query;

  const scores = new Map<string, number>();
  for (const mid of memberIds) scores.set(mid, 0);

  for (const c of (contacts ?? []) as { user_id: string; outcome: string; sample_sent: boolean }[]) {
    const current = scores.get(c.user_id) ?? 0;
    if (metric === "wins" && c.outcome === "won") {
      scores.set(c.user_id, current + 1);
    } else if (metric === "contacts") {
      scores.set(c.user_id, current + 1);
    } else if (metric === "samples" && c.sample_sent) {
      scores.set(c.user_id, current + 1);
    }
  }

  const entries: TeamLeaderboardEntry[] = Array.from(scores.entries())
    .map(([memberId, value]) => ({
      member_id: memberId,
      member_name: nameMap.get(memberId) || "Unknown",
      rank: 0,
      metric_value: value,
    }))
    .sort((a, b) => b.metric_value - a.metric_value);

  entries.forEach((e, i) => { e.rank = i + 1; });

  return { data: entries.slice(0, 10), error: null };
}

// ---------------------------------------------------------------------------
// getTeamActivity
// ---------------------------------------------------------------------------

export async function getTeamActivity(limit = 20): Promise<{
  data: {
    member_name: string;
    event_type: string;
    description: string;
    created_at: string;
  }[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const admin = await createAdminClient();
  const { data: members } = await (admin as SupabaseAny)
    .from("d2c_team_members")
    .select("member_id")
    .eq("leader_id", user.id);

  if (!members || members.length === 0) return { data: [], error: null };

  const memberIds = (members as Pick<TeamMember, "member_id">[]).map((m) => m.member_id);

  const { data: profiles } = await (admin as SupabaseAny)
    .from("user_profiles")
    .select("id, full_name")
    .in("id", memberIds);

  const nameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
    nameMap.set(p.id, p.full_name || "Unknown");
  }

  const { data: events } = await (admin as SupabaseAny)
    .from("d2c_activity_log")
    .select("user_id, event_type, metadata, created_at")
    .in("user_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const result = ((events ?? []) as {
    user_id: string;
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }[]).map((e) => ({
    member_name: nameMap.get(e.user_id) || "Team Member",
    event_type: e.event_type,
    description: describeEvent(e.event_type, e.metadata),
    created_at: e.created_at,
  }));

  return { data: result, error: null };
}

function describeEvent(type: string, meta: Record<string, unknown>): string {
  const name = (meta.contact_name as string) || "a contact";
  switch (type) {
    case "contact_created": return `Added ${name}`;
    case "step_changed": return `Moved ${name} to ${(meta.to_step as string || "next step").replace(/_/g, " ")}`;
    case "sample_sent": return `Sent samples to ${name}`;
    case "sample_confirmed": return `${name} confirmed samples received`;
    case "followup_completed": return `Completed follow-up for ${name}`;
    case "outcome_changed": return `${name} marked as ${meta.outcome as string || "updated"}`;
    case "invite_sent": return `Invited ${(meta.invitee_name as string) || (meta.member_name as string) || "a team member"}`;
    case "member_joined": return `${(meta.member_name as string) || "A member"} joined the team`;
    case "purchase_matched": return `Matched purchase for ${name}`;
    case "downline_synced": return `Synced downline data`;
    default: return `Activity: ${type}`;
  }
}
