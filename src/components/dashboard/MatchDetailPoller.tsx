"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePredictionEditing } from "@/contexts/prediction-editing";

interface Props {
  startsAt: string; // ISO UTC from server
  status:   string; // "scheduled" | "live" | "finished"
}

const HIDDEN_INTERVAL_MS = 60_000;

/**
 * Returns the next polling delay (ms) for a match detail page.
 *
 *   finished               → 60 s (passive — score won't change)
 *   live                   → 10 s
 *   scheduled, ≤ 5 min     → 10 s  (imminent kickoff)
 *   scheduled, > 5 min     → 30 s
 *   kickoff passed in DB   → 5 s   (lazy sync not yet flushed)
 *
 * Re-evaluated on every tick so the threshold crossing is detected
 * without waiting for a server re-render.
 */
function pollingInterval(status: string, startsAt: string): number {
  if (status === "finished") return HIDDEN_INTERVAL_MS;
  if (status === "live")     return 10_000;

  // status === "scheduled"
  const msToKickoff = new Date(startsAt).getTime() - Date.now();
  if (msToKickoff <= 0)              return 5_000;   // DB not yet synced
  if (msToKickoff <= 5 * 60_000)    return 10_000;  // ≤ 5 min
  return 30_000;                                      // > 5 min
}

/**
 * Invisible polling component for the match detail page.
 *
 * Behaviour:
 *   - Uses setTimeout chaining (not setInterval) so the delay is
 *     recalculated fresh on every tick — the 5-min threshold is
 *     detected without needing a server re-render in between.
 *   - finished match   → no active polling
 *   - live match       → 5 s
 *   - ≤ 5 min to kick  → 10 s
 *   - > 5 min to kick  → 30 s
 *   - tab hidden       → 60 s regardless of state
 *   - editing form open, before kickoff → polling skipped (timer keeps running)
 *   - editing form open, after kickoff  → polling continues (lazy sync must fire)
 *   - editing form closed → immediate refresh + resume normal cadence
 *   - in-flight guard  → never double-fires router.refresh()
 */
export default function MatchDetailPoller({ startsAt, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isPendingRef    = useRef(false);
  const isAnyEditingRef = useRef(false);
  const prevEditingRef  = useRef(false);

  const { isAnyEditing } = usePredictionEditing();

  useEffect(() => { isPendingRef.current = isPending; }, [isPending]);
  useEffect(() => { isAnyEditingRef.current = isAnyEditing; }, [isAnyEditing]);

  // Immediate refresh the moment all editing forms close.
  useEffect(() => {
    if (prevEditingRef.current && !isAnyEditing && !isPendingRef.current) {
      startTransition(() => router.refresh());
    }
    prevEditingRef.current = isAnyEditing;
  }, [isAnyEditing, router]);

  useEffect(() => {
    if (status === "finished") return;

    let id: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const isHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      const ms = isHidden ? HIDDEN_INTERVAL_MS : pollingInterval(status, startsAt);
      id = setTimeout(tick, ms);
    }

    function tick() {
      // If kickoff has already passed, refresh regardless of editing state —
      // the lazy scheduled→live sync must fire even while the form is open.
      const kickoffPassed = new Date(startsAt).getTime() <= Date.now();
      const editingBlocks = isAnyEditingRef.current && !kickoffPassed;
      if (!isPendingRef.current && !editingBlocks) {
        startTransition(() => router.refresh());
      }
      scheduleNext(); // always chain next tick, even when skipped
    }

    scheduleNext();

    function handleVisibilityChange() {
      clearTimeout(id);
      scheduleNext();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, startsAt, router]);

  return null;
}
