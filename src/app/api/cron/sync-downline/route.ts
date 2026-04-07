import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncDownlineForUser } from "@/lib/actions/team";
import { syncRepRank } from "@/lib/actions/bydesign";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await createAdminClient();

    const { data: profiles, error: profilesError } = await (admin as SupabaseAny)
      .from("user_profiles")
      .select("id, bydesign_rep_did")
      .not("bydesign_rep_did", "is", null);

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: profilesError?.message || "Failed to query profiles" },
        { status: 500 }
      );
    }

    const users = profiles as { id: string; bydesign_rep_did: string }[];
    const results: {
      userId: string;
      downlineSynced: number;
      rankSynced: boolean;
      error: string | null;
    }[] = [];

    for (const user of users) {
      const syncResult = await syncDownlineForUser(
        user.id,
        user.bydesign_rep_did,
        admin
      );

      const rankResult = await syncRepRank(user.id);

      results.push({
        userId: user.id,
        downlineSynced: syncResult.count,
        rankSynced: !rankResult.error,
        error: syncResult.error || rankResult.error,
      });
    }

    return NextResponse.json({
      ok: true,
      usersProcessed: users.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
