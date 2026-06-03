"use client";

import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { matchClosedReason, type MatchWithPrediction } from "@/lib/matches";
import { saveGroupPredictionsAction, type GroupSaveState } from "@/app/actions/predictions";
import MatchRowInGroup from "./MatchRowInGroup";
import { Check, Loader2 } from "lucide-react";

interface GroupMatchBlockProps {
  label: string;
  matches: MatchWithPrediction[];
}

export default function GroupMatchBlock({ label, matches }: GroupMatchBlockProps) {
  const [state, formAction, isPending] = useActionState<GroupSaveState, FormData>(
    saveGroupPredictionsAction,
    null
  );

  // Dirty = any open match's inputs have been changed since last save
  const [isDirty, setIsDirty] = useState(false);

  // Reset dirty after a successful save
  useEffect(() => {
    if (state?.success) setIsDirty(false);
  }, [state?.success]);

  const hasOpenMatches = matches.some((m) => matchClosedReason(m) === null);

  // ── Button tier ────────────────────────────────────────────────
  // isDirty       → solid green CTA    (unsaved changes exist)
  // state.success → soft green confirm (just saved)
  // else          → muted/disabled     (nothing to save)
  const buttonClass = cn(
    "w-full h-10 rounded-xl text-xs font-semibold border transition-all",
    isDirty
      ? "bg-[#00c85a] border-[#00c85a] text-[#0a0a12] hover:bg-[#00e87a] shadow-[0_0_20px_rgba(0,200,90,0.2)]"
      : state?.success
      ? "bg-[#00c85a]/10 border-[#00c85a]/30 text-[#00c85a]"
      : "bg-transparent border-[#1e1e35] text-[#2a2a45] cursor-default"
  );

  return (
    <div>
      {/* Section label */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-semibold text-[#3a3a60] uppercase tracking-widest shrink-0">
          {label}
        </span>
        <div className="flex-1 h-px bg-[#1e1e35]" />
      </div>

      <form action={formAction}>
        {/* Match rows */}
        <div className="flex flex-col gap-2 mb-3">
          {matches.map((match) => (
            <MatchRowInGroup
              key={match.id}
              match={match}
              error={state?.errors?.[match.id]}
              onDirty={() => setIsDirty(true)}
            />
          ))}
        </div>

        {/* Group save button */}
        {hasOpenMatches && (
          <>
            <button
              type="submit"
              disabled={isPending || (!isDirty && !state?.success)}
              className={buttonClass}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Guardando...
                </span>
              ) : state?.success && !isDirty ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Check size={12} strokeWidth={2.5} />
                  Guardado
                </span>
              ) : (
                `Guardar ${label}`
              )}
            </button>

            {/* Unsaved-changes indicator */}
            {isDirty && !isPending && (
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a]" />
                <span className="text-[10px] text-[#00c85a]/70">Cambios sin guardar</span>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
