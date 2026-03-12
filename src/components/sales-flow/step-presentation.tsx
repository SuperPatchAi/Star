"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, CheckCircle } from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { cn } from "@/lib/utils";
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

const phaseColors = {
  problem: "text-red-600 dark:text-red-400",
  agitate: "text-orange-600 dark:text-orange-400",
  solve: "text-green-600 dark:text-green-400",
};

export function StepPresentation({ data, product, metadata, questionsAsked = [], onContinue }: StepPresentationProps) {
  const [currentPhase, setCurrentPhase] = useState(0);

  const phases = useMemo(() => [
    { key: "problem" as const, label: "Problem", text: interpolateText(data.content.problem, questionsAsked) },
    { key: "agitate" as const, label: "Agitate", text: interpolateText(data.content.agitate, questionsAsked) },
    { key: "solve" as const, label: "Solve", text: interpolateText(data.content.solve, questionsAsked) },
  ], [data.content.problem, data.content.agitate, data.content.solve, questionsAsked]);

  const fullScript = phases.map(p => p.text).join("\n\n");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Present {product.name} using the Problem-Agitate-Solve framework. Step through each phase.
      </p>

      {metadata && metadata.benefits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">Quick Pitch:</span>
          {metadata.benefits.map((benefit, i) => (
            <span key={i} className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {benefit}
            </span>
          ))}
        </div>
      )}

      {/* Phase stepper pills */}
      <div className="flex gap-2">
        {phases.map((phase, i) => (
          <button
            key={phase.key}
            onClick={() => setCurrentPhase(i)}
            className={cn(
              "flex-1 py-2.5 px-3 min-h-[44px] rounded-lg text-center text-sm font-medium transition-all border",
              i === currentPhase
                ? "ring-2 ring-primary border-primary"
                : i < currentPhase
                  ? "bg-muted/50 border-border text-muted-foreground"
                  : "border-border hover:border-primary/50"
            )}
          >
            <span className={cn("text-xs font-semibold", phaseColors[phase.key])}>
              {phase.label}
            </span>
          </button>
        ))}
      </div>

      {/* Current phase content */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", phaseColors[phases[currentPhase].key])}>
              {phases[currentPhase].label}
            </span>
            <span className="text-xs text-muted-foreground">Phase {currentPhase + 1} of 3</span>
          </div>
          <div className="flex gap-1">
            <ShareCopyButton text={phases[currentPhase].text} className="size-9 min-h-[44px] min-w-[44px]" iconClassName="size-3.5" />
            {currentPhase > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentPhase(p => p - 1)}>Previous</Button>
            )}
            {currentPhase < 2 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentPhase(p => p + 1)}>Next Phase</Button>
            )}
          </div>
        </div>
        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
          {phases[currentPhase].text}
        </div>
      </div>

      {/* Key benefits and differentiator */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold mb-2">Key Benefits</h4>
          <ul className="space-y-1.5">
            {data.content.key_benefits.map((benefit, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <CheckCircle className="size-3.5 text-green-500 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Differentiator</h4>
          <p className="text-sm">{data.content.differentiator}</p>
        </div>
      </div>

      <div className="border-t pt-4 flex items-center justify-between">
        <ShareCopyButton text={fullScript} variant="labeled" label="Full Script" />
        <Button onClick={onContinue}>
          Continue to Send Samples
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
