import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/dashboard/MatchCard";
import LeaderboardCard from "@/components/dashboard/LeaderboardCard";
import LogoutButton from "@/components/auth/LogoutButton";
import { Users, Plus } from "lucide-react";

// Placeholder match data — replaced with Supabase queries in Phase 2
const SAMPLE_MATCHES = [
  {
    id: "1",
    homeTeam: { name: "Brasil", flag: "🇧🇷", code: "BRA" },
    awayTeam: { name: "Argentina", flag: "🇦🇷", code: "ARG" },
    kickoff: "Hoy · 18:00",
    status: "live" as const,
    homeScore: 1,
    awayScore: 1,
    prediction: { home: 2, away: 1, result: "pending" as const },
  },
  {
    id: "2",
    homeTeam: { name: "Francia", flag: "🇫🇷", code: "FRA" },
    awayTeam: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" },
    kickoff: "Hoy · 21:00",
    status: "upcoming" as const,
    prediction: { home: 1, away: 0, result: "pending" as const },
  },
  {
    id: "3",
    homeTeam: { name: "España", flag: "🇪🇸", code: "ESP" },
    awayTeam: { name: "Alemania", flag: "🇩🇪", code: "GER" },
    kickoff: "Ayer · 20:00",
    status: "finished" as const,
    homeScore: 2,
    awayScore: 1,
    prediction: { home: 2, away: 1, result: "exact" as const },
  },
];

const SAMPLE_LEADERBOARD = [
  { rank: 1, username: "xavi_preds", points: 87, exactScores: 4 },
  { rank: 2, username: "goal_machine", points: 75, exactScores: 3, isCurrentUser: true },
  { rank: 3, username: "tiki_taka_fan", points: 71, exactScores: 2 },
  { rank: 4, username: "penalty_king", points: 68, exactScores: 3 },
  { rank: 5, username: "offside_trap", points: 60, exactScores: 1 },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware protects this route, but this is a safety net
  if (!user) redirect("/login");

  const username = user.user_metadata?.username as string | undefined;
  const displayName = username ?? user.email?.split("@")[0] ?? "jugador";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* User header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-[#475569] font-mono uppercase tracking-widest mb-1">
            Copa del Mundo 2026
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9] truncate">
            Hola, {displayName} 👋
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5 truncate">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {/* No group yet — placeholder CTA */}
      <NoGroupBanner />

      {/* VAR status bar */}
      <VarStatusBar />

      {/* Hoy */}
      <section>
        <SectionHeader title="Hoy" count={2} />
        <div className="flex flex-col gap-3">
          {SAMPLE_MATCHES.filter((m) => m.kickoff.startsWith("Hoy")).map(
            (match) => (
              <MatchCard key={match.id} {...match} />
            )
          )}
        </div>
      </section>

      {/* Resultados recientes */}
      <section>
        <SectionHeader title="Resultados recientes" />
        <div className="flex flex-col gap-3">
          {SAMPLE_MATCHES.filter((m) => m.status === "finished").map(
            (match) => (
              <MatchCard key={match.id} {...match} />
            )
          )}
        </div>
      </section>

      {/* Tabla de posiciones */}
      <section>
        <SectionHeader title="Tabla de posiciones" />
        <LeaderboardCard
          groupName="La Trampa del Offside"
          entries={SAMPLE_LEADERBOARD}
        />
      </section>

      <div className="h-4" />
    </div>
  );
}

function NoGroupBanner() {
  return (
    <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#00c85a]/10 flex items-center justify-center shrink-0">
          <Users size={18} className="text-[#00c85a]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#f1f5f9] mb-1">
            Aún no tienes un grupo
          </p>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Crea tu propio grupo o pídele a un amigo que te comparta su enlace
            de invitación.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#00c85a] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#00e87a] transition-colors">
          <Plus size={14} />
          Crear grupo
        </button>
        <button className="flex-1 h-9 bg-[#20203a] text-[#94a3b8] text-xs font-semibold rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors">
          Tengo un enlace
        </button>
      </div>
    </div>
  );
}

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

function VarStatusBar() {
  return (
    <div className="flex items-center gap-3 bg-[#3b82f6]/8 border border-[#3b82f6]/20 rounded-xl px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-live-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          El VAR está revisando
        </p>
        <p className="text-sm text-[#94a3b8] truncate">
          Brasil vs Argentina · 67&apos; · Tu predicción: 2–1
        </p>
      </div>
    </div>
  );
}
