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
  target: string;
  title: string;
  message: string;
  placement: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "new-contact",
    title: "Start Here",
    message:
      "Add your first contact and pick a product to kick off a guided sales conversation.",
    placement: "bottom",
  },
  {
    target: "notification-bell",
    title: "Follow-Up Reminders",
    message:
      "Your follow-up reminders show up here. We'll nudge you so no lead slips through.",
    placement: "bottom",
  },
  {
    target: "contacts-nav",
    title: "Your Contacts",
    message:
      "Your contacts and pipeline live here. Tap to see where each prospect stands.",
    placement: "right",
  },
  {
    target: "practice-nav",
    title: "Practice & Prepare",
    message:
      "Sharpen your skills with objection flashcards and rehearse your pitch before every call.",
    placement: "right",
  },
];

function isElementVisible(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
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
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const buildVisibleSteps = useCallback(() => {
    return TOUR_STEPS.filter((step) =>
      isElementVisible(`[data-tour-step="${step.target}"]`)
    );
  }, []);

  const startTour = useCallback(() => {
    const visible = buildVisibleSteps();
    if (visible.length === 0) {
      completeTour();
      return;
    }
    setVisibleSteps(visible);
    setCurrentIndex(0);
    setIsActive(true);
  }, [buildVisibleSteps]);

  const handleNext = useCallback(async () => {
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      await completeTour();
    }
  }, [currentIndex, visibleSteps.length]);

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
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [onboardingStep, startTour]);

  const step = visibleSteps[currentIndex];

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep: currentIndex,
        totalSteps: visibleSteps.length,
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
            totalSteps={visibleSteps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
