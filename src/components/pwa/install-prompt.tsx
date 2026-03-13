"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "superpatch-install-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // @ts-expect-error -- navigator.standalone is iOS Safari only
    if (navigator.standalone) return;

    let dismissed: string | null = null;
    try { dismissed = localStorage.getItem(DISMISSED_KEY); } catch { /* private browsing */ }
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000)
        return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS =
      (/iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    if (isIOS) {
      setShowIOSPrompt(true);
      setVisible(true);
    }

    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem(DISMISSED_KEY, new Date().toISOString()); } catch { /* private browsing */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 md:bottom-0 md:pb-4">
      <div className="mx-auto max-w-lg rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install SuperPatch</p>
            {showIOSPrompt ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap <Share className="inline size-3.5 -mt-0.5" /> then
                &quot;Add to Home Screen&quot; for the best experience.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add to your home screen for instant access and push
                notifications.
              </p>
            )}
            {!showIOSPrompt && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleInstall}
                >
                  Install
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleDismiss}
                >
                  Not now
                </Button>
              </div>
            )}
            {showIOSPrompt && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleDismiss}
                >
                  Got it
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
