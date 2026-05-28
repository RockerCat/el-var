import { createClient } from "@/lib/supabase/server";
import type { GroupWithMeta } from "@/lib/groups";

type RawGroup = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  group_members: { count: number }[];
};

type DiagnoseResult = {
  uid: string | null;
  role: string;
  jwt_present: boolean;
};

/**
 * Returns all groups the user belongs to, enriched with member count and owner flag.
 * The SELECT is filtered by the groups RLS policy which uses get_user_group_ids(auth.uid()).
 * If auth.uid() is NULL in the PostgREST context, this will return an empty array even if
 * the user is a member — the diagnostic log below will reveal this scenario.
 */
export async function getUserGroupsWithMeta(
  userId: string
): Promise<GroupWithMeta[]> {
  const supabase = await createClient();

  // Diagnose PostgREST auth context — critical for understanding empty results
  const { data: diagData } = await supabase.rpc("diagnose_auth_context");
  const diag = diagData as DiagnoseResult | null;
  console.log("[getUserGroups] diagnose_auth_context →", {
    uid:         diag?.uid ?? null,
    role:        diag?.role ?? null,
    jwt_present: diag?.jwt_present ?? null,
    userId_prop: userId,
    uid_matches: diag?.uid === userId,
  });

  const { data, error } = await supabase
    .from("groups")
    .select(
      `id, name, invite_code, owner_id, created_at, group_members(count)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserGroups] SELECT error:", {
      code:    error.code,
      message: error.message,
      hint:    error.hint,
    });
    return [];
  }

  console.log("[getUserGroups] SELECT returned", data?.length ?? 0, "row(s)");

  return (data as RawGroup[]).map((g) => ({
    id:           g.id,
    name:         g.name,
    invite_code:  g.invite_code,
    owner_id:     g.owner_id,
    created_at:   g.created_at,
    member_count: g.group_members?.[0]?.count ?? 0,
    is_owner:     g.owner_id === userId,
  }));
}
