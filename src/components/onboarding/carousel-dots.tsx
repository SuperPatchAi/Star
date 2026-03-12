"use client";

import { cn } from "@/lib/utils";

interface CarouselDotsProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

export function CarouselDots({ total, current, onDotClick }: CarouselDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === current ? "w-8 bg-white" : "w-2 bg-white/40"
          )}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  );
}
