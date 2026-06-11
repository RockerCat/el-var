#!/usr/bin/env npx tsx
/**
 * La Penúltima — Manual Snapshot Restore
 * =======================================
 *
 * PURPOSE
 *   Restores application data from a snapshot JSON file downloaded via
 *   Admin → Seguridad → Descargar Snapshot.
 *
 *   This is a SELECTIVE restore — it does NOT truncate existing tables.
 *   Each row is upserted (insert or update on primary-key conflict), so
 *   running the script twice is safe and idempotent.
 *
 * WHAT THIS RESTORES
 *   teams, groups, admin_users, user_profiles, group_members,
 *   matches, predictions, admin_activity_log, admin_match_audit
 *
 * WHAT THIS DOES NOT RESTORE
 *   Supabase Auth (auth.users) — passwords, sessions, OAuth identities,
 *   MFA settings. These cannot be exported and must be recreated manually
 *   in the Supabase dashboard BEFORE running this script.
 *
 *   The snapshot's `user_directory` section lists every participant's
 *   user_id, email, and display_name — use it as a checklist.
 *
 * PRE-REQUISITES
 *   1. Every user listed in snapshot.user_directory must already exist in
 *      Supabase Auth with the EXACT SAME user_id UUID. If you are restoring
 *      to a fresh project, recreate users via the Supabase dashboard (Auth →
 *      Users → Invite) or via the Admin API, then update their UUIDs to match.
 *   2. Two environment variables are required:
 *        SUPABASE_URL            — your project URL
 *        SUPABASE_SERVICE_ROLE_KEY — secret key from Settings → API
 *      These are NOT the anon key. The service-role key bypasses RLS so the
 *      script can write to all tables.
 *   3. Node 18+ is required. Run with tsx (already installed as dev dep):
 *        npx tsx scripts/restore-snapshot.ts <snapshot.json>
 *
 * USAGE
 *
 *   # Dry run — shows what would be restored without writing anything:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/restore-snapshot.ts ./lapenultima-backup-2026-06-11-18-45.json --dry-run
 *
 *   # Live run:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/restore-snapshot.ts ./lapenultima-backup-2026-06-11-18-45.json
 *
 *   # Using .env.local (requires dotenv-cli):
 *   npx dotenv -e .env.local -- \
 *   npx tsx scripts/restore-snapshot.ts ./snapshot.json
 *
 * RESTORE ORDER (topological — respects FK constraints)
 *   1. teams               no FK dependencies
 *   2. groups              no FK dependencies
 *   3. admin_users         → auth.users
 *   4. user_profiles       → auth.users
 *   5. group_members       → groups, auth.users
 *   6. matches             → teams
 *   7. predictions         → matches, auth.users
 *   8. admin_activity_log  → auth.users  (audit, restore last)
 *   9. admin_match_audit   → matches, auth.users  (audit, restore last)
 *
 * SAFETY NOTES
 *   - Always take a fresh snapshot of the TARGET database BEFORE restoring,
 *     in case you need to roll back the restore itself.
 *   - The script never deletes rows. Rows present in the target DB but absent
 *     from the snapshot are left untouched.
 *   - If a row exists in both the snapshot and the DB, it is overwritten with
 *     the snapshot's values.
 *   - Run --dry-run first. Review the output. Then run without it.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// ── Types ─────────────────────────────────────────────────────────────

interface RestoreOrderEntry {
  table: string;
  note:  string;
}

interface SnapshotMetadata {
  generatedAt:        string;
  generatedBy:        string;
  version:            string;
  totalRecords:       number;
  userDirectoryCount: number;
  schema_version:     { latest: string; total: number; migrations: string[] };
  recordCounts:       Record<string, number>;
  auth_warning:       string[];
  restore_order:      RestoreOrderEntry[];
}

interface UserDirectoryRow {
  user_id:      string;
  display_name: string;
  email:        string;
  joined_at:    string;
  is_disabled:  boolean;
}

interface Snapshot {
  metadata:           SnapshotMetadata;
  user_directory:     UserDirectoryRow[];
  teams:              Record<string, unknown>[];
  groups:             Record<string, unknown>[];
  admin_users:        Record<string, unknown>[];
  user_profiles:      Record<string, unknown>[];
  group_members:      Record<string, unknown>[];
  matches:            Record<string, unknown>[];
  predictions:        Record<string, unknown>[];
  admin_activity_log: Record<string, unknown>[];
  admin_match_audit:  Record<string, unknown>[];
}

// Primary-key column for each table — used as the upsert conflict target.
const TABLE_PK: Record<string, string> = {
  teams:              "id",
  groups:             "id",
  admin_users:        "user_id",
  user_profiles:      "user_id",
  group_members:      "id",
  matches:            "id",
  predictions:        "id",
  admin_activity_log: "id",
  admin_match_audit:  "id",
};

// Topological restore order (must match RESTORE_ORDER in route.ts).
const RESTORE_ORDER: Array<keyof Omit<Snapshot, "metadata" | "user_directory">> = [
  "teams",
  "groups",
  "admin_users",
  "user_profiles",
  "group_members",
  "matches",
  "predictions",
  "admin_activity_log",
  "admin_match_audit",
];

// Rows are upserted in batches to stay within Supabase's request-size limits.
const BATCH_SIZE = 500;

// ── Helpers ───────────────────────────────────────────────────────────

function hr() {
  console.log("━".repeat(56));
}

function bail(msg: string): never {
  console.error(`\nFatal: ${msg}\n`);
  process.exit(1);
}

// ── Entry point ───────────────────────────────────────────────────────

async function main() {
  const args         = process.argv.slice(2);
  const dryRun       = args.includes("--dry-run");
  const snapshotPath = args.find((a) => a.endsWith(".json"));

  // ── Validate inputs ────────────────────────────────────────────────

  if (!snapshotPath) {
    bail(
      "No snapshot file provided.\n" +
      "Usage: npx tsx scripts/restore-snapshot.ts <snapshot.json> [--dry-run]"
    );
  }

  const supabaseUrl      = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl)    bail("SUPABASE_URL environment variable is not set.");
  if (!serviceRoleKey) bail("SUPABASE_SERVICE_ROLE_KEY environment variable is not set.");

  // ── Load snapshot ──────────────────────────────────────────────────

  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as Snapshot;
  } catch (err) {
    bail(`Cannot read snapshot file: ${(err as Error).message}`);
  }

  if (!snapshot.metadata) bail("Invalid snapshot: missing metadata section.");

  const meta = snapshot.metadata;

  // ── Print header ───────────────────────────────────────────────────

  console.log("");
  hr();
  console.log("  La Penúltima — Snapshot Restore");
  hr();
  console.log(`  Snapshot date    : ${meta.generatedAt}`);
  console.log(`  Generated by     : ${meta.generatedBy}`);
  console.log(`  App version      : ${meta.version}`);
  console.log(`  Schema version   : ${meta.schema_version?.latest ?? "?"} (${meta.schema_version?.total ?? 0} migrations)`);
  console.log(`  Total records    : ${meta.totalRecords}`);
  console.log(`  User directory   : ${snapshot.user_directory?.length ?? 0} users`);
  if (dryRun) console.log("\n  *** DRY RUN — no data will be written ***");
  console.log("");

  // ── Auth warning ───────────────────────────────────────────────────

  console.log("  ⚠  AUTH WARNING");
  for (const line of (meta.auth_warning ?? [])) {
    console.log(`     ${line}`);
  }
  console.log("");

  // ── User directory checklist ───────────────────────────────────────

  const users = snapshot.user_directory ?? [];
  if (users.length > 0) {
    console.log(`  Users that must exist in Supabase Auth before restoring (${users.length}):`);
    for (const u of users) {
      const disabled = u.is_disabled ? " [disabled]" : "";
      console.log(`    • ${u.display_name.padEnd(24)} ${u.email}${disabled}`);
      console.log(`      user_id: ${u.user_id}`);
    }
    console.log("");
  }

  // ── Abort countdown (skipped for dry run) ─────────────────────────

  if (!dryRun) {
    console.log("  Starting in 5 seconds — Ctrl+C to abort.");
    await new Promise((r) => setTimeout(r, 5000));
    console.log("");
  }

  // ── Supabase client (service_role bypasses RLS) ────────────────────

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Restore tables ─────────────────────────────────────────────────

  hr();
  console.log("  Table                  Rows        Status");
  hr();

  let totalInserted = 0;
  let totalFailed   = 0;

  for (const table of RESTORE_ORDER) {
    const rows = snapshot[table] ?? [];
    const pk   = TABLE_PK[table];
    const col  = `  ${table}`.padEnd(24);

    if (rows.length === 0) {
      console.log(`${col} —           skipped (empty)`);
      continue;
    }

    if (dryRun) {
      console.log(`${col} ${String(rows.length).padStart(5)}       dry run`);
      continue;
    }

    let inserted = 0;
    let failed   = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: pk });

      if (error) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.error(`\n  Error in ${table} batch ${batchNum}: ${error.message}`);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    totalInserted += inserted;
    totalFailed   += failed;

    const status = failed > 0
      ? `✗ ${failed} failed`
      : `✓ ${inserted} upserted`;

    console.log(`${col} ${String(rows.length).padStart(5)}       ${status}`);
  }

  // ── Summary ────────────────────────────────────────────────────────

  hr();
  if (dryRun) {
    console.log("  Dry run complete. Run without --dry-run to apply.\n");
  } else {
    console.log(`  Done. ${totalInserted} rows upserted.`);
    if (totalFailed > 0) {
      console.log(`  ⚠  ${totalFailed} rows failed — review errors above.`);
    }
    console.log("");
  }
}

main().catch((err) => bail((err as Error).message));
