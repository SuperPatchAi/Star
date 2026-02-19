"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronRight } from "lucide-react";
import type { RoadmapOpeningApproaches } from "@/types/roadmap";

interface StepOpeningPickerProps {
  data: RoadmapOpeningApproaches;
  selectedType: string | null;
  onSelect: (type: string) => void;
  onContinue: () => void;
}

const approachIcons: Record<string, string> = {
  "COLD APPROACH": "❄️",
  "WARM INTRO": "🤝",
  "SOCIAL MEDIA DM": "📱",
  "REFERRAL": "🔗",
  "EVENT/PARTY": "🎉",
};

export function StepOpeningPicker({ data, selectedType, onSelect, onContinue }: StepOpeningPickerProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text.trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        How are you reaching this prospect? Pick the approach that fits your situation.
      </p>

      <div className="grid gap-3">
        {data.approaches.map((approach, index) => {
          const isSelected = selectedType === approach.type;
          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => onSelect(approach.type)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{approachIcons[approach.type] || "💬"}</span>
                    {approach.type}
                    {isSelected && (
                      <Badge className="text-[10px]">Selected</Badge>
                    )}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {approach.context}
                  </Badge>
                </div>
              </CardHeader>
              {isSelected && (
                <CardContent className="pt-0">
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap relative group">
                    {approach.script.trim()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(approach.script, index);
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

      {selectedType && (
        <Button onClick={onContinue} className="w-full">
          Continue to Discovery
          <ChevronRight className="size-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
