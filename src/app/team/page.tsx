import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import {
  getTeamOverview,
  getTeamLeaderboard,
  getStrugglingMembers,
  getTeamActivity,
  getDownlineList,
} from "@/lib/actions/team";
import { SyncDownlineButton } from "@/components/team/sync-downline-button";
import { TeamOverviewCards } from "@/components/team/team-overview-cards";
import { TeamNeedsAttention } from "@/components/team/team-needs-attention";
import { TeamLeaderboard } from "@/components/team/team-leaderboard";
import { TeamActivityFeed } from "@/components/team/team-activity-feed";
import { DownlineList } from "@/components/team/downline-list";

export default async function TeamPage() {
  const { profile } = await getAuthUser();

  if (!profile?.bydesign_rep_did) {
    redirect("/settings?message=Connect+your+ByDesign+account+to+view+your+team");
  }

  const [overviewRes, leaderboardRes, strugglingRes, activityRes, downlineRes] =
    await Promise.all([
      getTeamOverview(),
      getTeamLeaderboard("wins", "month"),
      getStrugglingMembers("inactive", 5),
      getTeamActivity(20),
      getDownlineList(),
    ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Team Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor your downline performance and activity.
          </p>
        </div>
        <SyncDownlineButton />
      </div>

      <TeamOverviewCards overview={overviewRes.data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <TeamNeedsAttention members={strugglingRes.data ?? []} />
          <TeamLeaderboard entries={leaderboardRes.data ?? []} />
        </div>
        <TeamActivityFeed events={activityRes.data ?? []} />
      </div>

      <DownlineList downline={downlineRes.data ?? []} />
    </div>
  );
}
