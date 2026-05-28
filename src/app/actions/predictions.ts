"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Prediction, PredictionActionState } from "@/lib/matches";

const isDev = process.env.NODE_ENV !== "production";

export async function savePredictionAction(
  _prevState: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const matchId   = (formData.get("match_id")    as string | null) ?? "";
  const homeRaw   = (formData.get("home_score")  as string | null) ?? "";
  const awayRaw   = (formData.get("away_score")  as string | null) ?? "";

  console.log("[savePrediction] matchId:", matchId, "home:", homeRaw, "away:", awayRaw);

  // ── Input validation ────────────────────────────────────────────────
  if (!matchId) return { error: "Partido no especificado." };

  const homeScore = parseInt(homeRaw, 10);
  const awayScore = parseInt(awayRaw, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    return { error: "Ingresa un marcador válido para ambos equipos." };
  }
  if (homeScore < 0 || homeScore > 30 || awayScore < 0 || awayScore > 30) {
    return { error: "El marcador debe estar entre 0 y 30." };
  }

  // ── Auth check ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log("[savePrediction] userId:", user?.id ?? null);

  if (authError || !user) {
    return { error: "Debes iniciar sesión para predecir." };
  }

  // ── SECURITY DEFINER RPC — bypasses RLS for the upsert ─────────────
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_prediction_for_user",
    {
      p_match_id:   matchId,
      p_home_score: homeScore,
      p_away_score: awayScore,
    }
  );

  console.log("[savePrediction] RPC →", {
    rpcData,
    rpcError: rpcError ? { code: rpcError.code, message: rpcError.message } : null,
  });

  if (rpcError) {
    const msg = rpcError.message;

    if (msg === "not_authenticated") {
      return {
        error: "Problema de autenticación. Cierra sesión y vuelve a ingresar.",
        devMessage: isDev ? "[not_authenticated] auth.uid() is NULL in PostgREST" : undefined,
      };
    }
    if (msg === "match_not_scheduled") {
      return { error: "Predicciones cerradas para este partido." };
    }
    if (msg === "match_started") {
      return { error: "El partido ya comenzó. No se pueden guardar predicciones." };
    }
    if (msg === "match_not_found") {
      return { error: "El partido no existe." };
    }
    if (msg === "invalid_scores") {
      return { error: "Marcador inválido. El valor debe estar entre 0 y 30." };
    }

    return {
      error: "No se pudo guardar tu predicción. Intenta de nuevo.",
      devMessage: isDev
        ? `code=${rpcError.code ?? "n/a"} msg="${rpcError.message}"`
        : undefined,
    };
  }

  console.log("[savePrediction] ✓ saved prediction");

  revalidatePath("/dashboard");
  return { success: true, prediction: rpcData as Prediction };
}
