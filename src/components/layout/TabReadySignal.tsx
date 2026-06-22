"use client";

import { useEffect } from "react";
import { useTabNavigation } from "@/contexts/tab-navigation";

/**
 * Mount once inside each bottom-nav tab's main page to signal that its
 * real content has rendered — only then does MobileTabSkeletonOverlay
 * hide the skeleton. Renders nothing.
 */
export default function TabReadySignal() {
  const { markTabContentReady } = useTabNavigation();

  useEffect(() => {
    markTabContentReady();
  }, [markTabContentReady]);

  return null;
}
