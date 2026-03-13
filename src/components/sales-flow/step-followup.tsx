"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Mail, CheckCircle, XCircle, Check } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { updateContactOutcome } from "@/lib/actions/contacts";
import { cn } from "@/lib/utils";
import { interpolateScript } from "@/lib/interpolate-script";
import type { RoadmapFollowUp } from "@/types/roadmap";

interface StepFollowUpProps {
  data: RoadmapFollowUp;
  contactId?: string;
  followUpDay?: number;
  onAdvance?: () => void;
  contactFirstName?: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  "Text": <MessageSquare className="size-3.5" />,
  "Call": <Phone className="size-3.5" />,
  "Call/Text": <Phone className="size-3.5" />,
  "Email": <Mail className="size-3.5" />,
};

export function StepFollowUp({ data, contactId, followUpDay = 0, onAdvance, contactFirstName }: StepFollowUpProps) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const handleOutcome = async (value: "won" | "lost") => {
    setOutcome(value);
    if (contactId) {
      await updateContactOutcome(contactId, value);
    }
  };

  const handleAdvance = async () => {
    if (!onAdvance) return;
    setAdvancing(true);
    try {
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  };

  const currentStep = data.sequence[followUpDay];
  const allComplete = followUpDay >= data.sequence.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data.goal}
      </p>

      {/* Current action card */}
      {currentStep && !allComplete && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                {currentStep.day.replace("DAY ", "D")}
              </span>
              <span className="text-sm font-semibold">{currentStep.action}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {channelIcons[currentStep.channel] || <MessageSquare className="size-3.5" />}
              <span>{currentStep.channel}</span>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm relative group">
            {interpolateScript(currentStep.template, contactFirstName)}
            <ShareCopyButton
              text={interpolateScript(currentStep.template, contactFirstName)}
              className="absolute top-2 right-2 size-9 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            />
          </div>
          {onAdvance && (
            <Button
              className="w-full h-10"
              onClick={handleAdvance}
              disabled={advancing}
            >
              <Check className="size-4 mr-1.5" />
              Mark Done &amp; Advance
            </Button>
          )}
        </div>
      )}

      {allComplete && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 text-center">
          <CheckCircle className="size-6 mx-auto text-green-600 dark:text-green-400 mb-2" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">All follow-up steps complete</p>
        </div>
      )}

      {/* Full sequence timeline */}
      <div className="relative">
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {data.sequence.map((step, index) => {
            const isComplete = index < followUpDay;
            const isCurrent = index === followUpDay;
            return (
              <div key={index} className="relative flex gap-4">
                <div className={cn(
                  "relative z-10 flex size-[44px] shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-bold transition-colors",
                  isCurrent && "border-primary text-primary",
                  isComplete && "border-green-500 bg-green-500 text-white",
                  !isCurrent && !isComplete && "border-muted-foreground/30 text-muted-foreground/50"
                )}>
                  {isComplete ? <Check className="size-4" /> : step.day.replace("DAY ", "D")}
                </div>

                <div className={cn(
                  "flex-1 border-b border-border/60 pb-4",
                  isComplete && "opacity-50"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn(
                      "text-sm font-semibold",
                      isComplete && "line-through"
                    )}>{step.action}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {channelIcons[step.channel] || <MessageSquare className="size-3.5" />}
                      <span>{step.channel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{step.day}</p>
                  {!isComplete && (
                    <div className="bg-muted rounded-lg p-3 text-sm relative group">
                      {interpolateScript(step.template, contactFirstName)}
                      <ShareCopyButton
                        text={interpolateScript(step.template, contactFirstName)}
                        className="absolute top-2 right-2 size-9 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome actions */}
      {contactId && (
        <div className="rounded-lg border border-border/50 bg-primary/5 p-4">
          {outcome ? (
            <div className="flex items-center gap-2 text-sm font-medium">
              {outcome === "won" ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-red-500" />
              )}
              Marked as {outcome === "won" ? "Won" : "Lost"}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">How did it go?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mark the outcome of this sales conversation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                  onClick={() => handleOutcome("won")}
                >
                  <CheckCircle className="size-4 mr-1.5" />
                  Won
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => handleOutcome("lost")}
                >
                  <XCircle className="size-4 mr-1.5" />
                  Lost
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
