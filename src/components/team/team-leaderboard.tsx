"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { TeamLeaderboardEntry } from "@/lib/db/types";

interface TeamLeaderboardProps {
  entries: TeamLeaderboardEntry[];
}

function rankColor(rank: number): string {
  if (rank === 1) return "bg-amber-500 text-white";
  if (rank === 2) return "bg-zinc-400 text-white";
  if (rank === 3) return "bg-amber-700 text-white";
  return "bg-muted text-muted-foreground";
}

export function TeamLeaderboard({ entries }: TeamLeaderboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No leaderboard data yet. Team members need to start conversations to
            appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.member_id}
                className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold shrink-0 ${rankColor(entry.rank)}`}
                >
                  {entry.rank}
                </span>
                <span className="text-sm font-medium flex-1 truncate">
                  {entry.member_name}
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {entry.metric_value} wins
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
