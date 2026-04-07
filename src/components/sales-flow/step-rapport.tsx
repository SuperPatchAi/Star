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
    "Hey [Name]! How are you? It's been a minute, man. I was thinking about you — about something I've been working on and using for the last little bit. Let me give you a little bit of backstory. The reason I called you today — I've had back pain for years. I hurt my back a while ago and tried everything. Chiropractor, you name it. I tried it. Pills, all of it. Nothing worked. And then my wife got me this thing. It's been a game-changer, dude. If you've got back pain — this thing has changed my life. There's no chemicals, and I'm blown away. But think about that — for me. And my wife uses something by the same company for her sleep. Changed her life as well.",
  talking_points: [
    "Use their name early — make it feel like a real catch-up call",
    "Lead with your backstory and struggle, not the product name",
    "Mention that you tried everything and nothing worked — builds credibility",
    "Keep it personal — your experience and your wife's experience",
    "Pivot to them by asking what bugs them about their health today",
  ],
  transition_to_discovery:
    "And I was thinking who else could benefit from a life-changing experience like I'm having. [Name], you're one of those people that's always been interested in new and exciting things, and I thought you would probably benefit from this experience I'm having now. I want to send you some stuff for free — but I don't know if it's for everybody. So is there anything at all that bugs you about your health and wellness today? Whether it's pain, sleep, stress, different types of things. Anything at all.",
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
