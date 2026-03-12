"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, Info, CheckCircle } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import type { RoadmapClosing } from "@/types/roadmap";

interface StepClosingProps {
  data: RoadmapClosing;
  selectedTechnique: string | null;
  onSelect: (technique: string) => void;
  onContinue: () => void;
}

export function StepClosing({ data, selectedTechnique, onSelect, onContinue }: StepClosingProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose the closing technique that fits the conversation.
      </p>

      {/* Pre-close reminder */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950 dark:border-blue-800 group">
        <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">
          <strong>Pre-close:</strong> {data.pre_close}
        </p>
        <ShareCopyButton text={data.pre_close} className="size-9 min-h-[44px] min-w-[44px] shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Closing techniques as flat rows */}
      <div className="space-y-0">
        {data.techniques.map((technique, index) => {
          const isSelected = selectedTechnique === technique.name;
          return (
            <div
              key={index}
              className={cn(
                "flat-list-row cursor-pointer transition-colors",
                isSelected && "bg-primary/5"
              )}
              onClick={() => onSelect(technique.name)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-border"
                )}>
                  {isSelected && <CheckCircle className="size-3 text-primary-foreground" />}
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
                    {technique.script}
                    <ShareCopyButton text={technique.script} className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTechnique && (
        <Button onClick={onContinue} className="w-full">
          Continue to Follow-Up
          <ChevronRight className="size-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
