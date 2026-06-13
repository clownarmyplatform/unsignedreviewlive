"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type UsePwaInstallResult = {
  canInstall: boolean;
  hasIosInstructions: boolean;
  isInstalled: boolean;
  isShowingIosInstructions: boolean;
  promptInstall: () => Promise<void>;
  setIsShowingIosInstructions: (value: boolean) => void;
};

function detectStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return isStandaloneMedia || navigatorStandalone;
}

function detectIosInstallSupportGap() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = detectStandaloneMode();

  return isIos && !isStandalone;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canUseIosInstructions, setCanUseIosInstructions] = useState(false);
  const [isShowingIosInstructions, setIsShowingIosInstructions] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const frameId = window.requestAnimationFrame(() => {
      setIsInstalled(detectStandaloneMode());
      setCanUseIosInstructions(detectIosInstallSupportGap());
    });

    function handleBeforeInstallPrompt(event: Event) {
      const nextEvent = event as BeforeInstallPromptEvent;
      nextEvent.preventDefault();
      setInstallPrompt(nextEvent);
      setIsInstalled(detectStandaloneMode());
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
      setCanUseIosInstructions(false);
      setIsShowingIosInstructions(false);
    }

    function handleDisplayModeChange() {
      setIsInstalled(detectStandaloneMode());
      setCanUseIosInstructions(detectIosInstallSupportGap());
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function promptInstall() {
    if (detectIosInstallSupportGap()) {
      setIsShowingIosInstructions((current) => !current);
      return;
    }

    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
      setIsShowingIosInstructions(false);
      return;
    }

    setIsShowingIosInstructions(false);
  }

  const hasIosInstructions = useMemo(() => canUseIosInstructions && !isInstalled, [
    canUseIosInstructions,
    isInstalled,
  ]);

  return {
    canInstall: !isInstalled && (!!installPrompt || hasIosInstructions),
    hasIosInstructions,
    isInstalled,
    isShowingIosInstructions,
    promptInstall,
    setIsShowingIosInstructions,
  };
}
