"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronRight, ShieldAlert, Brain, Lightbulb } from "lucide-react";
import type { RoadmapObjectionHandling } from "@/types/roadmap";

interface StepObjectionsProps {
  data: RoadmapObjectionHandling;
  encountered: string[];
  onToggle: (objection: string) => void;
  onContinue: () => void;
}

export function StepObjections({ data, encountered, onToggle, onContinue }: StepObjectionsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text.trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
          <Badge variant="secondary" className="text-xs">
            {encountered.length} handled
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.objections.map((obj, index) => {
          const isEncountered = encountered.includes(obj.objection);
          const isExpanded = expandedIndex === index;

          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                isEncountered
                  ? "ring-1 ring-green-500/50 border-green-500/50"
                  : "hover:border-orange-500/50"
              }`}
              onClick={() => {
                setExpandedIndex(isExpanded ? null : index);
                if (!isEncountered) onToggle(obj.objection);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className={`size-4 ${isEncountered ? "text-green-500" : "text-orange-500"}`} />
                    &ldquo;{obj.objection}&rdquo;
                  </CardTitle>
                  {isEncountered && (
                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
                      Handled
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  <Lightbulb className="size-3 inline mr-1" />
                  Trigger: {obj.trigger}
                </CardDescription>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-3">
                  <div className="bg-muted rounded-lg p-3 text-sm relative group">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Response:</p>
                    <p>{obj.response}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(obj.response, index);
                      }}
                    >
                      {copiedIndex === index ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Brain className="size-3.5 mt-0.5 shrink-0" />
                    <span><strong>Psychology:</strong> {obj.psychology}</span>
                  </div>
                </CardContent>
              )}
            </Card>
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
