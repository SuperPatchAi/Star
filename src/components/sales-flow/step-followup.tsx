"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Mail, Video, CheckCircle, Check, ChevronRight, Package, AlertCircle } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import { interpolateScript } from "@/lib/interpolate-script";
import type { RoadmapFollowUp } from "@/types/roadmap";

interface StepFollowUpProps {
  data: RoadmapFollowUp;
  contactId?: string;
  followUpDay?: number;
  onAdvance?: () => void;
  contactFirstName?: string;
  sampleReceived?: boolean;
  onSampleReceived?: (received: boolean) => void;
  continueLabel?: string;
  onContinue?: () => void;
}

const channelIcons: Record<string, React.ReactNode> = {
  "Text": <MessageSquare className="size-3.5" />,
  "Call": <Phone className="size-3.5" />,
  "Call/Text": <Phone className="size-3.5" />,
  "Text/Call": <Phone className="size-3.5" />,
  "Email": <Mail className="size-3.5" />,
  "Zoom Call": <Video className="size-3.5" />,
};

export function StepFollowUp({
  data,
  contactId,
  followUpDay = 0,
  onAdvance,
  contactFirstName,
  sampleReceived = false,
  onSampleReceived,
  continueLabel = "Continue",
  onContinue,
}: StepFollowUpProps) {
  const [advancing, setAdvancing] = useState(false);

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
  const hasCheckbox = currentStep?.checkbox_label;

  const isZoomStep = currentStep?.channel === "Zoom Call";
  const zoomBlocked = isZoomStep && !sampleReceived;

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

          {zoomBlocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950 dark:border-amber-800">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Confirm samples were received before scheduling the Zoom call.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sample-received-zoom"
                    checked={sampleReceived}
                    onCheckedChange={(checked) => onSampleReceived?.(checked === true)}
                  />
                  <Label htmlFor="sample-received-zoom" className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <Package className="size-3.5" />
                    Samples Received
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted rounded-lg p-3 text-sm relative group whitespace-pre-wrap">
            {interpolateScript(currentStep.template, contactFirstName)}
            <ShareCopyButton
              text={interpolateScript(currentStep.template, contactFirstName)}
              className="absolute top-2 right-2 size-9 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            />
          </div>

          {hasCheckbox && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="sample-received"
                checked={sampleReceived}
                onCheckedChange={(checked) => onSampleReceived?.(checked === true)}
              />
              <Label htmlFor="sample-received" className="text-sm font-medium flex items-center gap-1.5">
                <Package className="size-3.5" />
                {currentStep.checkbox_label}
              </Label>
            </div>
          )}

          {onAdvance && (
            <Button
              className="w-full h-10"
              onClick={handleAdvance}
              disabled={advancing || zoomBlocked}
            >
              <Check className="size-4 mr-1.5" />
              Mark Done &amp; Advance
            </Button>
          )}
        </div>
      )}

      {allComplete && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 text-center space-y-3">
          <CheckCircle className="size-6 mx-auto text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">All follow-up steps complete</p>
          {onContinue && (
            <Button onClick={onContinue} className="w-full">
              {continueLabel}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
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
                    <div className="bg-muted rounded-lg p-3 text-sm relative group whitespace-pre-wrap">
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
    </div>
  );
}
