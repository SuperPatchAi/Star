"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import { HeartHandshake, Lightbulb, ArrowRight, ChevronRight } from "lucide-react";
import type { Product } from "@/types";

const SCRIPT_TEMPLATE =
  "Hey [Name]! How are you? It's been a minute, man. I was thinking about you — about something I've been working on and using for the last little bit. Let me give you a little bit of backstory. The reason I called you today — {{problem_intro}}. And then my friend got me this thing. It's been a game-changer. {{problem_callback}} — this thing has changed my life. There's no chemicals, and I'm blown away. But think about that — for me. And my friend uses something by the same company {{secondary_use}}.";

const TRANSITION_SCRIPT =
  "And I was thinking about you — [Name], you're one of those people that's always been open to new and exciting things, and I thought you'd really benefit from this experience I'm having right now. I want to send you some stuff for free to try — but I don't know if it's for everybody. So is there anything at all that bugs you about your health and wellness today? Whether it's pain, sleep, stress, different types of things. Anything at all.";

interface ProductSnippet {
  problem_intro: string;
  problem_callback: string;
  secondary_use: string;
}

const PRODUCT_SNIPPETS: Record<string, ProductSnippet> = {
  freedom: {
    problem_intro: "I've had back pain for years. I hurt my back a while ago and tried everything. Chiropractor, you name it. I tried it. Pills, all of it. Nothing worked",
    problem_callback: "If you've got any kind of pain",
    secondary_use: "for their sleep. Changed their life as well",
  },
  rem: {
    problem_intro: "I haven't been able to sleep well in years. Tossing and turning, staring at the ceiling. I tried melatonin, sleep apps, teas — you name it. Nothing stuck",
    problem_callback: "If you've got any kind of sleep issues",
    secondary_use: "for their pain. Changed their life as well",
  },
  liberty: {
    problem_intro: "my balance and stability have been off for a while. I just didn't feel steady on my feet anymore. Physical therapy, exercises — tried it all. Nothing really helped",
    problem_callback: "If you've noticed your balance isn't what it used to be",
    secondary_use: "for their pain. Changed their life as well",
  },
  boost: {
    problem_intro: "I've been dragging for years. Hitting that 2 PM wall every single day. Living on coffee, energy drinks — you name it. Nothing gave me real, lasting energy",
    problem_callback: "If you're tired of being tired",
    secondary_use: "for their sleep. Changed their life as well",
  },
  victory: {
    problem_intro: "I felt like my performance was slipping. Workouts weren't hitting the same, recovery took forever. Pre-workouts, supplements — tried them all. Nothing moved the needle",
    problem_callback: "If you feel like you're not performing at your best",
    secondary_use: "for their energy. Changed their life as well",
  },
  focus: {
    problem_intro: "I couldn't focus to save my life. Brain fog all day, couldn't finish a thought. Nootropics, supplements, extra coffee — tried everything. Nothing cleared the haze",
    problem_callback: "If you ever feel like your brain is just in a fog",
    secondary_use: "for their sleep. Changed their life as well",
  },
  defend: {
    problem_intro: "I was getting sick all the time. Every cold that went around, I caught it. Vitamins, zinc, elderberry — tried all of it. Nothing kept me from going down",
    problem_callback: "If you feel like you're always catching something",
    secondary_use: "for their energy. Changed their life as well",
  },
  ignite: {
    problem_intro: "I've been struggling with my weight for a long time. Diets, meal plans, supplements — tried everything. Nothing really moved the scale the way I wanted",
    problem_callback: "If you've been working on your weight and feeling stuck",
    secondary_use: "for their energy. Changed their life as well",
  },
  "kick-it": {
    problem_intro: "I had this habit I just couldn't shake. Willpower alone wasn't cutting it. I tried apps, patches, gum — you name it. Nothing stuck long enough to matter",
    problem_callback: "If there's a habit you've been wanting to kick",
    secondary_use: "for their stress. Changed their life as well",
  },
  peace: {
    problem_intro: "I've been stressed out of my mind for a long time. That constant tension, can't turn it off. Meditation apps, breathing exercises — tried them all. Nothing really took the edge off",
    problem_callback: "If you're carrying a lot of stress",
    secondary_use: "for their sleep. Changed their life as well",
  },
  joy: {
    problem_intro: "I just wasn't feeling like myself. Low mood, no motivation, everything felt heavy. Supplements, routines — tried it all. Nothing really lifted the fog",
    problem_callback: "If you've been feeling off or just not yourself",
    secondary_use: "for their energy. Changed their life as well",
  },
  lumi: {
    problem_intro: "my skin just wasn't looking the way it used to. Dull, tired-looking — I tried serums, creams, facials. You name it. Nothing made a real difference",
    problem_callback: "If you feel like your skin has lost its glow",
    secondary_use: "for their sleep. Changed their life as well",
  },
  rocket: {
    problem_intro: "I just wasn't feeling like myself as a man. Energy, drive, vitality — all of it was fading. Supplements, workouts — tried everything. Nothing brought it back",
    problem_callback: "If you feel like you've lost a step",
    secondary_use: "for their energy. Changed their life as well",
  },
};

const DEFAULT_SNIPPET: ProductSnippet = PRODUCT_SNIPPETS.freedom;

const TALKING_POINTS = [
  "Use their name early — make it feel like a real catch-up call",
  "Lead with your backstory and struggle, not the product name",
  "Mention that you tried everything and nothing worked — builds credibility",
  "Keep it personal — your experience and your friend's experience",
  "Pivot to them by asking what bugs them about their health today",
];

function buildScript(snippet: ProductSnippet): string {
  return SCRIPT_TEMPLATE
    .replace("{{problem_intro}}", snippet.problem_intro)
    .replace("{{problem_callback}}", snippet.problem_callback)
    .replace("{{secondary_use}}", snippet.secondary_use);
}

interface StepRapportProps {
  products: Product[];
  contactFirstName: string;
  onContinue: () => void;
  continueLabel?: string;
}

export function StepRapport({
  products,
  contactFirstName,
  onContinue,
  continueLabel,
}: StepRapportProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const snippet = selectedProductId
    ? (PRODUCT_SNIPPETS[selectedProductId] ?? DEFAULT_SNIPPET)
    : DEFAULT_SNIPPET;

  const personalizedStory = useMemo(
    () => buildScript(snippet).replace(/\[Name\]/gi, contactFirstName || "them"),
    [snippet, contactFirstName],
  );

  const personalizedTransition = useMemo(
    () => TRANSITION_SCRIPT.replace(/\[Name\]/gi, contactFirstName || "them"),
    [contactFirstName],
  );

  return (
    <div className="space-y-4">
      {/* Product pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
        {products.map((p) => {
          const isActive = selectedProductId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProductId(isActive ? null : p.id)}
              className={`flex items-center gap-1.5 shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <div className="relative size-5 rounded-full overflow-hidden bg-muted shrink-0">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="20px" />
              </div>
              {p.name}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HeartHandshake className="size-4 text-primary" />
            My Story
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Share your personal experience to build trust with{" "}
            {contactFirstName || "your prospect"}
            {selectedProductId && (
              <span className="text-primary font-medium"> — tailored for {products.find(p => p.id === selectedProductId)?.name}</span>
            )}
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
            {TALKING_POINTS.map((point, i) => (
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
