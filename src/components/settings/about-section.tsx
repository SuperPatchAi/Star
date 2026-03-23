"use client";

import { useState } from "react";
import { Info, RotateCcw, HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resetOnboarding } from "@/lib/actions/onboarding";

export function AboutSection() {
  const [replaying, setReplaying] = useState<string | null>(null);

  const handleReplay = async (type: "carousel" | "tour") => {
    setReplaying(type);
    await resetOnboarding(type === "carousel" ? "carousel" : "tour");
    window.location.href = type === "carousel" ? "/onboarding" : "/dashboard";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardDescription>App information and help.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* App info */}
        <div className="flex items-center gap-3">
          <Info className="size-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">SuperPatch S.T.A.R.</p>
            <p className="text-xs text-muted-foreground">
              Sample. Track. Align. Recruit.
            </p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            v0.1.0
          </span>
        </div>

        {/* Help / Support */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Support</p>
              <p className="text-xs text-muted-foreground">
                Get help or report an issue.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:support@superpatch.com">
              Contact
            </a>
          </Button>
        </div>

        {/* Replay onboarding */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Onboarding</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RotateCcw className="size-5 text-muted-foreground" />
              <p className="text-sm">Replay Welcome Tour</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReplay("carousel")}
              disabled={replaying !== null}
            >
              {replaying === "carousel" ? "Loading..." : "Replay"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="size-5 text-muted-foreground" />
              <p className="text-sm">Replay Interactive Tour</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReplay("tour")}
              disabled={replaying !== null}
            >
              {replaying === "tour" ? "Loading..." : "Replay"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
