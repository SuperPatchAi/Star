"use client";

import { useState, useCallback } from "react";
import { KeyRound, LogOut, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/actions/profile";

interface AccountSectionProps {
  email: string;
}

export function AccountSection({ email }: AccountSectionProps) {
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = useCallback(async () => {
    setResetting(true);
    const { error } = await requestPasswordReset();
    setResetting(false);
    if (error) {
      toast.error(error);
    } else {
      setResetSent(true);
      toast.success("Password reset email sent");
    }
  }, []);

  const handleSignOut = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Security and session management.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Password reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-xs text-muted-foreground">
                {resetSent
                  ? `Reset link sent to ${email}`
                  : "We'll send a reset link to your email."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePasswordReset}
            disabled={resetting || resetSent}
          >
            {resetting ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Mail className="size-4 mr-1.5" />
            )}
            {resetSent ? "Sent" : "Send Link"}
          </Button>
        </div>

        {/* Sign out */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <LogOut className="size-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                End your current session.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
