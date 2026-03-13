"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { subscribePush } from "@/lib/actions/push-subscriptions";

const DISMISSED_KEY = "superpatch-push-dismissed";

export function PushPermissionBanner() {
  const { registration, supported } = useServiceWorker();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!supported) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    try { if (localStorage.getItem(DISMISSED_KEY)) return; } catch { /* private browsing */ }
    setVisible(true);
  }, [supported]);

  if (!visible) return null;

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      if (!registration) return;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setVisible(false);
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = sub.toJSON();
      if (json.endpoint && json.keys) {
        await subscribePush({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys.p256dh!,
            auth: json.keys.auth!,
          },
        });
      }

      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch { /* private browsing */ }
    setVisible(false);
  };

  return (
    <div className="mx-4 mt-3 rounded-lg border bg-primary/5 p-3 flex items-start gap-3">
      <Bell className="size-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Get reminders even when the app is closed</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enable push notifications so you never miss a follow-up.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleEnable}
            disabled={subscribing}
          >
            {subscribing ? "Enabling..." : "Enable"}
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
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
