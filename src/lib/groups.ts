// ──────────────────────────────────────────────────────────────────────
// Invite code generation
// Uses an unambiguous alphabet: no 0/O, no 1/I/L
// ──────────────────────────────────────────────────────────────────────
const INVITE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  return Array.from(
    { length },
    () => INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  ).join("");
}

// ──────────────────────────────────────────────────────────────────────
// DB row types (mirror the SQL schema exactly)
// ──────────────────────────────────────────────────────────────────────

export type GroupRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

// ──────────────────────────────────────────────────────────────────────
// Enriched type used in the dashboard
// ──────────────────────────────────────────────────────────────────────

export type GroupWithMeta = GroupRow & {
  member_count: number;
  is_owner: boolean;
};

// ──────────────────────────────────────────────────────────────────────
// Server Action result types
// ──────────────────────────────────────────────────────────────────────

export type GroupActionResult =
  | {
      error: string;
      /** Full Supabase error detail — only populated in development */
      devMessage?: string;
    }
  | { success: true; group: Pick<GroupRow, "id" | "name" | "invite_code"> };

export type GroupActionState = GroupActionResult | null;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

export function formatMemberCount(n: number): string {
  return n === 1 ? "1 miembro" : `${n} miembros`;
}

export function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
  return `hace ${Math.floor(days / 30)} meses`;
}
