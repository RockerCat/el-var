"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry, ProjectedPrize } from "@/lib/groups";
import Leaderboard from "@/components/groups/Leaderboard";
import PodiumPlace from "@/components/podium/PodiumPlace";
import ConfettiCelebration from "@/components/podium/ConfettiCelebration";

export type PodiumMode = "preview" | "final";

interface PodiumViewProps {
  mode: PodiumMode;
  leaderboard: LeaderboardEntry[];
  projectedPrizes: [string, ProjectedPrize][];
  currentUserId: string;
}

export default function PodiumView({
  mode,
  leaderboard,
  projectedPrizes,
  currentUserId,
}: PodiumViewProps) {
  const isFinal = mode === "final";
  const prizeMap = new Map(projectedPrizes);

  // Top-3 taken by array position, not by re-deriving rank — the leaderboard
  // array already carries the official display order (ties included) from
  // getGroupLeaderboard. We never reinterpret that order here.
  const [first, second, third] = leaderboard;

  const diff = first && second ? first.total_points - second.total_points : null;

  return (
    <div className="space-y-8 pb-4">
      <ConfettiCelebration active={isFinal} />

      {/* ── Header ── */}
      <div className="animate-podium-fade-in text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">Podio final</h1>
        <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
          El torneo llegó a su final. Gracias por participar, competir y vivir juntos cada partido.
        </p>

        {!isFinal && (
          <p className="inline-block text-[11px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/25 rounded-full px-3 py-1.5 mt-1">
            Vista previa para administrador. Las posiciones todavía pueden cambiar.
          </p>
        )}

        {isFinal && first && (
          <p className="text-base sm:text-lg font-black text-[#f59e0b] pt-1">
            🏆 {first.display_name}, campeón de La Penúltima
          </p>
        )}
      </div>

      {/* ── Podium ── */}
      {leaderboard.length > 0 && (
        <div className="animate-podium-fade-in flex items-end justify-center gap-3 sm:gap-5 px-2">
          {second && (
            <PodiumPlace
              entry={second}
              prize={prizeMap.get(second.user_id)}
              slotLabel="Segundo lugar"
              medal="🥈"
              isChampion={false}
              animationDelayMs={0}
            />
          )}
          {first && (
            <PodiumPlace
              entry={first}
              prize={prizeMap.get(first.user_id)}
              slotLabel="Campeón"
              medal="🥇"
              isChampion
              animationDelayMs={220}
            />
          )}
          {third && (
            <PodiumPlace
              entry={third}
              prize={prizeMap.get(third.user_id)}
              slotLabel="Tercer lugar"
              medal="🥉"
              isChampion={false}
              animationDelayMs={60}
            />
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {leaderboard.length > 0 && (
        <div
          className={cn(
            "animate-podium-fade-scale grid gap-2 sm:gap-3",
            diff !== null ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          <SummaryCard label="Participantes" value={String(leaderboard.length)} />
          <SummaryCard
            label={isFinal ? "Puntaje campeón" : "Puntaje líder"}
            value={first ? String(first.total_points) : "—"}
          />
          {diff !== null && (
            <SummaryCard
              label={isFinal ? "Ventaja final" : "Diferencia 1.º–2.º"}
              value={String(diff)}
            />
          )}
        </div>
      )}

      {/* ── Full classification (reuses the existing Leaderboard component) ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest text-center">
          {isFinal ? "Clasificación final" : "Clasificación actual"}
        </h2>
        <Leaderboard entries={leaderboard} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-3 sm:p-4 text-center">
      <p className="text-[9px] sm:text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg sm:text-xl font-black text-[#f1f5f9] tabular-nums">{value}</p>
    </div>
  );
}
