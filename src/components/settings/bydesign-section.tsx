"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Link2, Unlink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { connectByDesign, disconnectByDesign } from "@/lib/actions/bydesign";
import type { UserProfile } from "@/lib/db/types";

interface ByDesignSectionProps {
  profile: UserProfile | null;
}

export function ByDesignSection({ profile }: ByDesignSectionProps) {
  const isConnected = !!profile?.bydesign_rep_did;
  const router = useRouter();

  const [repDID, setRepDID] = useState(profile?.bydesign_rep_did ?? "");
  const [apiUsername, setApiUsername] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!repDID.trim()) {
      toast.error("Enter your ByDesign Rep ID");
      return;
    }

    setConnecting(true);
    const { error } = await connectByDesign({
      repDID: repDID.trim(),
      apiUsername: apiUsername.trim() || undefined,
      apiPassword: apiPassword || undefined,
    });
    setConnecting(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success("ByDesign connected");
      router.refresh();
    }
  }, [repDID, apiUsername, apiPassword]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    const { error } = await disconnectByDesign();
    setDisconnecting(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success("ByDesign disconnected");
      router.refresh();
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ByDesign Integration
              {isConnected && (
                <Badge variant="secondary" className="font-normal text-xs">
                  Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect your ByDesign account to sync your downline and enable team coaching.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Rep ID</p>
                  <p className="text-sm text-muted-foreground">{profile?.bydesign_rep_did}</p>
                </div>
                {profile?.bydesign_rank && (
                  <Badge variant="outline" className="text-xs">
                    {profile.bydesign_rank}
                  </Badge>
                )}
              </div>
              {profile?.bydesign_connected_at && (
                <p className="text-xs text-muted-foreground">
                  Connected {new Date(profile.bydesign_connected_at).toLocaleDateString()}
                </p>
              )}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Unlink className="size-4 mr-2" />
                  Disconnect ByDesign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect ByDesign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your ByDesign connection. Your team data in
                    S.T.A.R. will be preserved, but downline sync will stop.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {disconnecting && <Loader2 className="size-4 animate-spin mr-2" />}
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="rep-did">ByDesign Rep ID</Label>
              <Input
                id="rep-did"
                value={repDID}
                onChange={(e) => setRepDID(e.target.value)}
                placeholder="e.g. 12345"
              />
              <p className="text-xs text-muted-foreground">
                Your numeric Rep ID from the ByDesign backoffice.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">API Credentials (Optional)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                If you have personal API credentials, enter them below. They will be
                encrypted and stored securely. If left blank, shared credentials are used.
              </p>
              <div className="space-y-2">
                <Label htmlFor="api-username">API Username</Label>
                <Input
                  id="api-username"
                  value={apiUsername}
                  onChange={(e) => setApiUsername(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-password">API Password</Label>
                <Input
                  id="api-password"
                  type="password"
                  value={apiPassword}
                  onChange={(e) => setApiPassword(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <Button onClick={handleConnect} disabled={connecting || !repDID.trim()}>
              {connecting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Link2 className="size-4 mr-2" />
              )}
              {connecting ? "Connecting..." : "Connect ByDesign"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
