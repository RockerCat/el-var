import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import PhaseMatchView from "@/components/dashboard/PhaseMatchView";
import { getMatchesWithPredictions } from "@/lib/db/matches";
import { getUserGroupsWithMeta } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import { matchClosedReason, formatKickoff, type MatchWithPrediction } from "@/lib/matches";
import type { LeaderboardEntry } from "@/lib/groups";
import { Check } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admins have their own panel — they never see the player dashboard
  if (await isAdmin(user.id)) redirect("/admin");

  // Non-members (accounts created without an invite) cannot access the game
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const username = user.user_metadata?.username as string | undefined;
  const displayName = username ?? user.email?.split("@")[0] ?? "jugador";

  const [matches, groups] = await Promise.all([
    getMatchesWithPredictions(user.id),
    getUserGroupsWithMeta(user.id),
  ]);

  const community   = groups[0] ?? null;
  const leaderboard = community ? await getGroupLeaderboard(community.id) : [];
  const userEntry   = leaderboard.find((e) => e.user_id === user.id) ?? null;

  // Scheduled matches with open prediction window and no prediction yet
  const pendingCount = matches.filter(
    (m) => m.status === "scheduled" && matchClosedReason(m) === null && !m.prediction
  ).length;

  // Next match the user can still predict
  const nextMatch =
    matches.find((m) => m.status === "scheduled" && matchClosedReason(m) === null) ?? null;

  return (
    <div className="max-w-[1320px] mx-auto px-4 py-6">
      {/*
        DOM order: [user-summary] [matches] [leaderboard]
        Mobile (flex-col): user-summary → matches → leaderboard
        Desktop (lg:grid):  user-summary | matches | leaderboard
      */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_1fr_200px] lg:items-start lg:gap-6">

        {/* ── Left: user summary ────────────────────────────────────── */}
        <aside className="lg:col-start-1 lg:row-start-1">
          <UserSummaryPanel
            displayName={displayName}
            userEntry={userEntry}
            pendingCount={pendingCount}
          />
        </aside>

        {/* ── Center: next-match card + group blocks ───────────────── */}
        <main className="lg:col-start-2 lg:row-start-1 min-w-0">
          {nextMatch && <NextMatchCard match={nextMatch} />}
          <PhaseMatchView matches={matches} />
        </main>

        {/* ── Right: leaderboard ────────────────────────────────────── */}
        {leaderboard.length > 0 && (
          <aside className="lg:col-start-3 lg:row-start-1">
            <div className="lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
              <LeaderboardPanel leaderboard={leaderboard} currentUserId={user.id} />
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}

// ── Next-match card ───────────────────────────────────────────────────
// Surfaces the soonest open prediction above the group grid.

function NextMatchCard({ match }: { match: MatchWithPrediction }) {
  const hasPrediction = !!match.prediction;

  return (
    <div className={cn(
      "rounded-2xl border p-4 mb-5",
      hasPrediction
        ? "bg-[#11111c] border-[#1e1e35]"
        : "bg-[#f59e0b]/[0.04] border-[#f59e0b]/20"
    )}>
      <div className="flex items-start justify-between gap-3">

        {/* Match info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-2">
            ⚽ Próximo partido
          </p>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-lg leading-none">{match.home_team.flag_emoji ?? "🏴"}</span>
            <span className="text-sm font-bold text-[#f1f5f9] truncate">{match.home_team.name}</span>
            <span className="text-[10px] text-[#475569] font-bold shrink-0">vs</span>
            <span className="text-sm font-bold text-[#f1f5f9] truncate">{match.away_team.name}</span>
            <span className="text-lg leading-none">{match.away_team.flag_emoji ?? "🏴"}</span>
          </div>
          <p className="text-[10px] text-[#475569]">{formatKickoff(match.starts_at)}</p>
        </div>

        {/* Prediction status */}
        <div className="shrink-0 text-right">
          {hasPrediction ? (
            <div>
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <Check size={9} className="text-[#00c85a]" />
                <span className="text-[10px] text-[#00c85a]">Guardado</span>
              </div>
              <span className="font-mono font-black text-base text-[#f1f5f9] tabular-nums">
                {match.prediction!.home_score}–{match.prediction!.away_score}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#f59e0b]">⚠</span>
              <span className="text-xs font-semibold text-[#f59e0b]/80">Pendiente</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Left sidebar: user summary ────────────────────────────────────────

function UserSummaryPanel({
  displayName,
  userEntry,
  pendingCount,
}: {
  displayName: string;
  userEntry: LeaderboardEntry | null;
  pendingCount: number;
}) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#00c85a]/15 border border-[#00c85a]/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-black text-[#00c85a]">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#f1f5f9] truncate">{displayName}</p>
          <p className="text-[10px] text-[#475569]">La Penúltima</p>
        </div>
      </div>

      {/* Primary stats: rank + points */}
      {userEntry ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1.5">
                Posición
              </p>
              <p className={cn(
                "text-3xl font-black leading-none tabular-nums",
                userEntry.rank <= 3 ? "text-[#f59e0b]" : "text-[#f1f5f9]"
              )}>
                #{userEntry.rank}
              </p>
            </div>
            <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1.5">
                Puntos
              </p>
              <p className="text-3xl font-black leading-none tabular-nums text-[#f1f5f9]">
                {userEntry.total_points}
              </p>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="border-t border-[#1e1e35] pt-3 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-sm font-black text-[#f59e0b] tabular-nums">
                {userEntry.exact_count}
              </p>
              <p className="text-[10px] text-[#475569]">Exactos</p>
            </div>
            <div>
              <p className="text-sm font-black text-[#00c85a] tabular-nums">
                {userEntry.result_count}
              </p>
              <p className="text-[10px] text-[#475569]">Ganadores</p>
            </div>
            <div>
              <p className={cn(
                "text-sm font-black tabular-nums",
                pendingCount > 0 ? "text-[#f59e0b]" : "text-[#475569]"
              )}>
                {pendingCount}
              </p>
              <p className="text-[10px] text-[#475569]">Pendientes</p>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#18182a] rounded-xl p-4 text-center">
          <p className="text-xs text-[#475569]">
            Haz tu primera predicción para aparecer en la tabla.
          </p>
        </div>
      )}

    </div>
  );
}

// ── Right sidebar: leaderboard ────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function LeaderboardPanel({
  leaderboard,
  currentUserId,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}) {
  const leaderPts = leaderboard[0]?.total_points ?? 0;

  return (
    <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl overflow-hidden">
      <div className="py-3 text-center border-b border-[#2a2a45]">
        <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
          Ranking
        </p>
      </div>
      <div className="divide-y divide-[#1e1e35]">
        {leaderboard.map((entry) => {
          const isMe  = entry.user_id === currentUserId;
          const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
          const diff  = leaderPts > 0 && entry.total_points < leaderPts
            ? leaderPts - entry.total_points
            : null;

          return (
            <div key={entry.user_id}>
              {/* "Líder actual" label — only above the first place entry */}
              {entry.rank === 1 && leaderPts > 0 && (
                <p className="px-3 pt-2 pb-0.5 text-[9px] font-mono text-[#f59e0b]/70 uppercase tracking-widest">
                  Líder actual
                </p>
              )}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2.5",
                isMe && "bg-[#00c85a]/5"
              )}
            >
              {/* Medal or rank */}
              <div className="w-6 shrink-0 text-center">
                {medal ? (
                  <span className="text-sm leading-none">{medal}</span>
                ) : (
                  <span className="text-[10px] font-mono text-[#64748b]">#{entry.rank}</span>
                )}
              </div>

              {/* Name */}
              <p className={cn(
                "text-sm flex-1 truncate",
                isMe ? "font-black text-[#f1f5f9]" : "font-normal text-[#94a3b8]"
              )}>
                {entry.display_name}
              </p>

              {/* Points + optional diff */}
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className={cn(
                    "text-sm tabular-nums font-bold",
                    isMe ? "text-[#f1f5f9]" : "text-[#64748b]"
                  )}>
                    {entry.total_points}
                  </span>
                  <span className="text-[9px] text-[#475569]">pts</span>
                </div>
                {diff !== null && (
                  <p className="text-[9px] text-[#ef4444]/70 tabular-nums">-{diff}</p>
                )}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
