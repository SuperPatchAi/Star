"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Phone,
  MessageSquare,
  Mail,
  Video,
  CheckCircle,
  Check,
  ChevronRight,
  Package,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  UserPlus,
  Plus,
  Trash2,
} from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import {
  FOLLOWUP_SEQUENCE,
  interpolateFollowUpTemplate,
} from "@/data/followup-templates";
import { joinCategoryLabels } from "@/data/discovery-categories";
import { getProductById } from "@/data/products";
import { createContact } from "@/lib/actions/contacts";

interface ReferralEntry {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface StepFollowUpProps {
  contactId?: string;
  followUpDay?: number;
  onAdvance?: () => void;
  contactFirstName?: string;
  sampleReceived?: boolean;
  onSampleReceived?: (received: boolean) => void;
  continueLabel?: string;
  onContinue?: () => void;
  discoveryCategories: string[];
  discoveryQualityRating: number | null;
  followupRatings: Record<string, number>;
  onFollowupRatingChange: (dayIndex: number, rating: number) => void;
  sampleProducts: string[];
}

const GOAL = "Track improvement and build proof through consistent follow-up";

const channelIcons: Record<string, React.ReactNode> = {
  Text: <MessageSquare className="size-3.5" />,
  Call: <Phone className="size-3.5" />,
  "Call/Text": <Phone className="size-3.5" />,
  "Text/Call": <Phone className="size-3.5" />,
  Email: <Mail className="size-3.5" />,
  Zoom: <Video className="size-3.5" />,
  "Zoom Call": <Video className="size-3.5" />,
};

function getTrendIcon(current: number, baseline: number) {
  if (current > baseline) return <TrendingUp className="size-3.5 text-green-600" />;
  if (current < baseline) return <TrendingDown className="size-3.5 text-red-600" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

function getTrendColor(current: number, baseline: number) {
  if (current > baseline) return "text-green-600 dark:text-green-400";
  if (current < baseline) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export function StepFollowUp({
  contactId,
  followUpDay = 0,
  onAdvance,
  contactFirstName,
  sampleReceived = false,
  onSampleReceived,
  continueLabel = "Continue",
  onContinue,
  discoveryCategories,
  discoveryQualityRating,
  followupRatings,
  onFollowupRatingChange,
  sampleProducts,
}: StepFollowUpProps) {
  const [advancing, setAdvancing] = useState(false);
  const emptyReferral = (): ReferralEntry => ({ firstName: "", lastName: "", phone: "", email: "" });
  const [referrals, setReferrals] = useState<ReferralEntry[]>([emptyReferral()]);

  const categoryLabel = joinCategoryLabels(discoveryCategories);
  const firstProduct = sampleProducts.length > 0 ? getProductById(sampleProducts[0]) : null;
  const productName = firstProduct?.name ?? "SuperPatch";
  const baseline = discoveryQualityRating ?? 5;

  const ratingsEntries = useMemo(() => {
    return Object.entries(followupRatings)
      .map(([key, val]) => ({ dayIndex: Number(key), rating: val }))
      .sort((a, b) => a.dayIndex - b.dayIndex);
  }, [followupRatings]);

  const hasRatings = ratingsEntries.length > 0;

  const lastRecordedRating = useMemo(() => {
    if (ratingsEntries.length === 0) return baseline;
    return ratingsEntries[ratingsEntries.length - 1].rating;
  }, [ratingsEntries, baseline]);

  function getInterpolatedScript(template: string, dayIndex: number) {
    const currentDayRating = followupRatings[String(dayIndex)];
    return interpolateFollowUpTemplate(template, {
      firstName: contactFirstName ?? "{{FirstName}}",
      productName,
      categoryLabel,
      baseline,
      lastRating: lastRecordedRating,
      currentRating: currentDayRating ?? lastRecordedRating,
      improvement: (currentDayRating ?? lastRecordedRating) - baseline,
    });
  }

  const updateReferral = (index: number, field: keyof ReferralEntry, value: string) => {
    setReferrals((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addReferral = () => setReferrals((prev) => [...prev, emptyReferral()]);

  const removeReferral = (index: number) => {
    setReferrals((prev) => (prev.length <= 1 ? [emptyReferral()] : prev.filter((_, i) => i !== index)));
  };

  const validReferrals = referrals.filter((r) => r.firstName.trim() && r.lastName.trim());

  const handleAdvance = async () => {
    if (!onAdvance) return;
    setAdvancing(true);
    try {
      if (currentStep?.includesReferral && validReferrals.length > 0) {
        await Promise.all(
          validReferrals.map((r) =>
            createContact({
              first_name: r.firstName.trim(),
              last_name: r.lastName.trim(),
              phone: r.phone.trim() || null,
              email: r.email.trim() || null,
              product_ids: [],
              current_step: "add_contact",
              notes: `Referral from ${contactFirstName ?? "a contact"}`,
            })
          )
        );
      }
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  };

  const currentStep = FOLLOWUP_SEQUENCE[followUpDay];
  const allComplete = followUpDay >= FOLLOWUP_SEQUENCE.length;

  const isZoomStep = currentStep?.channel === "Zoom" || currentStep?.channel === "Zoom Call";
  const zoomBlocked = isZoomStep && !sampleReceived;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{GOAL}</p>

      {/* Improvement Trajectory Card */}
      {hasRatings && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Improvement Tracker
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Baseline:</span>
            <span className="font-bold text-foreground">{baseline}/10</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ratingsEntries.map(({ dayIndex, rating }) => {
              const step = FOLLOWUP_SEQUENCE[dayIndex];
              const dayLabel = step?.day ?? `Day ${dayIndex}`;
              return (
                <div
                  key={dayIndex}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1"
                >
                  <span className="text-xs text-muted-foreground">{dayLabel}</span>
                  <span className={cn("text-xs font-bold", getTrendColor(rating, baseline))}>
                    {rating}/10
                  </span>
                  {getTrendIcon(rating, baseline)}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  <Label
                    htmlFor="sample-received-zoom"
                    className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5"
                  >
                    <Package className="size-3.5" />
                    Samples Received
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted rounded-lg p-3 text-sm relative group whitespace-pre-wrap">
            {getInterpolatedScript(currentStep.template, followUpDay)}
            <ShareCopyButton
              text={getInterpolatedScript(currentStep.template, followUpDay)}
              className="absolute top-2 right-2 size-9 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            />
          </div>

          {currentStep.checkboxLabel && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="sample-received"
                checked={sampleReceived}
                onCheckedChange={(checked) => onSampleReceived?.(checked === true)}
              />
              <Label
                htmlFor="sample-received"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Package className="size-3.5" />
                {currentStep.checkboxLabel}
              </Label>
            </div>
          )}

          {/* Rating slider for days that include a rating check */}
          {currentStep.includesRating && (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <Label className="text-sm font-medium">
                How would you rate your {categoryLabel} today? (1-10)
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[followupRatings[String(followUpDay)] ?? baseline]}
                  onValueChange={([val]) => onFollowupRatingChange(followUpDay, val)}
                  className="flex-1"
                />
                <span className="text-2xl font-bold tabular-nums min-w-[2.5rem] text-center">
                  {followupRatings[String(followUpDay)] ?? baseline}
                </span>
              </div>
              {discoveryQualityRating != null && (
                <div className="flex items-center gap-1.5 text-xs">
                  {getTrendIcon(
                    followupRatings[String(followUpDay)] ?? baseline,
                    baseline
                  )}
                  <span
                    className={getTrendColor(
                      followupRatings[String(followUpDay)] ?? baseline,
                      baseline
                    )}
                  >
                    Started at {baseline}/10, now{" "}
                    {followupRatings[String(followUpDay)] ?? baseline}/10 (
                    {(followupRatings[String(followUpDay)] ?? baseline) - baseline >= 0 ? "+" : ""}
                    {(followupRatings[String(followUpDay)] ?? baseline) - baseline})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Referral capture form */}
          {currentStep.includesReferral && (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-primary" />
                <Label className="text-sm font-medium">Referrals</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Add anyone they mentioned. These will be saved as new contacts.
              </p>
              <div className="space-y-3">
                {referrals.map((ref, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Referral {idx + 1}
                      </span>
                      {referrals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReferral(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="First Name"
                        value={ref.firstName}
                        onChange={(e) => updateReferral(idx, "firstName", e.target.value)}
                      />
                      <Input
                        placeholder="Last Name"
                        value={ref.lastName}
                        onChange={(e) => updateReferral(idx, "lastName", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Phone"
                        type="tel"
                        value={ref.phone}
                        onChange={(e) => updateReferral(idx, "phone", e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={ref.email}
                        onChange={(e) => updateReferral(idx, "email", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addReferral}
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Another
              </Button>
            </div>
          )}

          {onAdvance && (
            <Button
              className="w-full h-10"
              onClick={handleAdvance}
              disabled={advancing || zoomBlocked}
            >
              <Check className="size-4 mr-1.5" />
              {currentStep.includesReferral && validReferrals.length > 0
                ? `Save ${validReferrals.length} Referral${validReferrals.length > 1 ? "s" : ""} & Advance`
                : "Mark Done & Advance"}
            </Button>
          )}
        </div>
      )}

      {allComplete && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 text-center space-y-3">
          <CheckCircle className="size-6 mx-auto text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            All follow-up steps complete
          </p>
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
          {FOLLOWUP_SEQUENCE.map((step, index) => {
            const isComplete = index < followUpDay;
            const isCurrent = index === followUpDay;
            const isFuture = index > followUpDay;
            const scriptText = getInterpolatedScript(step.template, index);
            return (
              <div key={index} className={cn("relative flex gap-4", isFuture && "opacity-40")}>
                <div
                  className={cn(
                    "relative z-10 flex size-[44px] shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-bold transition-colors",
                    isCurrent && "border-primary text-primary",
                    isComplete && "border-green-500 bg-green-500 text-white",
                    isFuture && "border-muted-foreground/20 text-muted-foreground/30 bg-muted/50",
                    !isCurrent && !isComplete && !isFuture && "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : step.day.replace("DAY ", "D")}
                </div>

                <div
                  className={cn(
                    "flex-1 border-b border-border/60 pb-4",
                    isComplete && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isComplete && "line-through",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {step.action}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {channelIcons[step.channel] || <MessageSquare className="size-3.5" />}
                      <span>{step.channel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{step.day}</p>
                  {isCurrent && (
                    <div className="bg-muted rounded-lg p-3 text-sm relative group whitespace-pre-wrap">
                      {scriptText}
                      <ShareCopyButton
                        text={scriptText}
                        className="absolute top-2 right-2 size-9 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}
                  {isComplete && step.includesRating && followupRatings[String(index)] != null && (
                    <div className="flex items-center gap-1.5 text-xs mt-1">
                      {getTrendIcon(followupRatings[String(index)], baseline)}
                      <span className={getTrendColor(followupRatings[String(index)], baseline)}>
                        Rated {followupRatings[String(index)]}/10
                      </span>
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
