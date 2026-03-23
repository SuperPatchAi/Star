"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import type { RoadmapRapportStory } from "@/types/roadmap";
import { HeartHandshake, Lightbulb, ArrowRight, ChevronRight } from "lucide-react";

interface StepRapportProps {
  rapportData: RoadmapRapportStory;
  contactFirstName: string;
  onContinue: () => void;
  continueLabel?: string;
}

export function StepRapport({
  rapportData,
  contactFirstName,
  onContinue,
  continueLabel,
}: StepRapportProps) {
  const personalizedStory = rapportData.personal_story.replace(
    /\[Name\]/gi,
    contactFirstName || "them"
  );

  const personalizedTransition = rapportData.transition_to_discovery.replace(
    /\[Name\]/gi,
    contactFirstName || "them"
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HeartHandshake className="size-4 text-primary" />
            My Story
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Share your personal experience to build trust with{" "}
            {contactFirstName || "your prospect"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/50 rounded-lg p-4 pr-10">
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              &ldquo;{personalizedStory}&rdquo;
            </p>
            <ShareCopyButton
              text={personalizedStory}
              title="Rapport Story"
              className="absolute top-2 right-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-500" />
            Talking Points
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Key beats to hit while telling your story
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {rapportData.talking_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="size-4 text-green-600" />
            Transition to Discovery
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bridge from your story into learning about{" "}
            {contactFirstName ? `${contactFirstName}'s` : "their"} situation
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/50 rounded-lg p-4 pr-10">
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              &ldquo;{personalizedTransition}&rdquo;
            </p>
            <ShareCopyButton
              text={personalizedTransition}
              title="Discovery Transition"
              className="absolute top-2 right-2"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={onContinue} className="w-full">
        {continueLabel ?? "Continue to Discovery"}
        <ChevronRight className="size-4 ml-1.5" />
      </Button>
    </div>
  );
}
