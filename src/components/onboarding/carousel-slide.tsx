"use client";

import type { LucideIcon } from "lucide-react";

interface CarouselSlideProps {
  icon: LucideIcon;
  headline: string;
  subtitle: string;
  gradient: string;
}

export function CarouselSlide({ icon: Icon, headline, subtitle, gradient }: CarouselSlideProps) {
  return (
    <div className={`flex h-dvh w-full shrink-0 snap-start flex-col items-center justify-center px-8 text-center ${gradient}`}>
      <div className="mb-8 rounded-3xl bg-white/20 p-6 backdrop-blur-sm">
        <Icon className="size-16 text-white" strokeWidth={1.5} />
      </div>
      <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">{headline}</h2>
      <p className="max-w-sm text-base text-white/80 md:text-lg">{subtitle}</p>
    </div>
  );
}
