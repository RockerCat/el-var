"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePredictionEditing } from "@/contexts/prediction-editing";

interface LiveMatchPollerProps {
  /** True when at least one live match is present on this page. */
  hasLiveMatch: boolean;
  /**
   * Interval (ms) while tab is visible and a live match exists.
   * Dashboard default: 10 000 ms   Match detail default: 10 000 ms
   */
  activeInterval?: number;
  /**
   * Interval (ms) while tab is visible and NO live match exists.
   * Kept short so the lazy scheduled→live transition is detected quickly.
   * Default: 15 000 ms
   */
  idleInterval?: number;
}

const HIDDEN_INTERVAL_MS = 60_000;

/**
 * Invisible component — mounts on pages that need live score polling.
 *
 * Behaviour:
 *   - Tab hidden                     → 60 s (saves battery/bandwidth)
 *   - Tab visible, no live match     → idleInterval (15 s default)
 *   - Tab visible, live match exists → activeInterval (5 s default)
 *   - Any prediction form is open    → polling paused entirely
 *   - Form closed (save/cancel)      → immediate refresh, then resume interval
 *   - In-flight guard: if a previous router.refresh() is still pending, skip tick
 */
export default function LiveMatchPoller({
  hasLiveMatch,
  activeInterval = 10_000,
  idleInterval   = 15_000,
}: LiveMatchPollerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mirror volatile values into refs so interval callbacks always see latest state
  // without needing to be recreated on every render.
  const isPendingRef     = useRef(false);
  const isAnyEditingRef  = useRef(false);
  const prevEditingRef   = useRef(false);

  const { isAnyEditing } = usePredictionEditing();

  const dev = process.env.NODE_ENV === "development";

  useEffect(() => { isPendingRef.current = isPending; }, [isPending]);
  useEffect(() => { isAnyEditingRef.current = isAnyEditing; }, [isAnyEditing]);

  // When ALL editing forms close, fire an immediate refresh so the page
  // reflects any status change that may have happened while paused.
  useEffect(() => {
    if (prevEditingRef.current && !isAnyEditing && !isPendingRef.current) {
      if (dev) console.debug("[poller] editing ended → immediate refresh");
      startTransition(() => router.refresh());
    }
    prevEditingRef.current = isAnyEditing;
  }, [isAnyEditing, router, dev]);

  useEffect(() => {
    if (dev) console.debug(`[poller] mounted — hasLive=${hasLiveMatch} idle=${idleInterval}ms active=${activeInterval}ms`);

    function doRefresh() {
      if (isPendingRef.current) {
        if (dev) console.debug("[poller] tick skipped — refresh in flight");
        return;
      }
      if (isAnyEditingRef.current) {
        if (dev) console.debug("[poller] tick skipped — prediction form open");
        return;
      }
      if (dev) console.debug(`[poller] router.refresh() @ ${new Date().toLocaleTimeString()}`);
      startTransition(() => router.refresh());
    }

    function getInterval() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return HIDDEN_INTERVAL_MS;
      }
      return hasLiveMatch ? activeInterval : idleInterval;
    }

    if (dev) console.debug(`[poller] setInterval ${getInterval()}ms`);
    let id = setInterval(doRefresh, getInterval());

    // When the tab becomes visible again, restart the interval at the correct
    // rate so users don't wait up to 60 s after switching back.
    function handleVisibilityChange() {
      clearInterval(id);
      const ms = getInterval();
      if (dev) console.debug(`[poller] visibility changed → setInterval ${ms}ms`);
      id = setInterval(doRefresh, ms);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (dev) console.debug("[poller] unmounted / deps changed — clearInterval");
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasLiveMatch, activeInterval, idleInterval, router, dev]);

  if (!hasLiveMatch) return null;

  return (
    <p className="text-[10px] text-[#64748b] font-mono text-right mb-1 select-none">
      Actualización en vivo activa
    </p>
  );
}
