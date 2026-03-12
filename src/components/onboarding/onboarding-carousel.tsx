"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MessageSquarePlus,
  Users,
  Bell,
  Map,
  Shield,
  Trophy,
  Download,
} from "lucide-react";
import { completeCarousel } from "@/lib/actions/onboarding";
import { CarouselSlide } from "./carousel-slide";
import { CarouselDots } from "./carousel-dots";

const SLIDES = [
  {
    icon: MessageSquarePlus,
    headline: "Your guided sales conversations",
    subtitle: "Follow an 8-step scripted flow from opening to close. Every word track at your fingertips.",
    gradient: "bg-gradient-to-br from-blue-600 to-indigo-800",
  },
  {
    icon: Users,
    headline: "Track every contact in your pipeline",
    subtitle: "See where each prospect stands. Move them through stages with a tap.",
    gradient: "bg-gradient-to-br from-emerald-600 to-teal-800",
  },
  {
    icon: Bell,
    headline: "Never miss a follow-up",
    subtitle: "Smart reminders keep you on schedule. Day 1, 3, 7, 14, 21 — we've got you covered.",
    gradient: "bg-gradient-to-br from-amber-500 to-orange-700",
  },
  {
    icon: Map,
    headline: "Scripts for every product",
    subtitle: "13 products, each with a complete P-A-S sales playbook. Discovery, objections, closing — all scripted.",
    gradient: "bg-gradient-to-br from-purple-600 to-violet-800",
  },
  {
    icon: Shield,
    headline: "Handle any objection",
    subtitle: "Proven responses for every pushback. Tap the objection, get the word track.",
    gradient: "bg-gradient-to-br from-rose-600 to-pink-800",
  },
  {
    icon: Trophy,
    headline: "Close more deals",
    subtitle: "Multiple closing techniques for every personality. Send samples, set follow-ups, and win.",
    gradient: "bg-gradient-to-br from-sky-600 to-cyan-800",
  },
  {
    icon: Download,
    headline: "Install the app",
    subtitle: "Add SuperPatch to your home screen for instant access, push notifications, and offline use.",
    gradient: "bg-gradient-to-br from-gray-700 to-zinc-900",
  },
];

export function OnboardingCarousel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleComplete = useCallback(async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    await completeCarousel();
    router.push("/dashboard");
  }, [router, isNavigating]);

  const scrollToSlide = useCallback((index: number) => {
    scrollRef.current?.scrollTo({
      left: index * window.innerWidth,
      behavior: "smooth",
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      scrollToSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  }, [currentSlide, scrollToSlide, handleComplete]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const slideWidth = container.clientWidth;
      if (slideWidth === 0) return;
      const index = Math.round(container.scrollLeft / slideWidth);
      setCurrentSlide(index);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft" && currentSlide > 0) scrollToSlide(currentSlide - 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, handleNext, scrollToSlide]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <button
        onClick={handleComplete}
        disabled={isNavigating}
        className="absolute right-4 top-4 z-10 rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50"
      >
        Skip
      </button>

      <div
        ref={scrollRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {SLIDES.map((slide, i) => (
          <CarouselSlide key={i} {...slide} />
        ))}
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-6">
        <CarouselDots
          total={SLIDES.length}
          current={currentSlide}
          onDotClick={scrollToSlide}
        />
        <Button
          onClick={handleNext}
          disabled={isNavigating}
          size="lg"
          className="rounded-full bg-white px-8 text-base font-semibold text-gray-900 shadow-lg hover:bg-white/90"
        >
          {currentSlide === SLIDES.length - 1 ? "Get Started" : "Next"}
        </Button>
      </div>
    </div>
  );
}
