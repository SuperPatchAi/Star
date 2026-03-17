"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import {
  DISCOVERY_CATEGORIES,
  TRIED_BEFORE_OPTIONS,
  DURATION_OPTIONS,
  getCategoryByKey,
} from "@/data/discovery-categories";
import { HelpCircle, ChevronRight } from "lucide-react";

interface StepDiscoveryV2Props {
  discoveryCategory: string | null;
  discoveryQualityRating: number | null;
  discoveryDuration: string | null;
  discoveryTriedBefore: string[];
  discoveryTriedResult: string | null;
  contactFirstName: string;
  onCategoryChange: (key: string) => void;
  onQualityRatingChange: (rating: number) => void;
  onDurationChange: (duration: string) => void;
  onTriedBeforeChange: (items: string[]) => void;
  onTriedResultChange: (result: string) => void;
  onContinue: () => void;
}

function getRatingLabel(value: number): string {
  if (value <= 2) return "Terrible";
  if (value <= 4) return "Poor";
  if (value === 5) return "Okay";
  if (value <= 7) return "Good";
  if (value <= 9) return "Great";
  return "Excellent";
}

export function StepDiscoveryV2({
  discoveryCategory,
  discoveryQualityRating,
  discoveryDuration,
  discoveryTriedBefore,
  discoveryTriedResult,
  contactFirstName,
  onCategoryChange,
  onQualityRatingChange,
  onDurationChange,
  onTriedBeforeChange,
  onTriedResultChange,
  onContinue,
}: StepDiscoveryV2Props) {
  const [otherText, setOtherText] = useState("");

  const category = discoveryCategory
    ? getCategoryByKey(discoveryCategory)
    : null;
  const categoryLabel = category?.categoryLabel ?? "your quality of life";

  const q1Script =
    "What's the one thing that could improve your quality of life right now? Is it pain management, improved mobility? Better sleep?";
  const q2Script = `On a scale of 1-10, how would you rate ${categoryLabel} right now?`;
  const q3Script = "How long have you been dealing with this?";
  const q4Script = `What else have you tried or done to deal with ${categoryLabel}?`;
  const q5Script = "How did that work out for you?";

  const toggleTriedBefore = (item: string) => {
    const next = discoveryTriedBefore.includes(item)
      ? discoveryTriedBefore.filter((i) => i !== item)
      : [...discoveryTriedBefore, item];
    onTriedBeforeChange(next);
  };

  const canContinue =
    discoveryCategory !== null && discoveryQualityRating !== null;

  return (
    <div className="space-y-4">
      {/* Question 1: Category Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              Q1
            </span>
            <HelpCircle className="size-4" />
            What area of life?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative bg-muted/50 rounded-lg p-3 pr-10">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{q1Script}&rdquo;
            </p>
            <ShareCopyButton
              text={q1Script}
              title="Discovery Question"
              className="absolute top-1 right-1"
            />
          </div>
          <Select
            value={discoveryCategory ?? undefined}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select their top concern..." />
            </SelectTrigger>
            <SelectContent>
              {DISCOVERY_CATEGORIES.map((cat) => (
                <SelectItem key={cat.key} value={cat.key}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Question 2: Quality Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              Q2
            </span>
            <HelpCircle className="size-4" />
            Rate it 1-10
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-muted/50 rounded-lg p-3 pr-10">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{q2Script}&rdquo;
            </p>
            <ShareCopyButton
              text={q2Script}
              title="Discovery Question"
              className="absolute top-1 right-1"
            />
          </div>
          <div className="text-center">
            <span className="text-4xl font-bold tabular-nums">
              {discoveryQualityRating ?? "—"}
            </span>
            {discoveryQualityRating !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {getRatingLabel(discoveryQualityRating)}
              </p>
            )}
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={
              discoveryQualityRating !== null
                ? [discoveryQualityRating]
                : undefined
            }
            defaultValue={[5]}
            onValueChange={([val]) => onQualityRatingChange(val)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 — Terrible</span>
            <span>5 — Okay</span>
            <span>10 — Excellent</span>
          </div>
        </CardContent>
      </Card>

      {/* Question 3: Duration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              Q3
            </span>
            <HelpCircle className="size-4" />
            How long?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative bg-muted/50 rounded-lg p-3 pr-10">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{q3Script}&rdquo;
            </p>
            <ShareCopyButton
              text={q3Script}
              title="Discovery Question"
              className="absolute top-1 right-1"
            />
          </div>
          <Select
            value={discoveryDuration ?? undefined}
            onValueChange={onDurationChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration..." />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Question 4: What They've Tried */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              Q4
            </span>
            <HelpCircle className="size-4" />
            What have they tried?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative bg-muted/50 rounded-lg p-3 pr-10">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{q4Script}&rdquo;
            </p>
            <ShareCopyButton
              text={q4Script}
              title="Discovery Question"
              className="absolute top-1 right-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TRIED_BEFORE_OPTIONS.map((item) => {
              const checked = discoveryTriedBefore.includes(item);
              const id = `tried-${item.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <div key={item} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() => toggleTriedBefore(item)}
                  />
                  <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                    {item}
                  </Label>
                </div>
              );
            })}
          </div>
          {discoveryTriedBefore.includes("Other") && (
            <Input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="What else have they tried?"
              className="mt-2"
            />
          )}
        </CardContent>
      </Card>

      {/* Question 5: Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              Q5
            </span>
            <HelpCircle className="size-4" />
            How did it work out?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative bg-muted/50 rounded-lg p-3 pr-10">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{q5Script}&rdquo;
            </p>
            <ShareCopyButton
              text={q5Script}
              title="Discovery Question"
              className="absolute top-1 right-1"
            />
          </div>
          <Textarea
            value={discoveryTriedResult ?? ""}
            onChange={(e) => onTriedResultChange(e.target.value)}
            placeholder="Their response..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full"
      >
        Continue to Send Samples
        <ChevronRight className="size-4 ml-1.5" />
      </Button>
    </div>
  );
}
