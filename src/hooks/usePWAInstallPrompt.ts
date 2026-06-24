"use client";

import { useCallback, useEffect, useState } from "react";

export type PWAPlatform = "android" | "ios-safari" | "ios-unsupported" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): PWAPlatform {
  const ua = window.navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ reports as "Macintosh" but exposes multi-touch, unlike real macOS.
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  if (isIOS) {
    const isIOSChrome = /CriOS/.test(ua);
    const isOtherIOSBrowser = /FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
    const isSafari = /Safari/.test(ua) && !isIOSChrome && !isOtherIOSBrowser;
    return isSafari ? "ios-safari" : "ios-unsupported";
  }

  if (/Android/.test(ua)) return "android";

  return "desktop";
}

function detectStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari legacy flag — not in the standard lib.dom typings.
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

/**
 * Reusable PWA install detection so Login, the user menu, and the Home
 * banner don't each re-implement platform sniffing.
 *
 * - Android: waits for the native `beforeinstallprompt` event before
 *   reporting `canInstall`, then exposes `promptInstall()` to trigger it.
 * - iOS Safari: no native prompt exists, so `canInstall` is always true —
 *   callers are expected to open the manual instructions modal instead.
 * - iOS Chrome/other and desktop: never installable through this UI.
 */
export function usePWAInstallPrompt() {
  const [platform, setPlatform] = useState<PWAPlatform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // UA/matchMedia detection needs `window`, so it can only run client-side —
    // deliberately deferred to an effect to keep SSR markup (no `window`) and
    // the first client render in sync and avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());
    setIsStandalone(detectStandalone());

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = () => setIsStandalone(detectStandalone());
    standaloneQuery.addEventListener("change", onStandaloneChange);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setDeferredEvent(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      standaloneQuery.removeEventListener("change", onStandaloneChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return "unavailable" as const;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return outcome;
  }, [deferredEvent]);

  const canInstall = platform === "android" ? deferredEvent !== null : platform === "ios-safari";
  const showInstallCta = !isStandalone && canInstall;

  return { platform, isStandalone, canInstall, showInstallCta, promptInstall };
}
