"use client";

import { useEffect, useState } from "react";
import { useTabNavigation } from "@/contexts/tab-navigation";
import { TabContentSkeleton, type TabSkeletonVariant } from "@/components/ui/skeletons";

const VARIANT_BY_HREF: Record<string, TabSkeletonVariant> = {
  "/dashboard":   "dashboard",
  "/leaderboard": "leaderboard",
  "/en-vivo":     "en-vivo",
  "/copa":        "copa",
  "/community":   "community",
};

// Skip the skeleton entirely if the route resolves faster than this —
// avoids a flash/flicker on fast navigations.
const SKELETON_DELAY_MS = 200;

export default function MobileTabSkeletonOverlay() {
  const { pendingHref } = useTabNavigation();
  // Href the skeleton is currently shown for — only set once the delay
  // elapses, and reset (via the effect cleanup) as soon as that pending
  // navigation resolves, so a later tap to the same tab waits the full
  // delay again instead of flashing immediately.
  const [visibleHref, setVisibleHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return undefined;
    const timer = setTimeout(() => setVisibleHref(pendingHref), SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setVisibleHref((current) => (current === pendingHref ? null : current));
    };
  }, [pendingHref]);

  if (!pendingHref || visibleHref !== pendingHref) return null;

  return (
    <div className="fixed left-0 right-0 top-14 bottom-16 z-30 md:hidden overflow-y-auto bg-[#0a0a12]">
      <TabContentSkeleton variant={VARIANT_BY_HREF[pendingHref] ?? "dashboard"} />
    </div>
  );
}
