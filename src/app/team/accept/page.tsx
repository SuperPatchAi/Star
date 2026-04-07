import { redirect } from "next/navigation";
import Link from "next/link";
import { validateInviteToken } from "@/lib/actions/team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { AcceptInviteCard } from "./accept-invite-card";

export default async function TeamAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: token } = await searchParams;

  if (!token) {
    redirect("/dashboard");
  }

  const { valid, leaderName } = await validateInviteToken(token);

  if (!valid) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-center">
              Invalid Invite Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has already been used. Ask your
              team leader to send a new one.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <AcceptInviteCard token={token} leaderName={leaderName ?? "Your Leader"} />
    </div>
  );
}
