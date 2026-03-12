"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TourTooltipProps {
  targetSelector: string;
  title: string;
  message: string;
  placement: "top" | "bottom" | "left" | "right";
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function TourTooltip({
  targetSelector,
  title,
  message,
  placement,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 160;
    const gap = 12;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom":
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));

    setPosition({ top, left });
  }, [targetSelector, placement]);

  useEffect(() => {
    updatePosition();
    const id = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  if (!position) return null;

  return (
    <div
      className="fixed z-[70] w-80 rounded-xl border bg-popover p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      <button
        onClick={onSkip}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Skip tour"
      >
        <X className="size-4" />
      </button>

      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {currentStep + 1} of {totalSteps}
        </span>
        <div className="flex items-center gap-1">
          {currentStep > 0 && (
            <Button variant="ghost" size="sm" onClick={onPrev} className="h-8">
              <ChevronLeft className="size-4 mr-0.5" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext} className="h-8">
            {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            {currentStep < totalSteps - 1 && (
              <ChevronRight className="size-4 ml-0.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
