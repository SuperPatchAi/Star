"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Link2,
  CheckCircle,
  Mail,
  Phone,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { generateInviteLink } from "@/lib/actions/team";
import type { DownlineMember } from "@/lib/db/types";
import { MemberCoachingDrawer } from "./member-coaching-drawer";

interface DownlineListProps {
  downline: DownlineMember[];
}

function statusBadgeVariant(
  status: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const lower = status.toLowerCase();
  if (lower === "active") return "default";
  if (lower === "inactive" || lower === "terminated") return "destructive";
  return "secondary";
}

export function DownlineList({ downline }: DownlineListProps) {
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filtered = search.trim()
    ? downline.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.rep_name?.toLowerCase().includes(q) ||
          m.rank?.toLowerCase().includes(q) ||
          m.rep_did.includes(q)
        );
      })
    : downline;

  function handleInvite(member: DownlineMember) {
    setInvitingId(member.id);
    startTransition(async () => {
      const { url, error } = await generateInviteLink(member.id);
      setInvitingId(null);

      if (error || !url) {
        toast.error(error || "Failed to generate invite link");
        return;
      }

      const shareData = {
        title: "Join me on S.T.A.R.!",
        text: `Hey${member.rep_name ? ` ${member.rep_name.split(" ")[0]}` : ""}! I'm inviting you to join S.T.A.R. — our sales enablement app.`,
        url,
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          toast.success("Invite shared");
        } catch {
          await copyToClipboard(url);
        }
      } else {
        await copyToClipboard(url);
      }
    });
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }

  function handleRowClick(member: DownlineMember) {
    if (member.star_user_id) {
      setSelectedMemberId(member.star_user_id);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            My Downline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {downline.length === 0 ? (
            <div className="text-center py-6">
              <RefreshCw className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Sync your downline to see team members
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Use the &ldquo;Sync Downline&rdquo; button above to pull your
                team from ByDesign.
              </p>
            </div>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, rank, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Phone</th>
                      <th className="pb-2 pr-4 font-medium">Rank</th>
                      <th className="pb-2 pr-4 font-medium text-center">Lvl</th>
                      <th className="pb-2 pr-4 font-medium text-right">PV</th>
                      <th className="pb-2 pr-4 font-medium text-right">GV</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <tr
                        key={m.id}
                        className={`transition-colors hover:bg-muted/50 ${m.star_user_id ? "cursor-pointer" : ""}`}
                        onClick={() => handleRowClick(m)}
                      >
                        <td className="py-3 pr-4 font-medium">
                          {m.rep_name || "Unknown"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {m.email ? (
                            <a
                              href={`mailto:${m.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{m.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {m.phone ? (
                            <a
                              href={`tel:${m.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <Phone className="size-3 shrink-0" />
                              {m.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {m.rank || "—"}
                        </td>
                        <td className="py-3 pr-4 text-center tabular-nums">
                          {m.level ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {m.pv.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {m.gv.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusBadgeVariant(m.rep_status)}>
                            {m.rep_status || "Unknown"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <InviteBadgeOrButton
                            member={m}
                            invitingId={invitingId}
                            isPending={isPending}
                            onInvite={handleInvite}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-border -mx-6">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    className={`px-6 py-3 ${m.star_user_id ? "cursor-pointer active:bg-muted" : ""}`}
                    onClick={() => handleRowClick(m)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {m.rep_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.rank || "No rank"} · Lvl {m.level ?? "—"} · PV{" "}
                          {m.pv.toLocaleString()}
                        </p>
                      </div>
                      <InviteBadgeOrButton
                        member={m}
                        invitingId={invitingId}
                        isPending={isPending}
                        onInvite={handleInvite}
                      />
                    </div>
                    {(m.email || m.phone) && (
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate"
                          >
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{m.email}</span>
                          </a>
                        )}
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors shrink-0"
                          >
                            <Phone className="size-3 shrink-0" />
                            {m.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filtered.length === 0 && search.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members match &ldquo;{search}&rdquo;
                </p>
              )}
            </>
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

function InviteBadgeOrButton({
  member,
  invitingId,
  isPending,
  onInvite,
}: {
  member: DownlineMember;
  invitingId: string | null;
  isPending: boolean;
  onInvite: (m: DownlineMember) => void;
}) {
  if (member.star_user_id) {
    return (
      <Badge
        variant="default"
        className="bg-green-600 hover:bg-green-600 gap-1"
      >
        <CheckCircle className="size-3" />
        Connected
      </Badge>
    );
  }

  if (member.invite_status === "invited") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Mail className="size-3" />
        Invited
      </Badge>
    );
  }

  const loading = isPending && invitingId === member.id;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        onInvite(member);
      }}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Link2 className="size-3.5" />
      )}
      Invite
    </Button>
  );
}
