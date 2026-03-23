"use client";

import { useState, useCallback, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Share2, Download, Loader2, Check } from "lucide-react";

interface ShareCardButtonProps {
  cardRef: RefObject<HTMLDivElement | null>;
  displayName: string;
  shareUrl?: string;
  shareText?: string;
}

async function convertImagesToDataUrls(node: HTMLElement) {
  const images = node.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(async (img) => {
      if (img.src.startsWith("data:")) return;
      try {
        const res = await fetch(img.src);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch {
        // Leave original src if fetch fails
      }
    })
  );
}

export function ShareCardButton({ cardRef, displayName, shareUrl, shareText }: ShareCardButtonProps) {
  const [status, setStatus] = useState<"idle" | "capturing" | "done">("idle");

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setStatus("capturing");

    try {
      await convertImagesToDataUrls(cardRef.current);

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "superpatch-card.png", { type: "image/png" });

      const defaultText = `Connect with ${displayName}, an independent SuperPatch representative.`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${displayName} — SuperPatch`,
          text: shareText ?? defaultText,
          ...(shareUrl && { url: shareUrl }),
        });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "superpatch-card.png";
        link.click();
      }

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("idle");

      try {
        if (!cardRef.current) return;
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "superpatch-card.png";
        link.click();
      } catch {
        // Silent fail
      }
    }
  }, [cardRef, displayName, shareUrl, shareText]);

  const canShare =
    typeof navigator !== "undefined" && !!navigator.share;
  const Icon =
    status === "done" ? Check : status === "capturing" ? Loader2 : canShare ? Share2 : Download;
  const label =
    status === "done" ? "Shared!" : status === "capturing" ? "Capturing..." : canShare ? "Share Card" : "Save Card";

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleShare}
      disabled={status === "capturing"}
    >
      <Icon
        className={`size-4 mr-2 ${status === "capturing" ? "animate-spin" : ""} ${status === "done" ? "text-green-500" : ""}`}
      />
      {label}
    </Button>
  );
}
