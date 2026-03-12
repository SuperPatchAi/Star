"use client";

import { useState, useEffect, useCallback } from "react";

interface TourSpotlightProps {
  targetSelector: string;
}

export function TourSpotlight({ targetSelector }: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setRect(r);
      }
    }
  }, [targetSelector]);

  useEffect(() => {
    updateRect();
    const id = requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  if (!rect) return null;

  const padding = 6;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none transition-all duration-300"
      style={{
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
        clipPath: `polygon(
          0% 0%, 0% 100%,
          ${rect.left - padding}px 100%,
          ${rect.left - padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px 100%,
          100% 100%, 100% 0%
        )`,
      }}
    />
  );
}
