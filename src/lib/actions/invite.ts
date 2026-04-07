"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

/**
 * Links a newly signed-up user to their leader's team using the invite token
 * stored in auth metadata during signup. Uses the admin client because this
 * runs in a trusted server context with the userId provided directly.
 */
export async function processPostSignupInvite(userId: string): Promise<{
  linked: boolean;
  error: string | null;
}> {
  const admin = await createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    return { linked: false, error: "User not found" };
  }

  const inviteToken = authUser.user.user_metadata?.invite_token as
    | string
    | undefined;
  if (!inviteToken) {
    return { linked: false, error: null };
  }

  const { data: invite } = await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .select("id, leader_id, rep_did, level")
    .eq("invite_token", inviteToken)
    .neq("invite_status", "accepted")
    .single();

  if (!invite) {
    return { linked: false, error: "Invite token not found in downline cache" };
  }

  await (admin as SupabaseAny).from("d2c_team_members").upsert(
    {
      leader_id: invite.leader_id,
      member_id: userId,
      member_rep_did: invite.rep_did,
      level: invite.level,
    },
    { onConflict: "leader_id,member_id" }
  );

  await (admin as SupabaseAny)
    .from("d2c_downline_cache")
    .update({ star_user_id: userId, invite_status: "accepted" })
    .eq("id", invite.id);

  logActivity("member_joined", null, {
    member_name: authUser.user.user_metadata?.full_name || authUser.user.email,
    leader_id: invite.leader_id,
  }).catch(() => {});

  return { linked: true, error: null };
}
