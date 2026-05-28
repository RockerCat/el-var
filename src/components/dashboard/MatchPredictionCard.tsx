import { cn } from "@/lib/utils";
import {
  formatKickoff,
  isMatchOpen,
  STAGE_LABELS,
  type MatchWithPrediction,
} from "@/lib/matches";
import Badge from "@/components/ui/Badge";
import PredictionForm from "./PredictionForm";

interface MatchPredictionCardProps {
  match: MatchWithPrediction;
}

export default function MatchPredictionCard({ match }: MatchPredictionCardProps) {
  const { home_team, away_team, status } = match;
  const hasResult =
    status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const open = isMatchOpen(match);

  return (
    <div
      className={cn(
        "bg-[#18182a] border rounded-2xl p-4 transition-colors",
        status === "live"
          ? "border-[#ef4444]/30 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
          : "border-[#2a2a45]"
      )}
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === "live" && <Badge variant="live">EN VIVO</Badge>}
          {status === "scheduled" && (
            <span className="text-xs text-[#64748b]">{formatKickoff(match.starts_at)}</span>
          )}
          {status === "finished" && (
            <span className="text-xs text-[#475569] uppercase tracking-wide font-mono">PT</span>
          )}
        </div>
        <span className="text-[10px] text-[#2a2a45] uppercase tracking-widest font-mono">
          {STAGE_LABELS[match.stage] ?? match.stage}
        </span>
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-2xl leading-none shrink-0">
            {home_team.flag_emoji ?? "🏴"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#f1f5f9] truncate">{home_team.name}</p>
            <p className="text-[10px] text-[#475569] font-mono">{home_team.code}</p>
          </div>
        </div>

        {/* Score center */}
        <div className="text-center shrink-0 w-14">
          {hasResult ? (
            <p className="text-2xl font-black text-[#f1f5f9] tabular-nums leading-none">
              {match.home_score}
              <span className="text-[#475569] font-light mx-0.5">–</span>
              {match.away_score}
            </p>
          ) : status === "live" && match.home_score !== null ? (
            <p className="text-2xl font-black text-[#ef4444] tabular-nums leading-none animate-live-pulse">
              {match.home_score}
              <span className="text-[#475569] font-light mx-0.5">–</span>
              {match.away_score}
            </p>
          ) : (
            <p className="text-base font-bold text-[#2a2a45]">vs</p>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 flex-row-reverse min-w-0">
          <span className="text-2xl leading-none shrink-0">
            {away_team.flag_emoji ?? "🏴"}
          </span>
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-[#f1f5f9] truncate">{away_team.name}</p>
            <p className="text-[10px] text-[#475569] font-mono">{away_team.code}</p>
          </div>
        </div>
      </div>

      {/* Prediction form / display */}
      <PredictionForm
        matchId={match.id}
        isOpen={open}
        currentPrediction={match.prediction}
      />
    </div>
  );
}
