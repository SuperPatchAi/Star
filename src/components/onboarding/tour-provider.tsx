"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { completeTour } from "@/lib/actions/onboarding";
import { TourSpotlight } from "./tour-spotlight";
import { TourTooltip } from "./tour-tooltip";

interface TourStep {
  targets: string[];
  title: string;
  message: string;
  placement: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    targets: ["new-contact"],
    title: "Start Here",
    message:
      "Add your first contact and pick a product to kick off a guided sales conversation.",
    placement: "bottom",
  },
  {
    targets: ["contacts-nav", "contacts-bottom-nav"],
    title: "Your Contacts",
    message:
      "Your contacts and pipeline live here. Tap to see where each prospect stands.",
    placement: "top",
  },
  {
    targets: ["notification-bell"],
    title: "Follow-Up Reminders",
    message:
      "Your follow-up reminders show up here. We'll nudge you so no lead slips through.",
    placement: "bottom",
  },
  {
    targets: ["activity-bottom-nav", "practice-nav"],
    title: "Activities & Practice",
    message:
      "Track your follow-up schedule and sharpen your skills with objection flashcards.",
    placement: "top",
  },
];

function findVisibleTarget(targets: string[]): string | null {
  for (const target of targets) {
    const el = document.querySelector(`[data-tour-step="${target}"]`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
      return target;
    }
  }
  return null;
}

interface ResolvedStep {
  target: string;
  title: string;
  message: string;
  placement: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
}

const TourContext = createContext<TourContextType>({
  isActive: false,
  currentStep: 0,
  totalSteps: TOUR_STEPS.length,
  startTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

interface TourProviderProps {
  children: ReactNode;
  onboardingStep?: string;
}

export function TourProvider({ children, onboardingStep }: TourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [resolvedSteps, setResolvedSteps] = useState<ResolvedStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const buildSteps = useCallback(() => {
    const steps: ResolvedStep[] = [];
    for (const step of TOUR_STEPS) {
      const visibleTarget = findVisibleTarget(step.targets);
      if (visibleTarget) {
        const isBottomNav = visibleTarget.endsWith("-bottom-nav");
        steps.push({
          target: visibleTarget,
          title: step.title,
          message: step.message,
          placement: isBottomNav ? "top" : step.placement,
        });
      }
    }
    return steps;
  }, []);

  const startTour = useCallback(() => {
    const steps = buildSteps();
    if (steps.length === 0) {
      completeTour();
      return;
    }
    setResolvedSteps(steps);
    setCurrentIndex(0);
    setIsActive(true);
  }, [buildSteps]);

  const handleNext = useCallback(async () => {
    if (currentIndex < resolvedSteps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      await completeTour();
    }
  }, [currentIndex, resolvedSteps.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    setIsActive(false);
    await completeTour();
  }, []);

  useEffect(() => {
    if (onboardingStep === "tour") {
      const timer = setTimeout(() => startTour(), 2000);
      return () => clearTimeout(timer);
    }
  }, [onboardingStep, startTour]);

  const step = resolvedSteps[currentIndex];

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep: currentIndex,
        totalSteps: resolvedSteps.length,
        startTour,
      }}
    >
      {children}
      {isActive && step && (
        <>
          <TourSpotlight
            targetSelector={`[data-tour-step="${step.target}"]`}
          />
          <TourTooltip
            targetSelector={`[data-tour-step="${step.target}"]`}
            title={step.title}
            message={step.message}
            placement={step.placement}
            currentStep={currentIndex}
            totalSteps={resolvedSteps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
