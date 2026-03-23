"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  subscribePush,
  unsubscribePush,
  updateNotificationPreferences,
} from "@/lib/actions/push-subscriptions";
import { useServiceWorker } from "@/hooks/use-service-worker";
import type { NotificationPreferences } from "@/lib/db/types";

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

interface NotificationSectionProps {
  initialPrefs: NotificationPreferences;
}

type PrefKey = keyof NotificationPreferences;

const PREF_LABELS: Record<PrefKey, { label: string; description: string }> = {
  follow_up_reminders: {
    label: "Follow-up Reminders",
    description: "Get notified when a follow-up task is due.",
  },
  overdue_alerts: {
    label: "Overdue Alerts",
    description: "Alerts for contacts that haven't been touched in a while.",
  },
  sample_check_ins: {
    label: "Sample Check-ins",
    description: "Reminders to check if samples have arrived.",
  },
};

export function NotificationSection({ initialPrefs }: NotificationSectionProps) {
  const { registration, supported } = useServiceWorker();
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPrefs);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermissionState(Notification.permission);

    if (Notification.permission === "granted" && registration) {
      registration.pushManager.getSubscription().then((sub) => {
        setPushEnabled(!!sub);
      });
    }
  }, [registration]);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (!supported || !registration) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    setToggling(true);

    if (enabled) {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") {
        setToggling(false);
        toast.error("Notification permission was denied.");
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setToggling(false);
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
          keys: { p256dh: json.keys.p256dh!, auth: json.keys.auth! },
        });
      }
      setPushEnabled(true);
      toast.success("Push notifications enabled");
    } else {
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribePush(endpoint);
      }
      setPushEnabled(false);
      toast.success("Push notifications disabled");
    }

    setToggling(false);
  }, [supported, registration]);

  const handlePrefToggle = useCallback(async (key: PrefKey, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    const { error } = await updateNotificationPreferences({ [key]: value });
    if (error) {
      setPrefs(prefs);
      toast.error(error);
    }
  }, [prefs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Control how and when you receive alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push master toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {pushEnabled ? (
              <Bell className="size-5 text-primary" />
            ) : (
              <BellOff className="size-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="push-toggle" className="text-sm font-medium">
                Push Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                {permissionState === "denied"
                  ? "Blocked in browser settings"
                  : "Receive alerts even when the app is closed."}
              </p>
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={pushEnabled}
            onCheckedChange={handlePushToggle}
            disabled={toggling || permissionState === "denied"}
          />
        </div>

        {permissionState === "denied" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950 dark:border-amber-800">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Notifications are blocked. Open your browser or device settings and allow notifications for this site.
            </p>
          </div>
        )}

        {/* Per-type toggles */}
        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Notification Types</p>
          {(Object.keys(PREF_LABELS) as PrefKey[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label htmlFor={`pref-${key}`} className="text-sm">
                  {PREF_LABELS[key].label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {PREF_LABELS[key].description}
                </p>
              </div>
              <Switch
                id={`pref-${key}`}
                checked={prefs[key]}
                onCheckedChange={(v) => handlePrefToggle(key, v)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
