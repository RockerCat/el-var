import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import GroupsSection from "@/components/groups/GroupsSection";
import MatchPredictionCard from "@/components/dashboard/MatchPredictionCard";
import { getMatchesWithPredictions } from "@/lib/db/matches";
import type { MatchWithPrediction } from "@/lib/matches";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = user.user_metadata?.username as string | undefined;
  const displayName = username ?? user.email?.split("@")[0] ?? "jugador";

  const matches = await getMatchesWithPredictions(user.id);
  const matchGroups = groupByDay(matches);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* Header */}
      <div className="min-w-0">
        <p className="text-xs text-[#475569] font-mono uppercase tracking-widest mb-1">
          Copa del Mundo 2026
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">
          Mis predicciones
        </h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          {displayName} · {user.email}
        </p>
      </div>

      {/* Groups */}
      <section>
        <SectionHeader title="Mis grupos" />
        <Suspense fallback={<Skeleton />}>
          <GroupsSection userId={user.id} />
        </Suspense>
      </section>

      {/* Matches grouped by day */}
      {matches.length === 0 ? (
        <NoMatchesState />
      ) : (
        matchGroups.map(({ label, matches: dayMatches }) => (
          <section key={label}>
            <SectionHeader title={label} count={dayMatches.length} />
            <div className="flex flex-col gap-3">
              {dayMatches.map((match) => (
                <MatchPredictionCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="h-4" />
    </div>
  );
}

// ── Group matches by calendar day ────────────────────────────────────

function groupByDay(matches: MatchWithPrediction[]): { label: string; matches: MatchWithPrediction[] }[] {
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const buckets = new Map<number, MatchWithPrediction[]>();

  for (const m of matches) {
    const d = new Date(m.starts_at);
    const dayMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!buckets.has(dayMs)) buckets.set(dayMs, []);
    buckets.get(dayMs)!.push(m);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayMs, dayMatches]) => {
      const diff = Math.round((dayMs - todayMs) / 86_400_000);
      let label: string;
      if (diff < 0)      label = "Resultados";
      else if (diff === 0) label = "Hoy";
      else if (diff === 1) label = "Mañana";
      else {
        const d = new Date(dayMs);
        label = d.toLocaleDateString("es-CO", {
          weekday: "long",
          day:     "numeric",
          month:   "long",
        });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      return { label, matches: dayMatches };
    });
}

// ── Helpers ──────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-xs bg-[#18182a] border border-[#2a2a45] text-[#64748b] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 animate-pulse">
      <div className="h-4 w-32 bg-[#2a2a45] rounded mb-2" />
      <div className="h-3 w-20 bg-[#1e1e35] rounded" />
    </div>
  );
}

function NoMatchesState() {
  return (
    <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-6 text-center">
      <p className="text-2xl mb-2">⚽</p>
      <p className="text-sm font-bold text-[#f1f5f9] mb-1">No hay partidos aún</p>
      <p className="text-xs text-[#64748b]">
        Los partidos del Mundial 2026 aparecerán aquí cuando estén programados.
      </p>
    </div>
  );
}
