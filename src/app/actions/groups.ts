"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, type GroupActionState } from "@/lib/groups";

const isDev = process.env.NODE_ENV !== "production";

function fmtError(ctx: string, err: { code?: string; message: string; details?: string | null; hint?: string | null }): string {
  return [
    `[${ctx}]`,
    `code=${err.code ?? "n/a"}`,
    `msg="${err.message}"`,
    err.hint    ? `hint="${err.hint}"`       : null,
    err.details ? `details="${err.details}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ──────────────────────────────────────────────────────────────────────
// createGroupAction
// ──────────────────────────────────────────────────────────────────────

export async function createGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (name.length > 50) return { error: "El nombre no puede tener más de 50 caracteres." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[createGroup] auth failed:", detail);
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  console.log("[createGroup] user:", user.id);

  const inviteCode = generateInviteCode();
  const { data: rows, error: rpcError } = await supabase.rpc("create_group_for_user", {
    p_name: name,
    p_invite_code: inviteCode,
  });

  if (rpcError) {
    const detail = fmtError("rpc.create_group_for_user", rpcError);
    console.error("[createGroup] RPC failed:", detail);
    return {
      error: "No se pudo crear el grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  const group = (rows as { id: string; name: string; invite_code: string }[])[0];
  console.log("[createGroup] ✓ created:", group?.id);

  revalidatePath("/dashboard");
  return { success: true, group };
}

// ──────────────────────────────────────────────────────────────────────
// joinGroupAction
//
// Calls join_group_for_user(p_invite_code) — a SECURITY DEFINER function
// that bypasses RLS, validates auth.uid() internally, and inserts the
// membership atomically.
//
// The function raises PostgreSQL exceptions for both error cases:
//   RAISE EXCEPTION 'not_authenticated'   — auth.uid() is NULL
//   RAISE EXCEPTION 'invalid_code'        — no group found
//
// These arrive as rpcError.message (not rpcData), so the action checks
// rpcError.message directly — no JSON parsing, no mixed error formats.
// ──────────────────────────────────────────────────────────────────────

export async function joinGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const code = (formData.get("invite_code") as string | null)
    ?.trim()
    .toUpperCase() ?? "";

  // ── Step 1 ────────────────────────────────────────────────────────
  console.log("[joinGroup] invite_code:", code);

  if (code.length < 4) return { error: "Ingresa un código de invitación válido." };

  const supabase = await createClient();

  // ── Step 2: Auth API check ────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("[joinGroup] getUser →", {
    userId:    user?.id ?? null,
    authError: authError?.message ?? null,
  });

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[joinGroup] auth failed:", detail);
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  // ── Step 3: join_group_for_user RPC ──────────────────────────────
  // Returns UUID on success, throws EXCEPTION on error.
  console.log("[joinGroup] calling join_group_for_user, code:", code, "userId:", user.id);

  const { data: groupId, error: rpcError } = await supabase.rpc(
    "join_group_for_user",
    { p_invite_code: code }
  );

  console.log("[joinGroup] RPC response →", {
    groupId,
    rpcErrorMsg:  rpcError?.message  ?? null,
    rpcErrorCode: rpcError?.code     ?? null,
    rpcErrorHint: rpcError?.hint     ?? null,
  });

  if (rpcError) {
    const msg = rpcError.message;

    if (msg === "not_authenticated") {
      const detail = "auth.uid() is NULL in the PostgREST session — JWT did not reach the database layer";
      console.error("[joinGroup] ✗ not_authenticated:", detail);
      return {
        error: "Problema de autenticación. Cierra sesión, vuelve a ingresar e intenta de nuevo.",
        devMessage: isDev ? `[not_authenticated] ${detail}` : undefined,
      };
    }

    if (msg === "invalid_code") {
      console.log("[joinGroup] ✗ invalid_code for:", code);
      return { error: "Código inválido. Verifica que esté bien escrito." };
    }

    // Unexpected RPC error (function missing, syntax error, etc.)
    const detail = fmtError("rpc.join_group_for_user", rpcError);
    console.error("[joinGroup] ✗ unexpected RPC error:", detail);
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  // ── Step 4: success ───────────────────────────────────────────────
  console.log("[joinGroup] ✓ joined group_id:", groupId);

  // Fetch name for the success card (user is now a member — RLS allows this)
  const { data: group, error: selectError } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", groupId as string)
    .single();

  console.log("[joinGroup] group SELECT →", {
    found:       !!group,
    selectError: selectError?.message ?? null,
  });

  revalidatePath("/dashboard");
  return {
    success: true,
    group: {
      id:          groupId as string,
      name:        group?.name        ?? "Grupo",
      invite_code: group?.invite_code ?? code,
    },
  };
}
