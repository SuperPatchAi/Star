"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from "lucide-react";
import { shareOrCopy } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ShareCopyButtonProps {
  text: string;
  title?: string;
  variant?: "icon" | "labeled";
  label?: string;
  size?: "icon" | "sm" | "default";
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ShareCopyButton({
  text,
  title,
  variant = "icon",
  label,
  size,
  className,
  iconClassName = "size-4",
  onClick,
}: ShareCopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e);
      const result = await shareOrCopy(text, title);
      if (result !== "failed") {
        setStatus(result);
        setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [text, title, onClick]
  );

  const isSuccess = status === "shared" || status === "copied";
  const defaultLabel = canShare ? "Share" : "Copy";
  const successLabel = status === "shared" ? "Shared!" : "Copied!";
  const displayLabel = isSuccess ? successLabel : (label ?? defaultLabel);
  const Icon = isSuccess ? Check : canShare ? Share2 : Copy;

  if (variant === "labeled") {
    return (
      <Button
        variant="ghost"
        size={size ?? "sm"}
        className={className}
        onClick={handleClick}
      >
        <Icon className={cn(iconClassName, isSuccess && "text-green-500", "mr-1.5")} />
        {displayLabel}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleClick}
    >
      <Icon className={cn(iconClassName, isSuccess && "text-green-500")} />
    </Button>
  );
}
