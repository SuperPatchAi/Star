"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, MessageSquare, CheckCircle, Package, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getOnboardingState, dismissOnboarding } from "@/lib/actions/onboarding";
import type { OnboardingChecklist } from "@/lib/db/types";
import { ChecklistItem } from "./checklist-item";
import { ChecklistCelebration } from "./checklist-celebration";

const CHECKLIST_ITEMS: {
  key: keyof OnboardingChecklist;
  label: string;
  icon: typeof UserPlus;
}[] = [
  { key: "add_first_contact", label: "Add your first contact", icon: UserPlus },
  { key: "start_first_conversation", label: "Start your first conversation", icon: MessageSquare },
  { key: "complete_sales_step", label: "Complete a sales step", icon: CheckCircle },
  { key: "send_first_sample", label: "Send your first sample", icon: Package },
  { key: "setup_followup", label: "Set up a follow-up", icon: Calendar },
];

export function GettingStartedChecklist() {
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [step, setStep] = useState<string>("completed");
  const [dismissed, setDismissed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    async function load() {
      const state = await getOnboardingState();
      setStep(state.step);
      setChecklist(state.checklist);

      const allDone = Object.values(state.checklist).every(Boolean);
      if (allDone && state.step === "completed") {
        setCelebrating(true);
      }
    }
    load();
  }, []);

  const handleDismiss = useCallback(async () => {
    await dismissOnboarding();
    setDismissed(true);
  }, []);

  const handleCelebrationDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed || !checklist || (step !== "checklist" && !celebrating)) {
    return null;
  }

  if (celebrating) {
    return <ChecklistCelebration onDismiss={handleCelebrationDismiss} />;
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPct = (completedCount / totalCount) * 100;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Getting Started</h2>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss getting started"
        >
          <X className="size-4" />
        </Button>
      </div>
      <Progress value={progressPct} className="h-2" />
      <div className="space-y-0.5">
        {CHECKLIST_ITEMS.map((item) => (
          <ChecklistItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            completed={checklist[item.key]}
          />
        ))}
      </div>
    </div>
  );
}
