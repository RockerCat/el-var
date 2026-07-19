"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

// Gold / amber / white plus the app's existing brand-green accent.
const CONFETTI_COLORS = ["#f59e0b", "#fcd34d", "#ffffff", "#00c85a"];

/**
 * Fires the champion confetti sequence exactly once per mount: a burst from
 * top-center, then ~700ms later one from the left, then ~700ms later one
 * from the right. Only runs when `active` is true (real tournament-finished
 * state — never during the admin preview) and never for
 * prefers-reduced-motion. Purely an effect — renders nothing.
 */
export default function ConfettiCelebration({ active }: { active: boolean }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    firedRef.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];

    function burst(x: number, y: number) {
      confetti({
        particleCount: 90,
        spread: 100,
        startVelocity: 42,
        gravity: 0.9,
        ticks: 220,
        origin: { x, y },
        colors: CONFETTI_COLORS,
        zIndex: 9999,
      });
    }

    burst(0.5, 0.1);                                    // top-center
    timers.push(setTimeout(() => burst(0.05, 0.3), 700));  // left
    timers.push(setTimeout(() => burst(0.95, 0.3), 1400)); // right

    return () => {
      timers.forEach(clearTimeout);
      confetti.reset();
    };
  }, [active]);

  return null;
}
