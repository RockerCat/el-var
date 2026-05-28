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
    err.hint   ? `hint="${err.hint}"`    : null,
    err.details? `details="${err.details}"` : null,
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

  console.log("[createGroup] user OK:", { id: user.id, email: user.email });

  const inviteCode = generateInviteCode();
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
// Uses join_group_for_user() SECURITY DEFINER RPC.
// Before calling the RPC, calls diagnose_auth_context() to log whether
// auth.uid() is actually available in the PostgREST session — this is
// the single most common failure point.
// ──────────────────────────────────────────────────────────────────────

type JoinRpcResult = {
  success?: boolean;
  group_id?: string;
  group_name?: string;
  invite_code?: string;
  error?: string;
  message?: string;
};

type DiagnoseResult = {
  uid: string | null;
  role: string;
  jwt_present: boolean;
};

export async function joinGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const code = (formData.get("invite_code") as string | null)
    ?.trim()
    .toUpperCase() ?? "";

  console.log("[joinGroup] ── START ──────────────────────────────────");
  console.log("[joinGroup] invite_code from formData:", JSON.stringify(code));

  if (code.length < 4) {
    console.log("[joinGroup] code too short, aborting");
    return { error: "Ingresa un código de invitación válido." };
  }

  const supabase = await createClient();

  // ── Step 1: Auth API check ──────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("[joinGroup] getUser →", {
    userId:    user?.id ?? null,
    email:     user?.email ?? null,
    authError: authError?.message ?? null,
  });

  if (authError || !user) {
    const detail = authError ? fmtError("getUser", authError) : "getUser returned null user";
    console.error("[joinGroup] ✗ auth check failed:", detail);
    return { error: "Debes iniciar sesión.", devMessage: isDev ? detail : undefined };
  }

  // ── Step 2: PostgREST JWT diagnostic ───────────────────────────────
  // Determines whether auth.uid() is available at the database layer.
  // If uid is null here, every RLS-dependent query will be empty and
  // every SECURITY DEFINER function that checks auth.uid() will fail.
  const { data: diagData, error: diagError } = await supabase.rpc("diagnose_auth_context");
  const diag = diagData as DiagnoseResult | null;
  console.log("[joinGroup] diagnose_auth_context →", {
    uid:          diag?.uid ?? null,
    role:         diag?.role ?? null,
    jwt_present:  diag?.jwt_present ?? null,
    diagError:    diagError?.message ?? null,
  });

  if (!diag?.uid) {
    const detail = `JWT not reaching PostgREST — diagnose: ${JSON.stringify(diag)} diagError: ${diagError?.message ?? "n/a"}`;
    console.error("[joinGroup] ✗ auth.uid() is NULL in PostgREST context:", detail);
    return {
      error: "Problema de autenticación al unirse al grupo.",
      devMessage: isDev ? `[CRITICAL] ${detail}` : undefined,
    };
  }

  // ── Step 3: join_group_for_user RPC ────────────────────────────────
  console.log("[joinGroup] calling join_group_for_user RPC with code:", code);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "join_group_for_user",
    { p_invite_code: code }
  );

  console.log("[joinGroup] RPC raw response →", { rpcData, rpcError: rpcError?.message ?? null });

  if (rpcError) {
    const detail = fmtError("rpc.join_group_for_user", rpcError);
    console.error("[joinGroup] ✗ RPC call failed:", detail);
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  const result = rpcData as JoinRpcResult | null;

  if (result?.error === "invalid_code") {
    console.log("[joinGroup] ✗ invalid invite code:", code);
    return { error: "Código inválido. Verifica que esté bien escrito." };
  }

  if (result?.error) {
    const detail = `rpc returned error field: ${result.error} — ${result.message ?? ""}`;
    console.error("[joinGroup] ✗ RPC returned error:", detail);
    return {
      error: result.message ?? "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  if (!result?.success) {
    const detail = `unexpected rpc response: ${JSON.stringify(result)}`;
    console.error("[joinGroup] ✗ unexpected response:", detail);
    return {
      error: "No se pudo unir al grupo. Intenta de nuevo.",
      devMessage: isDev ? detail : undefined,
    };
  }

  console.log("[joinGroup] ✓ joined group —", result.group_id, result.group_name);
  revalidatePath("/dashboard");
  return {
    success: true,
    group: {
      id:          result.group_id!,
      name:        result.group_name!,
      invite_code: result.invite_code!,
    },
  };
}
