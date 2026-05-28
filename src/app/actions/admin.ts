"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateMatchState = { error: string } | { success: true } | null;

export async function updateMatchResultAction(
  _prev: UpdateMatchState,
  formData: FormData
): Promise<UpdateMatchState> {
  const matchId = (formData.get("match_id")   as string | null) ?? "";
  const status  = (formData.get("status")     as string | null) ?? "";
  const homeRaw = (formData.get("home_score") as string | null) ?? "";
  const awayRaw = (formData.get("away_score") as string | null) ?? "";

  if (!matchId || !status) return { error: "Datos incompletos." };

  const homeScore = homeRaw !== "" ? parseInt(homeRaw, 10) : null;
  const awayScore = awayRaw !== "" ? parseInt(awayRaw, 10) : null;

  if (homeScore !== null && isNaN(homeScore)) return { error: "Marcador local inválido." };
  if (awayScore !== null && isNaN(awayScore)) return { error: "Marcador visitante inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_match_result", {
    p_match_id:   matchId,
    p_status:     status,
    p_home_score: homeScore,
    p_away_score: awayScore,
  });

  if (error) {
    const msg = error.message;
    if (msg === "not_admin")       return { error: "Sin permisos de administrador." };
    if (msg === "match_not_found") return { error: "Partido no encontrado." };
    if (msg === "invalid_status")  return { error: "Estado inválido." };
    if (msg === "invalid_scores")  return { error: "Marcador fuera de rango (0–30)." };
    return { error: `Error: ${msg}` };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
