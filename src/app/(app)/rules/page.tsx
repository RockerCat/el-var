import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import { getMatchesWithPredictions } from "@/lib/db/matches";
import {
  detectCurrentStage,
  PHASE_LABELS,
  PHASE_SCORING,
  type MatchStage,
} from "@/lib/matches";
import { cn } from "@/lib/utils";

// Ordered rows for the scoring table (third_place shares Semifinal tier)
const SCORING_ROWS: { stage: MatchStage; label: string }[] = [
  { stage: "group",         label: "Fase 1"    },
  { stage: "round_of_32",   label: "Fase 2"    },
  { stage: "round_of_16",   label: "Fase 3"    },
  { stage: "quarter_final", label: "Fase 4"    },
  { stage: "semi_final",    label: "Semifinal" },
  { stage: "final",         label: "Final"     },
];

const PHASE_EQUIV = [
  { phase: "Fase 1",    desc: "Fase de grupos" },
  { phase: "Fase 2",    desc: "Primera ronda eliminatoria" },
  { phase: "Fase 3",    desc: "Segunda ronda eliminatoria" },
  { phase: "Fase 4",    desc: "Cuartos de final" },
  { phase: "Semifinal", desc: "Semifinal" },
  { phase: "Final",     desc: "Final" },
];

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const matches = await getMatchesWithPredictions(user.id);
  const currentStage = detectCurrentStage(matches);
  const currentPhaseLabel = PHASE_LABELS[currentStage];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-[#f1f5f9]">
          Reglas de La Penúltima
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          Fase actual:{" "}
          <span className="font-semibold text-[#94a3b8]">{currentPhaseLabel}</span>
        </p>
      </div>

      {/* ── Scoring table ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Sistema de puntos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-[#1e1e35]">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Fase</span>
            <span className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest text-right w-24">Exacto</span>
            <span className="text-[10px] font-bold text-[#00c85a]/70 uppercase tracking-widest text-right w-24">Ganador</span>
          </div>

          {SCORING_ROWS.map(({ stage, label }) => {
            const scoring   = PHASE_SCORING[stage];
            const isCurrent = PHASE_LABELS[stage] === currentPhaseLabel;

            return (
              <div
                key={stage}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-[#1e1e35] last:border-b-0",
                  isCurrent
                    ? "bg-[#00c85a]/[0.04] border-l-2 border-l-[#00c85a]/40"
                    : "hover:bg-[#18182a]/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold",
                    isCurrent ? "text-[#f1f5f9]" : "text-[#94a3b8]"
                  )}>
                    {label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-[#00c85a] bg-[#00c85a]/10 px-1.5 py-0.5 rounded-full">
                      actual
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-sm font-black tabular-nums text-right w-24",
                  isCurrent ? "text-[#f59e0b]" : "text-[#94a3b8]"
                )}>
                  {scoring.exact} pts
                </span>
                <span className={cn(
                  "text-sm font-black tabular-nums text-right w-24",
                  isCurrent ? "text-[#00c85a]" : "text-[#94a3b8]"
                )}>
                  {scoring.result} pt{scoring.result !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Phase equivalency ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Equivalencia de fases" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl divide-y divide-[#1e1e35]">
          {PHASE_EQUIV.map(({ phase, desc }) => (
            <div key={phase} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-bold text-[#f1f5f9]">{phase}</span>
              <span className="text-sm text-[#94a3b8]">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How points are calculated ─────────────────────────────────── */}
      <section>
        <SectionHeader title="Cómo se calculan los puntos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
          <RuleItem
            icon="⚡"
            text="Si aciertas el marcador exacto, recibes los puntos de marcador exacto. El marcador exacto NO suma adicionalmente puntos por ganador correcto."
            accent="yellow"
          />
          <RuleItem
            icon="✓"
            text="Si no aciertas el marcador exacto pero aciertas el ganador o el empate, recibes los puntos de ganador correcto."
            accent="green"
          />
          <RuleItem
            icon="✕"
            text="Si no aciertas ni el marcador ni el ganador/empate, recibes 0 puntos."
            accent="red"
          />
        </div>
      </section>

      {/* ── Prediction close time ─────────────────────────────────────── */}
      <section>
        <SectionHeader title="Cierre de pronósticos" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
          <RuleItem
            icon="🕐"
            text="Los pronósticos pueden modificarse hasta antes del inicio oficial del partido."
          />
          <RuleItem
            icon="🔒"
            text="Cuando el partido pasa a En Vivo, los pronósticos quedan bloqueados."
          />
          <RuleItem
            icon="⚠"
            text="Si no ingresas un pronóstico antes del inicio, ese partido no genera puntos."
            accent="yellow"
          />
        </div>
      </section>

      {/* ── Match states ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Estados de partido" />
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl divide-y divide-[#1e1e35]">
          <StateRow
            label="Pronosticar"
            color="text-[#00c85a]"
            bg="bg-[#00c85a]/10"
            desc="El partido aún no ha comenzado. Puedes ingresar o modificar tu pronóstico."
          />
          <StateRow
            label="En Vivo"
            color="text-[#f59e0b]"
            bg="bg-[#f59e0b]/10"
            desc="El partido está en curso. Los pronósticos están bloqueados."
          />
          <StateRow
            label="Finalizado"
            color="text-[#94a3b8]"
            bg="bg-[#64748b]/10"
            desc="El partido terminó. Los puntos han sido calculados y asignados."
          />
        </div>
      </section>

    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide mb-3">
      {title}
    </h2>
  );
}

function RuleItem({
  icon,
  text,
  accent,
}: {
  icon: string;
  text: string;
  accent?: "yellow" | "green" | "red";
}) {
  const iconColor =
    accent === "yellow" ? "text-[#f59e0b]" :
    accent === "green"  ? "text-[#00c85a]" :
    accent === "red"    ? "text-[#ef4444]" :
    "text-[#64748b]";

  return (
    <div className="flex items-start gap-3">
      <span className={cn("text-sm shrink-0 mt-0.5", iconColor)}>{icon}</span>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{text}</p>
    </div>
  );
}

function StateRow({
  label,
  color,
  bg,
  desc,
}: {
  label: string;
  color: string;
  bg: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className={cn(
        "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 mt-0.5",
        color, bg
      )}>
        {label.toUpperCase()}
      </span>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{desc}</p>
    </div>
  );
}
