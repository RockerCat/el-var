import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroupsWithMeta, isGroupMember } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/groups";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const groups = await getUserGroupsWithMeta(user.id);
  const community = groups[0] ?? null;
  const leaderboard = community ? await getGroupLeaderboard(community.id) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#f1f5f9]">Tabla de posiciones</h1>
        {community && (
          <p className="text-sm text-[#475569] mt-1">{community.name}</p>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-10 text-center">
          <p className="text-sm text-[#475569]">
            No hay predicciones registradas todavía.
          </p>
        </div>
      ) : (
        <FullLeaderboard entries={leaderboard} currentUserId={user.id} />
      )}
    </div>
  );
}

const TOP_ACCENT = {
  1: { bg: "bg-[#f59e0b]/[0.04]", border: "border-[#f59e0b]/20", rankText: "text-[#f59e0b]" },
  2: { bg: "bg-[#94a3b8]/[0.03]", border: "border-[#94a3b8]/15", rankText: "text-[#94a3b8]" },
  3: { bg: "bg-[#cd7c3a]/[0.04]", border: "border-[#cd7c3a]/20", rankText: "text-[#cd7c3a]" },
} as const;

function FullLeaderboard({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
}) {
  const allZero = entries.every((e) => e.total_points === 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem] items-center gap-3 px-4 pb-1">
        <div />
        <span className="text-[10px] text-[#475569] uppercase tracking-widest">Jugador</span>
        <span className="text-[10px] text-[#475569] uppercase tracking-widest text-center">Pts</span>
        <span className="text-[10px] text-[#f59e0b]/70 uppercase tracking-widest text-center">⚡</span>
        <span className="text-[10px] text-[#00c85a]/70 uppercase tracking-widest text-center">✓</span>
        <span className="text-[10px] text-[#475569] uppercase tracking-widest text-center">Preds</span>
      </div>

      {entries.map((entry) => {
        const isMe = entry.user_id === currentUserId;
        const accent = entry.rank in TOP_ACCENT
          ? TOP_ACCENT[entry.rank as keyof typeof TOP_ACCENT]
          : null;

        const rowBg     = isMe ? "bg-[#00c85a]/[0.05]" : accent?.bg ?? "bg-[#18182a]";
        const rowBorder = isMe ? "border-[#00c85a]/25" : accent?.border ?? "border-[#2a2a45]";
        const rankColor = isMe ? "text-[#00c85a]" : accent?.rankText ?? "text-[#475569]";
        const ptsColor  = entry.total_points === 0
          ? "text-[#2a2a45]"
          : isMe
          ? "text-[#00c85a]"
          : entry.rank === 1
          ? "text-[#f59e0b]"
          : "text-[#f1f5f9]";

        return (
          <div
            key={entry.user_id}
            className={cn(
              "grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem] items-center gap-3 px-4 py-3 rounded-2xl border",
              rowBg,
              rowBorder
            )}
          >
            {/* Rank */}
            <span className={cn("text-sm font-bold tabular-nums text-center", rankColor)}>
              {entry.rank}
            </span>

            {/* Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                isMe ? "bg-[#00c85a]/20 text-[#00c85a]" : "bg-[#1e1e35] text-[#64748b]"
              )}>
                {entry.display_name.charAt(0).toUpperCase()}
              </div>
              <span className={cn(
                "text-sm font-bold truncate",
                isMe ? "text-[#00c85a]" : "text-[#f1f5f9]"
              )}>
                {entry.display_name}
              </span>
              {isMe && (
                <span className="text-[10px] text-[#00c85a]/60 font-mono shrink-0">tú</span>
              )}
            </div>

            {/* Points */}
            <span className={cn("text-sm font-black tabular-nums text-center", ptsColor)}>
              {entry.total_points}
            </span>

            {/* Exact */}
            <span className={cn(
              "text-sm font-bold tabular-nums text-center",
              entry.exact_count > 0 ? "text-[#f59e0b]" : "text-[#2a2a45]"
            )}>
              {entry.exact_count}
            </span>

            {/* Winners */}
            <span className={cn(
              "text-sm font-bold tabular-nums text-center",
              entry.result_count > 0 ? "text-[#00c85a]" : "text-[#2a2a45]"
            )}>
              {entry.result_count}
            </span>

            {/* Predictions made */}
            <span className="text-sm font-bold tabular-nums text-center text-[#475569]">
              {entry.pred_count}
            </span>
          </div>
        );
      })}

      {allZero && (
        <p className="text-[11px] text-[#475569] text-center pt-2 font-mono">
          Los puntos aparecerán cuando se confirmen resultados de partidos.
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pt-3 border-t border-[#1e1e35] mt-2">
        <span className="text-[10px] text-[#f59e0b]/70">⚡ Marcador exacto</span>
        <span className="text-[10px] text-[#00c85a]/70">✓ Ganador correcto</span>
        <span className="text-[10px] text-[#475569]">Preds = predicciones</span>
      </div>
    </div>
  );
}
