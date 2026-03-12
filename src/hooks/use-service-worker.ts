"use client";

import { useEffect, useState } from "react";

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    setSupported(true);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
      })
      .catch(() => {
        // SW registration failed silently
      });
  }, []);

  return { registration, supported };
}
