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

/**
 * Returns all groups the user belongs to, enriched with member count
 * and owner flag. Uses the RLS SELECT policy on `groups` — only groups
 * where the user is a member are returned.
 */
export async function getUserGroupsWithMeta(
  userId: string
): Promise<GroupWithMeta[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      invite_code,
      owner_id,
      created_at,
      group_members(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[db/groups] getUserGroupsWithMeta:", error.message);
    return [];
  }

  return (data as RawGroup[]).map((g) => ({
    id: g.id,
    name: g.name,
    invite_code: g.invite_code,
    owner_id: g.owner_id,
    created_at: g.created_at,
    member_count: g.group_members?.[0]?.count ?? 0,
    is_owner: g.owner_id === userId,
  }));
}
