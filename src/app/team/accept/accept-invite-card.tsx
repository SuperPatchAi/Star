"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/team";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export function AcceptInviteCard({
  token,
  leaderName,
}: {
  token: string;
  leaderName: string;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      const { error } = await acceptInvite(token);
      if (error) {
        toast.error(error);
        setAccepting(false);
        return;
      }
      toast.success(`You joined ${leaderName}'s team!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setAccepting(false);
    }
  }

  function handleDecline() {
    setDeclining(true);
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-center">
          Join {leaderName}&apos;s team?
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          <strong>{leaderName}</strong> has invited you to join their team on
          SuperPatch S.T.A.R. Accepting will let them see your sales activity
          and help you grow.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          className="w-full"
          disabled={accepting || declining}
          onClick={handleAccept}
        >
          {accepting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            "Accept & Join Team"
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={accepting || declining}
          onClick={handleDecline}
        >
          {declining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            "Decline"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
