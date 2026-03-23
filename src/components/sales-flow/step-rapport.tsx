"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import type { RoadmapRapportStory } from "@/types/roadmap";
import { HeartHandshake, Lightbulb, ArrowRight, ChevronRight } from "lucide-react";

const GENERIC_RAPPORT: RoadmapRapportStory = {
  title: "BUILD RAPPORT",
  description: "Share your personal story to build trust",
  personal_story:
    "I have to tell you about something that's been a game changer for me. I discovered these patches from SuperPatch — they use vibrotactile technology, totally drug-free — and honestly, I was skeptical at first. But I tried one and the difference was real. No pills, no side effects, just this little patch that works with your body's nervous system. It changed how I feel day to day, and that's why I started sharing it with people I care about.",
  talking_points: [
    "Share a genuine personal struggle you've experienced",
    "Describe your initial skepticism — it makes you relatable",
    "Talk about the moment you first noticed a difference",
    "Emphasize drug-free, no side effects, works with your body",
    "Explain why you started sharing it — you believe in it",
  ],
  transition_to_discovery:
    "That's my story with it. But I'd love to hear about you — what's going on in your life right now? Is there anything that's been holding you back?",
};

interface StepRapportProps {
  rapportData?: RoadmapRapportStory | null;
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
  const data = rapportData ?? GENERIC_RAPPORT;

  const personalizedStory = data.personal_story.replace(
    /\[Name\]/gi,
    contactFirstName || "them"
  );

  const personalizedTransition = data.transition_to_discovery.replace(
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
            {data.talking_points.map((point, i) => (
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
