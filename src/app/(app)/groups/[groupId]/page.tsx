import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupLeaderboard, getGroupActivity } from "@/lib/db/leaderboard";
import Leaderboard from "@/components/groups/Leaderboard";
import MemberList from "@/components/groups/MemberList";
import GroupStats from "@/components/groups/GroupStats";
import ActivityFeed from "@/components/groups/ActivityFeed";
import CopyButton from "@/components/groups/CopyButton";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import {
  formatMemberCount,
  formatRelativeDate,
  type MemberDetail,
} from "@/lib/groups";

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  group_members: { count: number }[];
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

  // RLS enforces membership — returns null if user is not a member
  const { data: rawGroup } = await supabase
    .from("groups")
    .select("id, name, invite_code, owner_id, created_at, group_members(count)")
    .eq("id", groupId)
    .single();

  if (!rawGroup) redirect("/dashboard");

  const group = rawGroup as RawGroup;
  const memberCount = group.group_members?.[0]?.count ?? 0;
  const isOwner = group.owner_id === user.id;

  // Parallel fetch: leaderboard, activity, member join dates, match counts
  const [leaderboard, activity, membersResult, matchesResult] = await Promise.all([
    getGroupLeaderboard(groupId),
    getGroupActivity(groupId),
    supabase
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true }),
    supabase.from("matches").select("status"),
  ]);

  // Derive members: names come from leaderboard, join dates from group_members
  const nameMap = new Map(leaderboard.map((e) => [e.user_id, e.display_name]));
  const members: MemberDetail[] = (membersResult.data ?? []).map((r) => ({
    user_id:      r.user_id as string,
    display_name: nameMap.get(r.user_id as string) ?? "Usuario",
    is_owner:     (r.user_id as string) === group.owner_id,
    joined_at:    r.joined_at as string,
  }));

  // Match stats
  const allMatches     = matchesResult.data ?? [];
  const scoredMatches  = allMatches.filter((m) => m.status === "finished").length;
  const pendingMatches = allMatches.filter((m) => m.status !== "finished").length;

  // Group stats
  const totalPredictions = leaderboard.reduce((sum, e) => sum + e.pred_count, 0);
  const leader           = leaderboard.find((e) => e.total_points > 0);

  // Current user context
  const userEntry  = leaderboard.find((e) => e.user_id === user.id);
  const isLeading  =
    !!userEntry &&
    userEntry.rank === 1 &&
    leaderboard.length > 1 &&
    userEntry.total_points > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
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
        <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(memberCount)}</span>
          <span className="text-[#2a2a45]">·</span>
          <span>Creado {formatRelativeDate(group.created_at)}</span>
        </div>
      </div>

      {/* Invite link — admin only */}
      {isOwner && (
        <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4">
          <p className="text-[10px] text-[#475569] font-mono uppercase tracking-widest mb-3">
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

      {/* Group stats */}
      <section>
        <SectionHeader title="Resumen" />
        <GroupStats
          memberCount={memberCount}
          totalPredictions={Number(totalPredictions)}
          scoredMatches={scoredMatches}
          pendingMatches={pendingMatches}
          leaderName={leader?.display_name ?? null}
        />
      </section>

      {/* Leaderboard */}
      <section>
        <SectionHeader title="Tabla de posiciones" count={leaderboard.length} />
        <Leaderboard entries={leaderboard} currentUserId={user.id} />
      </section>

      {/* Members */}
      <section>
        <SectionHeader title="Miembros" count={members.length} />
        <MemberList members={members} currentUserId={user.id} />
      </section>

      {/* Activity */}
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
        <span className="text-xs bg-[#18182a] border border-[#2a2a45] text-[#64748b] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
