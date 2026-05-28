import MatchCard from "@/components/dashboard/MatchCard";
import LeaderboardCard from "@/components/dashboard/LeaderboardCard";

// Placeholder data — will be replaced with Supabase queries
const UPCOMING_MATCHES = [
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

const LEADERBOARD_ENTRIES = [
  { rank: 1, username: "xavi_preds", points: 87, exactScores: 4 },
  { rank: 2, username: "goal_machine", points: 75, exactScores: 3, isCurrentUser: true },
  { rank: 3, username: "tiki_taka_fan", points: 71, exactScores: 2 },
  { rank: 4, username: "penalty_king", points: 68, exactScores: 3 },
  { rank: 5, username: "offside_trap", points: 60, exactScores: 1 },
];

export default function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#475569] font-mono uppercase tracking-widest mb-1">
            Grupo · La Trampa del Offside
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">
            Jornada 12
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            2 partidos hoy · Estás en el 2° lugar
          </p>
        </div>
        <div className="bg-[#18182a] border border-[#2a2a45] rounded-xl p-3 text-right">
          <p className="text-2xl font-black text-[#f1f5f9] tabular-nums">75</p>
          <p className="text-xs text-[#475569]">tus pts</p>
        </div>
      </div>

      {/* VAR status bar */}
      <VarStatusBar />

      {/* Today's matches */}
      <section>
        <SectionHeader title="Hoy" count={2} />
        <div className="flex flex-col gap-3">
          {UPCOMING_MATCHES.filter((m) =>
            m.kickoff.startsWith("Hoy")
          ).map((match) => (
            <MatchCard key={match.id} {...match} />
          ))}
        </div>
      </section>

      {/* Recent results */}
      <section>
        <SectionHeader title="Resultados recientes" />
        <div className="flex flex-col gap-3">
          {UPCOMING_MATCHES.filter((m) => m.status === "finished").map(
            (match) => (
              <MatchCard key={match.id} {...match} />
            )
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <SectionHeader title="Tabla de posiciones" />
        <LeaderboardCard
          groupName="La Trampa del Offside"
          entries={LEADERBOARD_ENTRIES}
        />
      </section>

      {/* Bottom padding for mobile nav */}
      <div className="h-4" />
    </div>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
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
