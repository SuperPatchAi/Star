"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, ChevronRight, CheckCircle } from "lucide-react";
import type { RoadmapPresentation, RoadmapMetadata } from "@/types/roadmap";
import type { Product } from "@/types";

interface StepPresentationProps {
  data: RoadmapPresentation;
  product: Product;
  metadata?: RoadmapMetadata;
  questionsAsked?: string[];
  onContinue: () => void;
}

function buildDiscoveryCallback(questionsAsked: string[]): string {
  if (questionsAsked.length === 0) return "";
  const first = questionsAsked[0];
  const lowerQ = first.charAt(0).toLowerCase() + first.slice(1).replace(/\?$/, "");
  if (questionsAsked.length === 1) {
    return `You mentioned ${lowerQ} — that's exactly the kind of challenge this was designed for.`;
  }
  const second = questionsAsked[1];
  const lowerQ2 = second.charAt(0).toLowerCase() + second.slice(1).replace(/\?$/, "");
  return `You mentioned ${lowerQ}, and also ${lowerQ2} — those are exactly the kinds of challenges this was designed for.`;
}

function interpolateText(text: string, questionsAsked: string[]): string {
  if (!text.includes("{{discovery_callback}}")) return text;
  const callback = buildDiscoveryCallback(questionsAsked);
  return text.replace("{{discovery_callback}}", callback).trim();
}

export function StepPresentation({ data, product, metadata, questionsAsked = [], onContinue }: StepPresentationProps) {
  const [copied, setCopied] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  const phases = useMemo(() => [
    { key: "problem", label: "Problem", color: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800", text: interpolateText(data.content.problem, questionsAsked) },
    { key: "agitate", label: "Agitate", color: "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800", text: interpolateText(data.content.agitate, questionsAsked) },
    { key: "solve", label: "Solve", color: "text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800", text: interpolateText(data.content.solve, questionsAsked) },
  ], [data.content.problem, data.content.agitate, data.content.solve, questionsAsked]);

  const fullScript = phases.map(p => p.text).join("\n\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Present {product.name} using the Problem-Agitate-Solve framework. Step through each phase.
      </p>

      {metadata && metadata.benefits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">Quick Pitch:</span>
          {metadata.benefits.map((benefit, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {benefit}
            </Badge>
          ))}
        </div>
      )}

      {/* Phase stepper */}
      <div className="flex gap-2">
        {phases.map((phase, i) => (
          <button
            key={phase.key}
            onClick={() => setCurrentPhase(i)}
            className={`flex-1 p-3 rounded-lg border text-left transition-all ${
              i === currentPhase
                ? "ring-2 ring-primary border-primary"
                : i < currentPhase
                ? "bg-muted/50 border-muted"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Badge variant="outline" className={`text-[10px] mb-1 ${phase.color}`}>
              {phase.label}
            </Badge>
            <p className="text-xs text-muted-foreground line-clamp-2">{phase.text}</p>
          </button>
        ))}
      </div>

      {/* Current phase detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className={phases[currentPhase].color}>
                {phases[currentPhase].label}
              </Badge>
              Phase {currentPhase + 1} of 3
            </CardTitle>
            <div className="flex gap-1">
              {currentPhase > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCurrentPhase(p => p - 1)}>
                  Previous
                </Button>
              )}
              {currentPhase < 2 && (
                <Button variant="ghost" size="sm" onClick={() => setCurrentPhase(p => p + 1)}>
                  Next Phase
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
            {phases[currentPhase].text}
          </div>
        </CardContent>
      </Card>

      {/* Key benefits and differentiator */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Key Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.content.key_benefits.map((benefit, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-green-500 shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Differentiator</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{data.content.differentiator}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Full script copy */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <><Check className="size-4 mr-1.5 text-green-500" /> Copied!</>
          ) : (
            <><Copy className="size-4 mr-1.5" /> Copy Full Script</>
          )}
        </Button>
        <Button onClick={onContinue}>
          Continue to Send Samples
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
