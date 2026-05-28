"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, type GroupActionState } from "@/lib/groups";

const isDev = process.env.NODE_ENV !== "production";

/** Formats a Supabase PostgREST error into a readable string for dev panels. */
function fmtError(ctx: string, err: { code?: string; message: string; details?: string | null; hint?: string | null }): string {
  return [
    `[${ctx}]`,
    `code=${err.code ?? "n/a"}`,
    `msg="${err.message}"`,
    err.hint ? `hint="${err.hint}"` : null,
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

  // ── 1. Input validation ──────────────────────────────────────────
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (name.length > 50) return { error: "El nombre no puede tener más de 50 caracteres." };

  const supabase = await createClient();

  // ── 2. Auth check ────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[createGroup] auth failed:", detail);
    return {
      error: "Debes iniciar sesión.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[createGroup] user OK:", { id: user.id, email: user.email });

  // ── 3. groups INSERT ─────────────────────────────────────────────
  const inviteCode = generateInviteCode();

  console.log("[createGroup] inserting group:", { name, inviteCode, owner_id: user.id });

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, invite_code: inviteCode, owner_id: user.id })
    .select("id, name, invite_code")
    .single();

  if (groupError) {
    const detail = fmtError("groups.insert", groupError);
    console.error("[createGroup] groups insert FAILED:", detail);
    return {
      error: "No se pudo crear el grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[createGroup] group created:", group.id);

  // ── 4. group_members INSERT (auto-join creator) ──────────────────
  console.log("[createGroup] inserting membership:", { group_id: group.id, user_id: user.id });

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    const detail = fmtError("group_members.insert", memberError);
    console.error("[createGroup] membership insert FAILED:", detail);
    return {
      error: "Grupo creado, pero no se pudo unir automáticamente.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[createGroup] membership created — done ✓");

  revalidatePath("/dashboard");
  return { success: true, group };
}

// ──────────────────────────────────────────────────────────────────────
// joinGroupAction
// ──────────────────────────────────────────────────────────────────────

export async function joinGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const code = (formData.get("invite_code") as string | null)
    ?.trim()
    .toUpperCase() ?? "";

  if (code.length < 4) return { error: "Ingresa un código de invitación válido." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "null user";
    console.error("[joinGroup] auth failed:", detail);
    return {
      error: "Debes iniciar sesión.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[joinGroup] user OK:", user.id, "code:", code);

  // ── SECURITY DEFINER RPC — lookup before membership ──────────────
  const { data: groups, error: rpcError } = await supabase.rpc(
    "get_group_by_invite_code",
    { code }
  );

  if (rpcError) {
    const detail = fmtError("rpc.get_group_by_invite_code", rpcError);
    console.error("[joinGroup] RPC FAILED:", detail);
    return {
      error: "No se pudo verificar el código. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  if (!groups || groups.length === 0) {
    console.log("[joinGroup] no group found for code:", code);
    return { error: "Código inválido. Verifica que esté bien escrito." };
  }

  const group = groups[0] as { id: string; name: string; invite_code: string };
  console.log("[joinGroup] found group:", group.id, group.name);

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    const detail = fmtError("group_members.insert", memberError);
    console.error("[joinGroup] membership insert FAILED:", detail);
    if (memberError.code === "23505") {
      return { error: "Ya eres miembro de este grupo." };
    }
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[joinGroup] joined group — done ✓");
  revalidatePath("/dashboard");
  return { success: true, group };
}
