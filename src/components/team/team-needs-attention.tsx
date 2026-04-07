"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import type { StrugglingMember } from "@/lib/db/types";
import { MemberCoachingDrawer } from "./member-coaching-drawer";

interface TeamNeedsAttentionProps {
  members: StrugglingMember[];
}

export function TeamNeedsAttention({ members }: TeamNeedsAttentionProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
              Everyone is doing great!
            </div>
          ) : (
            <div className="divide-y divide-border -mx-6">
              {members.map((m) => (
                <button
                  key={m.member_id}
                  onClick={() => setSelectedMemberId(m.member_id)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {m.member_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.days_inactive && m.days_inactive >= 7 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {m.days_inactive}d
                      </Badge>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground/50" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MemberCoachingDrawer
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onOpenChange={(open) => {
          if (!open) setSelectedMemberId(null);
        }}
      />
    </>
  );
}
