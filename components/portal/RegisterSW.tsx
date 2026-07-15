"use client";

import { useEffect } from "react";

/** Registers the portal service worker (enables install / offline app shell). */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
