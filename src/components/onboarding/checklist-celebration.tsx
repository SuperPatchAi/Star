"use client";

import { useEffect } from "react";
import { PartyPopper } from "lucide-react";
import { dismissOnboarding } from "@/lib/actions/onboarding";

interface ChecklistCelebrationProps {
  onDismiss: () => void;
}

export function ChecklistCelebration({ onDismiss }: ChecklistCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      await dismissOnboarding();
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center dark:from-green-950/20 dark:to-emerald-950/20">
      <div className="flex size-12 items-center justify-center rounded-full bg-green-500 text-white animate-bounce">
        <PartyPopper className="size-6" />
      </div>
      <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
      <p className="text-sm text-muted-foreground">
        You&apos;ve completed all the getting started steps. Go close some deals!
      </p>
    </div>
  );
}
