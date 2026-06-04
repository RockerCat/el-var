import Link from "next/link";
import { type PrizePool, formatCOP } from "@/lib/groups";
import { type LeaderboardEntry } from "@/lib/groups";

interface PrizePoolCardProps {
  pool:        PrizePool;
  leaderboard: LeaderboardEntry[];
}

export default function PrizePoolCard({ pool, leaderboard }: PrizePoolCardProps) {
  const first  = leaderboard.find((e) => e.rank === 1);
  const second = leaderboard.find((e) => e.rank === 2);

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">

      {/* Header */}
      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-0.5">
        Bolsa del Mundial
      </p>
      <p className="text-2xl font-black text-[#f1f5f9] tabular-nums mb-4">
        {formatCOP(pool.total)}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#64748b] mb-1">Participantes</p>
          <p className="text-xl font-black text-[#f1f5f9]">{pool.member_count}</p>
        </div>
        <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#64748b] mb-1">Inscripción</p>
          <p className="text-xl font-black text-[#f1f5f9]">{formatCOP(pool.config.entry_fee)}</p>
        </div>
      </div>

      {/* Prize splits */}
      <div className="space-y-2 mb-4">
        <PrizeLine
          medal="🥇"
          label={`1er lugar (${pool.config.first_place_pct}%)`}
          amount={pool.first_prize}
          leader={first?.display_name}
          highlight
        />
        <PrizeLine
          medal="🥈"
          label={`2do lugar (${pool.config.second_place_pct}%)`}
          amount={pool.second_prize}
          leader={second?.display_name}
        />
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-[#475569] leading-relaxed border-t border-[#1e1e35] pt-3">
        La Penúltima no procesa pagos ni administra dinero. Los aportes y premios son
        gestionados directamente por los participantes del grupo.
      </p>
    </div>
  );
}

function PrizeLine({
  medal,
  label,
  amount,
  leader,
  highlight = false,
}: {
  medal:      string;
  label:      string;
  amount:     number;
  leader?:    string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none shrink-0">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#64748b]">{label}</p>
        {leader && (
          <p className="text-xs font-semibold text-[#94a3b8] truncate">{leader}</p>
        )}
      </div>
      <span className={`text-sm font-black tabular-nums shrink-0 ${highlight ? "text-[#f59e0b]" : "text-[#f1f5f9]"}`}>
        {formatCOP(amount)}
      </span>
    </div>
  );
}
