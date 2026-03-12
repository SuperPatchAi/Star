"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, ChevronRight, Info } from "lucide-react";
import type { RoadmapClosing } from "@/types/roadmap";

interface StepClosingProps {
  data: RoadmapClosing;
  selectedTechnique: string | null;
  onSelect: (technique: string) => void;
  onContinue: () => void;
}

export function StepClosing({ data, selectedTechnique, onSelect, onContinue }: StepClosingProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPreClose, setCopiedPreClose] = useState(false);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text.trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyPreClose = async () => {
    await navigator.clipboard.writeText(data.pre_close);
    setCopiedPreClose(true);
    setTimeout(() => setCopiedPreClose(false), 2000);
  };

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
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopyPreClose}
        >
          {copiedPreClose ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-3">
        {data.techniques.map((technique, index) => {
          const isSelected = selectedTechnique === technique.name;
          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => onSelect(technique.name)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {technique.icon}
                    </Badge>
                    {technique.name}
                    {isSelected && (
                      <Badge className="text-[10px]">Selected</Badge>
                    )}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  <strong>When:</strong> {technique.when}
                </CardDescription>
              </CardHeader>

              {isSelected && (
                <CardContent className="pt-0">
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap relative group">
                    {technique.script}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(technique.script, index);
                      }}
                    >
                      {copiedIndex === index ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
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
