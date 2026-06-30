"use client";

import { useActionState, useState } from "react";
import Button from "@/components/ui/Button";
import { updateMatchResultAction, type UpdateMatchState } from "@/app/actions/admin";
import { formatKickoff, matchTeamName, matchTeamCode, matchTeamFlag, isKnockoutStage } from "@/lib/matches";
import type { Match, MatchStatus } from "@/lib/matches";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  live:      "En vivo",
  finished:  "Finalizado",
};

const SELECT_CLS =
  "w-full h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 " +
  "focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors";

export default function MatchAdminCard({ match }: { match: Match }) {
  const [state, formAction, isPending] = useActionState<UpdateMatchState, FormData>(
    updateMatchResultAction,
    null
  );

  const [status,     setStatus]     = useState<MatchStatus>(match.status);
  const [homeScore,  setHomeScore]  = useState(match.home_score?.toString() ?? "");
  const [awayScore,  setAwayScore]  = useState(match.away_score?.toString() ?? "");
  const [winnerSide, setWinnerSide] = useState(match.winner_side ?? "");

  const isKnockout = isKnockoutStage(match.stage);
  const bothTeams  = match.home_team !== null && match.away_team !== null;
  const h = parseInt(homeScore, 10);
  const a = parseInt(awayScore, 10);
  const isDraw = homeScore !== "" && awayScore !== "" && !isNaN(h) && !isNaN(a) && h === a;

  const showWinnerSide = isKnockout && status === "live" && isDraw && bothTeams;

  function handleHomeScore(val: string) {
    setHomeScore(val);
    const newH = parseInt(val, 10);
    const curA = parseInt(awayScore, 10);
    if (!isNaN(newH) && !isNaN(curA) && newH !== curA) setWinnerSide("");
  }

  function handleAwayScore(val: string) {
    setAwayScore(val);
    const curH = parseInt(homeScore, 10);
    const newA = parseInt(val, 10);
    if (!isNaN(curH) && !isNaN(newA) && curH !== newA) setWinnerSide("");
  }

  return (
    <form
      action={formAction}
      className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 space-y-4"
    >
      <input type="hidden" name="match_id"    value={match.id} />
      {/* Always included so the existing winner_side is preserved on unrelated edits */}
      <input type="hidden" name="winner_side" value={winnerSide} />

      {/* Match header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{matchTeamFlag(match.home_team)}</span>
          <span className="text-sm font-bold text-[#f1f5f9]">{matchTeamName(match.home_team, match.home_placeholder)}</span>
          <span className="text-xs text-[#64748b] font-mono">vs</span>
          <span className="text-sm font-bold text-[#f1f5f9]">{matchTeamName(match.away_team, match.away_placeholder)}</span>
          <span className="text-base">{matchTeamFlag(match.away_team)}</span>
        </div>
        <p className="text-xs text-[#64748b] font-mono">{formatKickoff(match.starts_at)}</p>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
          Estado
        </label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className={SELECT_CLS}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#94a3b8]">
            {matchTeamCode(match.home_team, match.home_placeholder)} (local)
          </label>
          <input
            type="number"
            name="home_score"
            value={homeScore}
            onChange={(e) => handleHomeScore(e.target.value)}
            min={0}
            max={30}
            placeholder="–"
            className="h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 text-center tabular-nums focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#94a3b8]">
            {matchTeamCode(match.away_team, match.away_placeholder)} (visitante)
          </label>
          <input
            type="number"
            name="away_score"
            value={awayScore}
            onChange={(e) => handleAwayScore(e.target.value)}
            min={0}
            max={30}
            placeholder="–"
            className="h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 text-center tabular-nums focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors"
          />
        </div>
      </div>

      {/* Knockout penalty winner — only while live, tied, and both teams known */}
      {showWinnerSide && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
            Ganador de la llave
          </label>
          {/* No name — hidden input above carries the value to FormData */}
          <select
            value={winnerSide}
            onChange={(e) => setWinnerSide(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">— Por definir —</option>
            <option value="home">
              {match.home_team!.flag_emoji ?? ""} {match.home_team!.name} (local)
            </option>
            <option value="away">
              {match.away_team!.flag_emoji ?? ""} {match.away_team!.name} (visitante)
            </option>
          </select>
          <p className="text-[10px] text-[#64748b]">
            Indica quién avanzó por penales. No afecta la puntuación.
          </p>
        </div>
      )}

      {state && "error" in state && (
        <p className="text-xs text-[#ef4444]">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-[#00c85a]">
          {state.scored > 0
            ? `✓ Guardado · Puntos recalculados correctamente (${state.scored} ${state.scored === 1 ? "predicción" : "predicciones"})`
            : "✓ Guardado"}
        </p>
      )}

      <Button type="submit" size="sm" loading={isPending} fullWidth>
        Guardar cambios
      </Button>
    </form>
  );
}
