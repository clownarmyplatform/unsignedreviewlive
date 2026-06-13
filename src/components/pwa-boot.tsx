"use client";

import { useEffect, useState } from "react";
import { AppSplashScreen } from "@/components/app-splash-screen";

const STARTUP_SPLASH_KEY = "clown-army-startup-splash-seen";

export function PwaBoot() {
  const [showStartupSplash, setShowStartupSplash] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.sessionStorage.getItem(STARTUP_SPLASH_KEY) !== "seen";
  });
  const [isFadingStartupSplash, setIsFadingStartupSplash] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    }

    if (!showStartupSplash) {
      return;
    }

    window.sessionStorage.setItem(STARTUP_SPLASH_KEY, "seen");

    const fadeTimer = window.setTimeout(() => {
      setIsFadingStartupSplash(true);
    }, 4000);

    const hideTimer = window.setTimeout(() => {
      setShowStartupSplash(false);
      setIsFadingStartupSplash(false);
    }, 4400);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [showStartupSplash]);

  if (!showStartupSplash) {
    return null;
  }

  return <AppSplashScreen isFading={isFadingStartupSplash} />;
}
