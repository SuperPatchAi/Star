"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  Info,
  CheckCircle,
  ShieldAlert,
  Brain,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import { interpolateScript } from "@/lib/interpolate-script";
import type { RoadmapClosing, RoadmapObjectionHandling } from "@/types/roadmap";

interface StepCloseProps {
  closingData: RoadmapClosing;
  objectionData: RoadmapObjectionHandling;
  selectedTechnique: string | null;
  encounteredObjections: string[];
  onSelectTechnique: (technique: string) => void;
  onToggleObjection: (objection: string) => void;
  onContinue: () => void;
  contactFirstName?: string;
  baseline?: number;
  currentRating?: number;
  categoryLabel?: string;
  continueLabel?: string;
}

export function StepClose({
  closingData,
  objectionData,
  selectedTechnique,
  encounteredObjections,
  onSelectTechnique,
  onToggleObjection,
  onContinue,
  contactFirstName,
  baseline,
  currentRating,
  categoryLabel,
  continueLabel = "Continue",
}: StepCloseProps) {
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const preCloseText =
    baseline != null &&
    currentRating != null &&
    categoryLabel != null
      ? `You started at ${baseline}/10 for ${categoryLabel} and you're at ${currentRating}/10 now. ${closingData.pre_close}`
      : closingData.pre_close;

  const preCloseInterpolated = interpolateScript(preCloseText, contactFirstName);

  return (
    <div className="space-y-4">
      {/* Section A: Closing Techniques */}
      <p className="text-sm text-muted-foreground">
        Choose the closing technique that fits the conversation.
      </p>

      {/* Pre-close reminder */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950 dark:border-blue-800 group">
        <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">
          <strong>Pre-close:</strong> {preCloseInterpolated}
        </p>
        <ShareCopyButton
          text={preCloseInterpolated}
          className="size-9 min-h-[44px] min-w-[44px] shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Closing technique rows */}
      <div className="space-y-0">
        {closingData.techniques.map((technique, index) => {
          const isSelected = selectedTechnique === technique.name;
          return (
            <div
              key={index}
              className={cn(
                "flat-list-row cursor-pointer transition-colors",
                isSelected && "bg-primary/5"
              )}
              onClick={() => onSelectTechnique(technique.name)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-border"
                  )}
                >
                  {isSelected && (
                    <CheckCircle className="size-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{technique.icon}</span>
                    <p className="text-sm font-semibold">{technique.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <strong>When:</strong> {technique.when}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 ml-8" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap relative group">
                    {interpolateScript(technique.script, contactFirstName)}
                    <ShareCopyButton
                      text={interpolateScript(technique.script, contactFirstName)}
                      className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Section B: Objection Handling (collapsible) */}
      <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors">
          <span>Handle Objections</span>
          <div className="flex items-center gap-2">
            {encounteredObjections.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-950 px-2 py-0.5 rounded-full">
                <CheckCircle className="size-3.5" />
                {encounteredObjections.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                collapsibleOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-0">
            <p className="text-xs text-muted-foreground mb-2">
              Technique:{" "}
              <span className="font-medium">{objectionData.technique}</span>
            </p>
            {objectionData.objections.map((obj, index) => {
              const isEncountered = encounteredObjections.includes(obj.objection);
              const isExpanded = expandedIndex === index;

              return (
                <div
                  key={index}
                  className={cn(
                    "flat-list-row cursor-pointer transition-colors",
                    isExpanded && "bg-accent/30"
                  )}
                  onClick={() => {
                    setExpandedIndex(isExpanded ? null : index);
                    if (!isEncountered) onToggleObjection(obj.objection);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={cn(
                        "size-4 mt-0.5 shrink-0",
                        isEncountered ? "text-green-500" : "text-orange-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          &ldquo;{obj.objection}&rdquo;
                        </p>
                        {isEncountered && (
                          <CheckCircle className="size-3.5 text-green-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Lightbulb className="size-3 inline mr-1" />
                        Trigger: {obj.trigger}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      className="mt-3 ml-7 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-muted rounded-lg p-3 text-sm relative group">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          Response:
                        </p>
                        <p>
                          {interpolateScript(obj.response, contactFirstName)}
                        </p>
                        <ShareCopyButton
                          text={interpolateScript(obj.response, contactFirstName)}
                          className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Brain className="size-3.5 mt-0.5 shrink-0" />
                        <span>
                          <strong>Psychology:</strong> {obj.psychology}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        className="w-full"
        disabled={!selectedTechnique}
      >
        {encounteredObjections.length > 0
          ? `${encounteredObjections.length} Objections Handled — ${continueLabel}`
          : continueLabel}
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
