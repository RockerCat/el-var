"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, type GroupActionState } from "@/lib/groups";

// ──────────────────────────────────────────────────────────────────────
// createGroupAction
// Called from the create-group form via useActionState.
// ──────────────────────────────────────────────────────────────────────

export async function createGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (name.length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres." };
  }
  if (name.length > 50) {
    return { error: "El nombre no puede tener más de 50 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Debes iniciar sesión." };

  const inviteCode = generateInviteCode();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, invite_code: inviteCode, owner_id: user.id })
    .select("id, name, invite_code")
    .single();

  if (groupError) {
    console.error("[action] createGroup:", groupError.message);
    return { error: "No se pudo crear el grupo. Intenta de nuevo." };
  }

  // Auto-join creator
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    console.error("[action] autoJoin:", memberError.message);
    return { error: "Grupo creado, pero no se pudo unir automáticamente." };
  }

  revalidatePath("/dashboard");
  return { success: true, group };
}

// ──────────────────────────────────────────────────────────────────────
// joinGroupAction
// Looks up the group via SECURITY DEFINER function (bypasses RLS),
// then inserts the membership using the user's own auth context.
// ──────────────────────────────────────────────────────────────────────

export async function joinGroupAction(
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const code = (formData.get("invite_code") as string | null)
    ?.trim()
    .toUpperCase() ?? "";

  if (code.length < 4) {
    return { error: "Ingresa un código de invitación válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Debes iniciar sesión." };

  // SECURITY DEFINER RPC — allows finding the group even before joining
  const { data: groups, error: rpcError } = await supabase.rpc(
    "get_group_by_invite_code",
    { code }
  );

  if (rpcError) {
    console.error("[action] joinGroup rpc:", rpcError.message);
    return { error: "No se pudo verificar el código. Intenta de nuevo." };
  }

  if (!groups || groups.length === 0) {
    return { error: "Código inválido. Verifica que esté bien escrito." };
  }

  const group = groups[0] as { id: string; name: string; invite_code: string };

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    // 23505 = unique_violation (duplicate membership)
    if (memberError.code === "23505") {
      return { error: "Ya eres miembro de este grupo." };
    }
    console.error("[action] joinGroup member insert:", memberError.message);
    return { error: "No se pudo unir al grupo. Intenta de nuevo." };
  }

  revalidatePath("/dashboard");
  return { success: true, group };
}
