"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { matchClosedReason, type MatchWithPrediction } from "@/lib/matches";
import CalendarMatchRow from "./CalendarMatchRow";

// ── Filter types ──────────────────────────────────────────────────────

type Filter = "all" | "pending" | "live" | "finished";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",      label: "Todos"      },
  { id: "pending",  label: "Pendientes" },
  { id: "live",     label: "En vivo"    },
  { id: "finished", label: "Finalizados"},
];

// ── Date helpers ──────────────────────────────────────────────────────

/** Colombia date key for grouping: "2026-06-11" */
function colombiaDateKey(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  }); // "YYYY-MM-DD" — stable sort key
}

/** Human header: "Jue, 11 de jun" */
function formatDateHeader(dateKey: string): string {
  // dateKey is "YYYY-MM-DD" in Colombia time — parse as local noon to avoid DST edge
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  const raw = date.toLocaleDateString("es-CO", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });
  // Capitalise first letter: "jue, 11 de jun" → "Jue, 11 de jun"
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Filter logic ──────────────────────────────────────────────────────

function applyFilter(matches: MatchWithPrediction[], filter: Filter): MatchWithPrediction[] {
  if (filter === "all")      return matches;
  if (filter === "live")     return matches.filter((m) => m.status === "live");
  if (filter === "finished") return matches.filter((m) => m.status === "finished");
  if (filter === "pending")  return matches.filter(
    (m) => m.status === "scheduled" && matchClosedReason(m) === null && !m.prediction
  );
  return matches;
}

// ── Main component ────────────────────────────────────────────────────

interface CalendarViewProps {
  matches: MatchWithPrediction[];
}

export default function CalendarView({ matches }: CalendarViewProps) {
  const [filter, setFilter] = useState<Filter>(() => {
    // Default to "live" if any live matches exist, else "all"
    return matches.some((m) => m.status === "live") ? "live" : "all";
  });

  const filtered = useMemo(() => applyFilter(matches, filter), [matches, filter]);

  // Group filtered matches by Colombia date, preserving kickoff order
  const days = useMemo(() => {
    const map = new Map<string, MatchWithPrediction[]>();
    for (const m of filtered) {
      const key = colombiaDateKey(m.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const liveCount    = matches.filter((m) => m.status === "live").length;
  const pendingCount = matches.filter(
    (m) => m.status === "scheduled" && matchClosedReason(m) === null && !m.prediction
  ).length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
        {FILTERS.map(({ id, label }) => {
          const badge = id === "live" ? liveCount : id === "pending" ? pendingCount : 0;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                filter === id
                  ? "bg-[#00c85a]/15 text-[#00c85a] border border-[#00c85a]/25"
                  : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] border border-transparent"
              )}
            >
              {label}
              {badge > 0 && (
                <span className={cn(
                  "text-[9px] font-bold rounded-full px-1 min-w-[16px] text-center",
                  id === "live"
                    ? "bg-[#ef4444]/15 text-[#ef4444]"
                    : "bg-[#f59e0b]/15 text-[#f59e0b]"
                )}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {days.length === 0 && (
        <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-8 text-center">
          <p className="text-sm text-[#64748b]">
            {filter === "live"    ? "No hay partidos en vivo ahora." :
             filter === "pending" ? "No tienes predicciones pendientes. ¡Al día!" :
             filter === "finished"? "No hay partidos finalizados todavía." :
             "No hay partidos disponibles."}
          </p>
        </div>
      )}

      {/* ── Date groups ───────────────────────────────────────────── */}
      {days.map(([dateKey, dayMatches]) => (
        <section key={dateKey}>
          {/* Sticky date header */}
          <div className="sticky top-[56px] z-20 bg-[#0a0a12]/90 backdrop-blur-sm py-1.5 mb-2 -mx-4 px-4">
            <h3 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">
              {formatDateHeader(dateKey)}
              <span className="text-[#475569] font-normal ml-2 normal-case tracking-normal">
                {dayMatches.length} partido{dayMatches.length !== 1 ? "s" : ""}
              </span>
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            {dayMatches.map((match) => (
              <CalendarMatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}

    </div>
  );
}
