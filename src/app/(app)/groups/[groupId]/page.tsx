import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, Users, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupLeaderboard, getGroupActivity } from "@/lib/db/leaderboard";
import { isUserDisabled } from "@/lib/db/admin";
import { getActivePlayerCount } from "@/lib/db/groups";
import { getNewsList } from "@/lib/db/news";
import { formatNewsDate } from "@/lib/news/format";
import MemberList from "@/components/groups/MemberList";
import GroupStats from "@/components/groups/GroupStats";
import ActivityFeed from "@/components/groups/ActivityFeed";
import CopyButton from "@/components/groups/CopyButton";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import {
  formatMemberCount,
  formatRelativeDate,
  computePrizePool,
  computeProjectedPrizes,
  formatCOP,
  type MemberDetail,
  type LeaderboardEntry,
  type PrizePool,
} from "@/lib/groups";

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  entry_fee:        number | null;
  first_place_pct:  number | null;
  second_place_pct: number | null;
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isUserDisabled(user.id)) redirect("/disabled");

  const { data: rawGroup } = await supabase
    .from("groups")
    .select("id, name, invite_code, owner_id, created_at, entry_fee, first_place_pct, second_place_pct")
    .eq("id", groupId)
    .single();

  if (!rawGroup) redirect("/dashboard");

  const group = rawGroup as RawGroup;
  const isOwner = group.owner_id === user.id;

  const [leaderboard, activity, membersResult, matchesResult, activePlayers, recentNews] =
    await Promise.all([
      getGroupLeaderboard(groupId),
      getGroupActivity(groupId),
      supabase
        .from("group_members")
        .select("user_id, joined_at")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true }),
      supabase.from("matches").select("status"),
      getActivePlayerCount(groupId),
      getNewsList().then((list) => list.slice(0, 3)),
    ]);

  const nameMap = new Map(leaderboard.map((e) => [e.user_id, e.display_name]));
  const members: MemberDetail[] = (membersResult.data ?? [])
    .filter((r) => nameMap.has(r.user_id as string))
    .map((r) => ({
      user_id:      r.user_id as string,
      display_name: nameMap.get(r.user_id as string)!,
      is_owner:     (r.user_id as string) === group.owner_id,
      joined_at:    r.joined_at as string,
    }));

  const allMatches     = matchesResult.data ?? [];
  const scoredMatches  = allMatches.filter((m) => m.status === "finished").length;
  const pendingMatches = allMatches.filter((m) => m.status !== "finished").length;

  const totalPredictions = leaderboard.reduce((sum, e) => sum + e.pred_count, 0);
  const leader           = leaderboard.find((e) => e.total_points > 0);

  const prizePool = computePrizePool(
    {
      entry_fee:        group.entry_fee        ?? 0,
      first_place_pct:  group.first_place_pct  ?? 70,
      second_place_pct: group.second_place_pct ?? 30,
    },
    activePlayers
  );

  const userEntry = leaderboard.find((e) => e.user_id === user.id);
  const isLeading =
    !!userEntry &&
    userEntry.rank === 1 &&
    leaderboard.length > 1 &&
    userEntry.total_points > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Inicio
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-black text-[#f1f5f9]">{group.name}</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-semibold">
              <Crown size={10} />
              Admin
            </span>
          )}
          {isLeading && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs font-semibold">
              🔥 Liderando
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(activePlayers)}</span>
          <span className="text-[#2a2a45]">·</span>
          <span>Creado {formatRelativeDate(group.created_at)}</span>
        </div>
      </div>

      {/* Invite link — admin only */}
      {isOwner && (
        <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4">
          <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-3">
            Invitar miembros
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black text-[#f1f5f9] tracking-[0.2em]">
              {group.invite_code}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <CopyButton text={group.invite_code} />
              <CopyInviteLinkButton inviteCode={group.invite_code} />
            </div>
          </div>
        </div>
      )}

      {/* 1. Noticias recientes */}
      <section>
        <SectionHeader title="Noticias recientes" />
        {recentNews.length === 0 ? (
          <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 text-center">
            <p className="text-xs text-[#64748b]">
              Aún no hay noticias. Aparecerán cuando se cierre un partido.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNews.map((item) => (
              <Link key={item.id} href={`/noticias/${item.id}`} className="block">
                <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-4 py-3 hover:border-[#2a2a45] transition-colors">
                  <p className="text-sm font-semibold text-[#f1f5f9] truncate">{item.title}</p>
                  <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2 leading-snug">
                    {item.summary}
                  </p>
                  <p className="text-[10px] text-[#475569] font-mono mt-1.5">
                    {formatNewsDate(item.created_at, {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href="/noticias"
              className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors pt-1 pl-1"
            >
              Ver todas las noticias
              <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </section>

      {/* 2. Resumen */}
      <section>
        <SectionHeader title="Resumen" />
        <GroupStats
          memberCount={activePlayers}
          totalPredictions={Number(totalPredictions)}
          scoredMatches={scoredMatches}
          pendingMatches={pendingMatches}
          leaderName={leader?.display_name ?? null}
        />
      </section>

      {/* 3. Líder actual */}
      {leader && (
        <section>
          <SectionHeader title="Líder actual" />
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 bg-[#11111c] border border-[#1e1e35] rounded-2xl px-4 py-3 hover:border-[#2a2a45] transition-colors"
          >
            <span className="text-xl leading-none shrink-0">🥇</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#f1f5f9] truncate">{leader.display_name}</p>
              <p className="text-xs text-[#64748b] tabular-nums">{leader.total_points} pts</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-xs text-[#475569]">
              <span>Ver tabla</span>
              <ArrowRight size={12} />
            </div>
          </Link>
        </section>
      )}

      {/* 4. Premios proyectados */}
      {prizePool && (
        <section>
          <SectionHeader title="💰 Premios proyectados" />
          <PrizeSummary pool={prizePool} leaderboard={leaderboard} />
        </section>
      )}

      {/* Miembros */}
      <section>
        <SectionHeader title="Miembros" count={members.length} />
        <MemberList members={members} currentUserId={user.id} />
      </section>

      {/* Actividad */}
      <section>
        <SectionHeader
          title="Actividad reciente"
          count={activity.length > 0 ? activity.length : undefined}
        />
        <ActivityFeed entries={activity} currentUserId={user.id} />
      </section>

      <div className="h-4" />
    </div>
  );
}

// ── PrizeSummary ──────────────────────────────────────────────────────

function PrizeSummary({
  pool,
  leaderboard,
}: {
  pool:        PrizePool;
  leaderboard: LeaderboardEntry[];
}) {
  const allZero = leaderboard.every((e) => e.total_points === 0);

  if (allZero) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Bolsa total</span>
          <span className="text-xl font-black text-[#f1f5f9] tabular-nums">{formatCOP(pool.total)}</span>
        </div>
        <p className="text-xs text-[#64748b] leading-relaxed border-t border-[#1e1e35] pt-3">
          Los premios proyectados aparecerán cuando haya resultados puntuados.
        </p>
        <Disclaimer />
      </div>
    );
  }

  const projectedPrizes = computeProjectedPrizes(pool, leaderboard);

  const rank1 = leaderboard.filter((e) => e.rank === 1);
  const rank2 = leaderboard.filter((e) => e.rank === 2);

  const tiedFor1st = rank1.length > 1;

  const firstAmount  = rank1[0] ? (projectedPrizes.get(rank1[0].user_id)?.amount ?? null) : null;
  const secondAmount = rank2[0] ? (projectedPrizes.get(rank2[0].user_id)?.amount ?? null) : null;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
      {/* Bolsa total */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Bolsa total</span>
        <span className="text-xl font-black text-[#f1f5f9] tabular-nums">{formatCOP(pool.total)}</span>
      </div>

      <div className="border-t border-[#1e1e35] pt-3 space-y-3">
        {/* 1er lugar */}
        <PrizeRow
          medal="🥇"
          label={`1er lugar (${pool.config.first_place_pct}%)`}
          names={rank1.map((e) => e.display_name)}
          amount={firstAmount}
          isSplit={tiedFor1st}
          amountColor="text-[#f59e0b]"
          splitNote={tiedFor1st ? `Incluye 2do premio · dividido entre ${rank1.length}` : undefined}
        />

        {/* 2do lugar */}
        {tiedFor1st ? (
          // Prize absorbed into 1st-place split — show as unavailable
          <PrizeRow
            medal="🥈"
            label={`2do lugar (${pool.config.second_place_pct}%)`}
            names={[]}
            amount={null}
            isSplit={false}
            amountColor="text-[#475569]"
            splitNote="Absorbido por empate en 1er lugar"
          />
        ) : (
          <PrizeRow
            medal="🥈"
            label={`2do lugar (${pool.config.second_place_pct}%)`}
            names={rank2.map((e) => e.display_name)}
            amount={secondAmount}
            isSplit={rank2.length > 1}
            amountColor="text-[#94a3b8]"
            splitNote={rank2.length > 1 ? `Dividido entre ${rank2.length}` : undefined}
          />
        )}
      </div>

      <Disclaimer />
    </div>
  );
}

function PrizeRow({
  medal,
  label,
  names,
  amount,
  isSplit,
  amountColor,
  splitNote,
}: {
  medal:       string;
  label:       string;
  names:       string[];
  amount:      number | null;
  isSplit:     boolean;
  amountColor: string;
  splitNote?:  string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base leading-none mt-0.5 shrink-0">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#64748b] mb-0.5">{label}</p>
        {names.length > 0 && (
          <p className="text-xs font-semibold text-[#94a3b8] truncate">
            {names.join(" / ")}
          </p>
        )}
        {splitNote && (
          <p className="text-[10px] text-[#475569] mt-0.5">{splitNote}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {amount !== null ? (
          <>
            <p className={`text-sm font-black tabular-nums ${amountColor}`}>
              {formatCOP(amount)}
            </p>
            {isSplit && (
              <p className="text-[9px] text-[#475569]">c/u</p>
            )}
          </>
        ) : (
          <p className="text-sm font-black text-[#2a2a45]">—</p>
        )}
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-[10px] text-[#475569] leading-relaxed border-t border-[#1e1e35] pt-3">
      La Penúltima no procesa pagos ni administra dinero. Los aportes y premios son gestionados
      directamente por los participantes del grupo.
    </p>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-xs bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
