"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";
import type { RoadmapDiscovery } from "@/types/roadmap";

interface StepDiscoveryProps {
  data: RoadmapDiscovery;
  questionsAsked: string[];
  onToggleQuestion: (question: string) => void;
  onContinue: () => void;
}

const categoryColors: Record<string, string> = {
  "Opening": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  "Opening Question": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  "Pain Point": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  "Pain Point Question": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  "Impact": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  "Impact Question": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  "Solution": "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  "Solution Question": "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
};

function normalizeCategory(type: string): string {
  return type.replace(" Question", "");
}

export function StepDiscovery({ data, questionsAsked, onToggleQuestion, onContinue }: StepDiscoveryProps) {
  const categories = [...new Set(data.questions.map(q => normalizeCategory(q.type)))];
  const askedCount = questionsAsked.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ask 3-5 questions to uncover needs. Check off the ones you&apos;ve asked.
        </p>
        <Badge variant={askedCount >= 3 ? "default" : "secondary"} className="text-xs">
          {askedCount} asked
        </Badge>
      </div>

      {categories.map((category) => {
        const questions = data.questions.filter(q => normalizeCategory(q.type) === category);
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${categoryColors[category] || ""}`}
                >
                  {category}
                </Badge>
                <CardDescription className="text-xs">
                  {questions.length} questions
                </CardDescription>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.map((q, i) => {
                const isAsked = questionsAsked.includes(q.question);
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                      isAsked ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isAsked}
                      onCheckedChange={() => onToggleQuestion(q.question)}
                      className="mt-0.5"
                    />
                    <span className={`text-sm ${isAsked ? "text-muted-foreground line-through" : ""}`}>
                      &ldquo;{q.question}&rdquo;
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {askedCount >= 3 && (
        <Button onClick={onContinue} className="w-full">
          Continue to Presentation
          <ChevronRight className="size-4 ml-1" />
        </Button>
      )}

      {askedCount < 3 && (
        <p className="text-xs text-muted-foreground text-center">
          Ask at least 3 questions before moving on
        </p>
      )}
    </div>
  );
}
