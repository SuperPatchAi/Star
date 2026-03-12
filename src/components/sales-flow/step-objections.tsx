"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ShieldAlert, Brain, Lightbulb, CheckCircle } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
import type { RoadmapObjectionHandling } from "@/types/roadmap";

interface StepObjectionsProps {
  data: RoadmapObjectionHandling;
  encountered: string[];
  onToggle: (objection: string) => void;
  onContinue: () => void;
}

export function StepObjections({ data, encountered, onToggle, onContinue }: StepObjectionsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Tap any objection your prospect raises to see the response.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Technique: <span className="font-medium">{data.technique}</span>
          </p>
        </div>
        {encountered.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="size-3.5" />
            {encountered.length} handled
          </span>
        )}
      </div>

      <div className="space-y-0">
        {data.objections.map((obj, index) => {
          const isEncountered = encountered.includes(obj.objection);
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
                if (!isEncountered) onToggle(obj.objection);
              }}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className={cn(
                  "size-4 mt-0.5 shrink-0",
                  isEncountered ? "text-green-500" : "text-orange-500"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">&ldquo;{obj.objection}&rdquo;</p>
                    {isEncountered && <CheckCircle className="size-3.5 text-green-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Lightbulb className="size-3 inline mr-1" />
                    Trigger: {obj.trigger}
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 ml-7 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-muted rounded-lg p-3 text-sm relative group">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Response:</p>
                    <p>{obj.response}</p>
                    <ShareCopyButton text={obj.response} className="absolute top-2 right-2 size-9 min-h-[44px] min-w-[44px] md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Brain className="size-3.5 mt-0.5 shrink-0" />
                    <span><strong>Psychology:</strong> {obj.psychology}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={onContinue} className="w-full">
        {encountered.length > 0 ? "Objections Handled — Continue to Close" : "No Objections — Continue to Close"}
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
