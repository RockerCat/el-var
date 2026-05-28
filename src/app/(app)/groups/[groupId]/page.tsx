import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import Leaderboard from "@/components/groups/Leaderboard";
import CopyButton from "@/components/groups/CopyButton";
import CopyInviteLinkButton from "@/components/groups/CopyInviteLinkButton";
import { formatMemberCount } from "@/lib/groups";

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
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
    .select("id, name, invite_code, owner_id, group_members(count)")
    .eq("id", groupId)
    .single();

  if (!rawGroup) redirect("/dashboard");

  const group = rawGroup as RawGroup;
  const memberCount = group.group_members?.[0]?.count ?? 0;
  const isOwner = group.owner_id === user.id;

  const leaderboard = await getGroupLeaderboard(groupId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1 mb-3"
        >
          ← Mis grupos
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-black text-[#f1f5f9]">{group.name}</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-semibold">
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[#64748b]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(memberCount)}</span>
        </div>
      </div>

      {/* Invite code */}
      <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4">
        <p className="text-[10px] text-[#475569] font-mono uppercase tracking-widest mb-3">
          Código de invitación
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

      {/* Leaderboard */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide">
            Tabla de posiciones
          </h2>
          <span className="text-xs bg-[#18182a] border border-[#2a2a45] text-[#64748b] px-1.5 py-0.5 rounded-full">
            {leaderboard.length}
          </span>
        </div>
        <Leaderboard entries={leaderboard} currentUserId={user.id} />
      </section>

      <div className="h-4" />
    </div>
  );
}
