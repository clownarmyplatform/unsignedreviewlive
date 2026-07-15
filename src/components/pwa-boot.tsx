"use client";

import { useEffect, useState } from "react";
import { AppSplashScreen } from "@/components/app-splash-screen";

const STARTUP_SPLASH_KEY = "uniquekontent-startup-splash-seen";

export function PwaBoot() {
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [isFadingStartupSplash, setIsFadingStartupSplash] = useState(false);

  useEffect(() => {
    let hasReloadedForUpdate = false;
    let cleanupServiceWorkerListener: (() => void) | null = null;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registration) => {
          const promptWaitingWorker = () => {
            registration.waiting?.postMessage({
              type: "SKIP_WAITING",
            });
          };

          if (registration.waiting) {
            promptWaitingWorker();
          }

          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;

            if (!installingWorker) {
              return;
            }

            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                promptWaitingWorker();
              }
            });
          });
        })
        .catch(() => undefined);

      const handleControllerChange = () => {
        if (hasReloadedForUpdate) {
          return;
        }

        hasReloadedForUpdate = true;
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );
      cleanupServiceWorkerListener = () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      };
    }

    const hasSeenSplash = window.sessionStorage.getItem(STARTUP_SPLASH_KEY) === "seen";

    if (hasSeenSplash) {
      const hideTimer = window.requestAnimationFrame(() => {
        setShowStartupSplash(false);
      });

      return () => {
        cleanupServiceWorkerListener?.();
        window.cancelAnimationFrame(hideTimer);
      };
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
      cleanupServiceWorkerListener?.();
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [showStartupSplash]);

  if (!showStartupSplash) {
    return null;
  }

  return <AppSplashScreen isFading={isFadingStartupSplash} />;
}
