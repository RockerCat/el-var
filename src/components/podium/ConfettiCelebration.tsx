"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

// Gold / amber / white plus the app's existing brand-green accent.
const CONFETTI_COLORS = ["#f59e0b", "#fcd34d", "#ffffff", "#00c85a"];

const REPEAT_INTERVAL_MS = 5000;

/**
 * Fires the champion confetti sequence (burst top-center, then left, then
 * right) immediately while `active` is true, and repeats it every
 * REPEAT_INTERVAL_MS for as long as `active` stays true. Only runs when
 * `active` is true (real tournament-finished state — never during the admin
 * preview) and never for prefers-reduced-motion. Purely an effect — renders
 * nothing.
 */
export default function ConfettiCelebration({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

    function fireSequence() {
      burst(0.5, 0.1);                                    // top-center
      timers.push(setTimeout(() => burst(0.05, 0.3), 700));  // left
      timers.push(setTimeout(() => burst(0.95, 0.3), 1400)); // right
    }

    fireSequence();
    const intervalId = setInterval(fireSequence, REPEAT_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      timers.forEach(clearTimeout);
      confetti.reset();
    };
  }, [active]);

  return null;
}
