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
    target: "contacts-nav",
    title: "Your Contacts",
    message:
      "Your contacts and pipeline live here. Tap to see where each prospect stands.",
    placement: "right",
  },
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
    target: "practice-nav",
    title: "Practice & Prepare",
    message:
      "Sharpen your skills with objection flashcards and rehearse your pitch before every call.",
    placement: "right",
  },
];

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
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const handleNext = useCallback(async () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsActive(false);
      await completeTour();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

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

  const step = TOUR_STEPS[currentStep];

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TOUR_STEPS.length,
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
            currentStep={currentStep}
            totalSteps={TOUR_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
