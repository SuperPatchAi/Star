"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  label: string;
  icon: LucideIcon;
  completed: boolean;
}

export function ChecklistItem({ label, icon: Icon, completed }: ChecklistItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
      completed && "bg-green-50 dark:bg-green-950/20"
    )}>
      <div className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        completed
          ? "border-green-500 bg-green-500 text-white"
          : "border-muted-foreground/30 text-muted-foreground"
      )}>
        {completed ? (
          <Check className="size-4" strokeWidth={3} />
        ) : (
          <Icon className="size-4" />
        )}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors",
        completed && "text-muted-foreground line-through"
      )}>
        {label}
      </span>
    </div>
  );
}
