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
    err.hint ? `hint="${err.hint}"` : null,
    err.details ? `details="${err.details}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ──────────────────────────────────────────────────────────────────────
// createGroupAction
//
// Uses the create_group_for_user() SECURITY DEFINER RPC instead of a
// direct INSERT.  This bypasses the INSERT RLS policy that fails when
// auth.uid() is NULL in the PostgREST session context, while still
// enforcing the same security inside the function.
// ──────────────────────────────────────────────────────────────────────

export async function createGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (name.length > 50) return { error: "El nombre no puede tener más de 50 caracteres." };

  const supabase = await createClient();

  // Auth check via the Supabase Auth API (independent of PostgREST JWT)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[createGroup] auth failed:", detail);
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  console.log("[createGroup] user OK:", { id: user.id, email: user.email });

  const inviteCode = generateInviteCode();

  // ── RPC: create group + auto-join atomically ─────────────────────
  // The SECURITY DEFINER function on the DB side:
  //   1. Reads auth.uid() from the PostgreSQL session (set by PostgREST)
  //   2. Raises not_authenticated if auth.uid() is still NULL
  //   3. Inserts into groups + group_members in one transaction
  //   4. Returns {id, name, invite_code}
  console.log("[createGroup] calling create_group_for_user RPC:", { name, inviteCode });

  const { data: rows, error: rpcError } = await supabase.rpc(
    "create_group_for_user",
    { p_name: name, p_invite_code: inviteCode }
  );

  if (rpcError) {
    const detail = fmtError("rpc.create_group_for_user", rpcError);
    console.error("[createGroup] RPC FAILED:", detail);
    return {
      error: "No se pudo crear el grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  const group = (rows as { id: string; name: string; invite_code: string }[])[0];
  console.log("[createGroup] group created via RPC — done ✓", group?.id);

  revalidatePath("/dashboard");
  return { success: true, group };
}

// ──────────────────────────────────────────────────────────────────────
// joinGroupAction
//
// Uses join_group_for_user() SECURITY DEFINER RPC — handles lookup +
// group_members INSERT in one atomic call, bypassing the auth.uid()
// RLS issue that affects direct table inserts from Server Actions.
// ──────────────────────────────────────────────────────────────────────

type JoinRpcResult = {
  success?: boolean;
  group_id?: string;
  group_name?: string;
  invite_code?: string;
  error?: string;
  message?: string;
};

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
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  console.log("[joinGroup] user OK:", user.id, "code:", code);

  // Single SECURITY DEFINER RPC: lookup + insert, idempotent
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "join_group_for_user",
    { p_invite_code: code }
  );

  if (rpcError) {
    const detail = fmtError("rpc.join_group_for_user", rpcError);
    console.error("[joinGroup] RPC FAILED:", detail);
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  const result = rpcData as JoinRpcResult | null;
  console.log("[joinGroup] RPC result:", result);

  if (result?.error === "invalid_code") {
    return { error: "Código inválido. Verifica que esté bien escrito." };
  }

  if (result?.error) {
    return {
      error: result.message ?? "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? `rpc returned error: ${result.error}` : undefined,
    };
  }

  if (!result?.success) {
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? `unexpected rpc response: ${JSON.stringify(result)}` : undefined,
    };
  }

  console.log("[joinGroup] joined group — done ✓", result.group_id);
  revalidatePath("/dashboard");
  return {
    success: true,
    group: {
      id: result.group_id!,
      name: result.group_name!,
      invite_code: result.invite_code!,
    },
  };
}
