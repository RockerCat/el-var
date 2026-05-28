import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/groups";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export default function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">🏆</p>
        <p className="text-sm font-bold text-[#f1f5f9] mb-1">
          Aún no hay puntos
        </p>
        <p className="text-xs text-[#64748b]">
          Los puntos aparecen cuando el admin confirma resultados de partidos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.user_id}
          entry={entry}
          isCurrentUser={entry.user_id === currentUserId}
        />
      ))}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medalEmoji =
    entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors",
        isCurrentUser
          ? "bg-[#00c85a]/5 border-[#00c85a]/25"
          : "bg-[#18182a] border-[#2a2a45]"
      )}
    >
      {/* Rank */}
      <div className="w-7 shrink-0 text-center">
        {medalEmoji ? (
          <span className="text-xl leading-none">{medalEmoji}</span>
        ) : (
          <span className="text-sm font-bold text-[#475569] tabular-nums">
            {entry.rank}
          </span>
        )}
      </div>

      {/* Name + breakdown */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p
            className={cn(
              "text-sm font-bold truncate",
              isCurrentUser ? "text-[#00c85a]" : "text-[#f1f5f9]"
            )}
          >
            {entry.display_name}
          </p>
          {isCurrentUser && (
            <span className="text-[10px] text-[#00c85a]/60 font-mono shrink-0">tú</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entry.exact_count > 0 && (
            <span className="text-[10px] text-[#f59e0b] font-mono">
              ⚡ {entry.exact_count} {entry.exact_count === 1 ? "exacto" : "exactos"}
            </span>
          )}
          {entry.result_count > 0 && (
            <span className="text-[10px] text-[#00c85a] font-mono">
              ✓ {entry.result_count} acertados
            </span>
          )}
          {entry.exact_count === 0 && entry.result_count === 0 && (
            <span className="text-[10px] text-[#2a2a45] font-mono">
              {entry.pred_count > 0
                ? `${entry.pred_count} predicciones`
                : "Sin predicciones aún"}
            </span>
          )}
        </div>
      </div>

      {/* Points */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-2xl font-black tabular-nums leading-none",
            entry.total_points === 0
              ? "text-[#2a2a45]"
              : isCurrentUser
              ? "text-[#00c85a]"
              : "text-[#f1f5f9]"
          )}
        >
          {entry.total_points}
        </p>
        <p className="text-[10px] text-[#475569] font-mono">pts</p>
      </div>
    </div>
  );
}
