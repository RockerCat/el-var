import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";

// ── Schema version ────────────────────────────────────────────────────
// Reads the migrations directory at request time so the snapshot always
// reflects the exact set of migrations present in this deployment.
// Falls back gracefully if the directory is inaccessible.

function getSchemaVersion(): {
  latest: string;
  total: number;
  migrations: string[];
} {
  try {
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const migrations = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const latest = migrations.at(-1)?.match(/^(\d+)/)?.[1] ?? "000";
    return { latest, total: migrations.length, migrations };
  } catch {
    return { latest: "unknown", total: 0, migrations: [] };
  }
}

// ── Restore order ─────────────────────────────────────────────────────
// Topological order that respects FK constraints.
// Supabase Auth users (auth.users) must be recreated manually FIRST —
// every table that stores a user_id as FK depends on them.

const RESTORE_ORDER = [
  {
    table: "teams",
    note: "No FK dependencies. Safe to restore first.",
  },
  {
    table: "groups",
    note: "No FK dependencies. Must exist before group_members.",
  },
  {
    table: "admin_users",
    note: "Requires auth.users to exist in Supabase Auth first.",
  },
  {
    table: "user_profiles",
    note: "Requires auth.users to exist in Supabase Auth first.",
  },
  {
    table: "group_members",
    note: "Requires groups and auth.users to exist.",
  },
  {
    table: "matches",
    note: "Requires teams (home_team_id / away_team_id FKs).",
  },
  {
    table: "predictions",
    note: "Requires matches and auth.users.",
  },
  {
    table: "admin_activity_log",
    note: "Audit data. Restore last; requires auth.users.",
  },
  {
    table: "admin_match_audit",
    note: "Audit data. Restore last; requires matches and auth.users.",
  },
] as const;

// ── UserDirectory row (public, non-sensitive identification only) ─────

type UserDirectoryRow = {
  user_id:      string;
  display_name: string;
  email:        string;
  joined_at:    string;
  is_disabled:  boolean;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!(await isAdmin(user.id))) {
    return Response.json(
      { error: "Sin permisos de administrador." },
      { status: 403 }
    );
  }

  // All queries run in parallel.
  // predictions / groups / group_members: admin SELECT policies from migration 040.
  // admin_users: SECURITY DEFINER RPC (avoids self-referential RLS recursion).
  // user_directory: existing get_admin_user_list() already callable by admins.
  const [
    { data: teams },
    { data: matches },
    { data: predictions },
    { data: userProfiles },
    { data: adminUsers },
    { data: groups },
    { data: groupMembers },
    { data: activityLog },
    { data: matchAudit },
    { data: userListRaw },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("matches").select("*").order("starts_at"),
    supabase.from("predictions").select("*").order("submitted_at"),
    supabase.from("user_profiles").select("*"),
    supabase.rpc("admin_get_all_admin_users"),
    supabase.from("groups").select("*"),
    supabase.from("group_members").select("*"),
    supabase.from("admin_activity_log").select("*").order("created_at"),
    supabase.from("admin_match_audit").select("*").order("created_at"),
    supabase.rpc("get_admin_user_list"),
  ]);

  // Keep only non-sensitive identification fields from auth.users-backed data.
  // Scores (total_points, pred_count…) are derived data — recalculated from
  // predictions — and do not need to be backed up or restored separately.
  const userDirectory: UserDirectoryRow[] = (
    (userListRaw as Array<Record<string, unknown>> | null) ?? []
  ).map((r) => ({
    user_id:      r.user_id      as string,
    display_name: r.display_name as string,
    email:        r.email        as string,
    joined_at:    r.joined_at    as string,
    is_disabled:  r.is_disabled  as boolean,
  }));

  const now = new Date();
  const generatedAt = now.toISOString();
  const schemaVersion = getSchemaVersion();

  const recordCounts = {
    teams:              teams?.length        ?? 0,
    matches:            matches?.length      ?? 0,
    predictions:        predictions?.length  ?? 0,
    user_profiles:      userProfiles?.length ?? 0,
    admin_users:        adminUsers?.length   ?? 0,
    groups:             groups?.length       ?? 0,
    group_members:      groupMembers?.length ?? 0,
    admin_activity_log: activityLog?.length  ?? 0,
    admin_match_audit:  matchAudit?.length   ?? 0,
  };

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  const snapshot = {
    metadata: {
      generatedAt,
      generatedBy:       user.email ?? user.id,
      generatedByUserId: user.id,
      version:           "0.1.0",
      totalRecords,
      recordCounts,
      // user_directory is reference data (from auth.users), not counted above.
      // It maps user_id → email/display_name to help recreate auth users before restore.
      userDirectoryCount: userDirectory.length,
      schema_version:    schemaVersion,
      auth_warning: [
        "Supabase Auth (auth.users) is NOT included in this snapshot.",
        "Passwords, sessions, OAuth identities, and MFA settings cannot be exported.",
        "Before restoring application data, recreate all users in Supabase Auth",
        "ensuring their user_id UUIDs match the values in this file exactly.",
        "The user_directory section maps user_id → email/display_name to assist.",
      ],
      restore_order: RESTORE_ORDER,
    },
    // Reference section: maps every participant's UUID to their identity.
    // Derived from auth.users via SECURITY DEFINER — no passwords or tokens included.
    user_directory: userDirectory,
    teams:              teams        ?? [],
    matches:            matches      ?? [],
    predictions:        predictions  ?? [],
    user_profiles:      userProfiles ?? [],
    admin_users:        adminUsers   ?? [],
    groups:             groups       ?? [],
    group_members:      groupMembers ?? [],
    admin_activity_log: activityLog  ?? [],
    admin_match_audit:  matchAudit   ?? [],
  };

  // Audit log — fire and forget
  void supabase.from("admin_activity_log").insert({
    admin_id:     user.id,
    action:       "download_snapshot",
    entity_type:  "system",
    entity_id:    user.id,
    entity_label: `Snapshot ${generatedAt.slice(0, 10)} · ${totalRecords} registros`,
    new_values: {
      record_counts:  recordCounts,
      total_records:  totalRecords,
      schema_version: schemaVersion.latest,
    },
  });

  // Filename: lapenultima-backup-YYYY-MM-DD-HH-mm.json
  const pad = (n: number) => n.toString().padStart(2, "0");
  const filename = [
    "lapenultima-backup",
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("-") + ".json";

  const body = JSON.stringify(snapshot, null, 2);
  const byteLength = Buffer.byteLength(body, "utf8");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":        "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      byteLength.toString(),
      "Cache-Control":       "no-store, no-cache",
    },
  });
}
