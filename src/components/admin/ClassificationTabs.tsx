"use client";

import { useState } from "react";
import type {
  GroupStanding,
  TeamStanding,
  KnockoutPreviewMatch,
} from "@/lib/classification";
import { formatKickoff } from "@/lib/matches";

// ── Types ──────────────────────────────────────────────────────────────

type TabId   = "groups" | "r32" | "r16" | "qf" | "sf" | "final";
type ViewId  = "phase" | "bracket";

interface Props {
  groups:        GroupStanding[];
  bestThirds:    TeamStanding[];
  roundOf32:     KnockoutPreviewMatch[];
  roundOf16:     KnockoutPreviewMatch[];
  quarterFinals: KnockoutPreviewMatch[];
  semiFinals:    KnockoutPreviewMatch[];
  thirdPlace:    KnockoutPreviewMatch[];
  finals:        KnockoutPreviewMatch[];
  defaultTab:    string;
}

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "groups", label: "Fase de Grupos", short: "Grupos"  },
  { id: "r32",    label: "Dieciseisavos",  short: "16avos"  },
  { id: "r16",    label: "Octavos",        short: "Octavos" },
  { id: "qf",     label: "Cuartos",        short: "Cuartos" },
  { id: "sf",     label: "Semifinales",    short: "Semis"   },
  { id: "final",  label: "Final",          short: "Final"   },
];

// ── Shared helpers ─────────────────────────────────────────────────────

function positionBorder(idx: number): string {
  if (idx === 0) return "border-l-2 border-l-[#f59e0b]";
  if (idx === 1) return "border-l-2 border-l-[#00c85a]";
  if (idx === 2) return "border-l-2 border-l-[#f59e0b]/50";
  return "border-l-2 border-l-transparent";
}

function goalDiffColor(d: number): string {
  if (d > 0) return "text-[#00c85a]";
  if (d < 0) return "text-red-400";
  return "text-[#64748b]";
}

function fmtDiff(d: number): string {
  return d > 0 ? `+${d}` : String(d);
}

// ══════════════════════════════════════════════════════════════════════
// PHASE VIEW — components
// ══════════════════════════════════════════════════════════════════════

// ── GroupCard (phase view — full stats table) ──────────────────────────

function GroupCard({ group }: { group: GroupStanding }) {
  const matchesPlayed = group.teams.reduce((s, t) => s + t.played, 0) / 2;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e35] flex items-center justify-between">
        <h3 className="text-xs font-black text-[#f1f5f9] uppercase tracking-widest">
          Grupo {group.group_code}
        </h3>
        <span className="text-[10px] font-mono text-[#64748b]">{matchesPlayed}/6</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e35]">
              <th className="pl-3 pr-1 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase w-5">#</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase min-w-[88px]">Equipo</th>
              {["PJ","G","E","P","GF","GC","DG","PTS"].map((h) => (
                <th key={h} className="px-1 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-7">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e35]">
            {group.teams.map((s, idx) => (
              <tr key={s.team.id} className={positionBorder(idx)}>
                <td className="pl-3 pr-1 py-2.5 text-[10px] font-mono text-[#64748b] text-center">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{s.team.flag_emoji ?? "🏳️"}</span>
                    <span className={`text-[11px] font-bold ${idx <= 1 ? "text-[#f1f5f9]" : "text-[#94a3b8]"}`}>
                      {s.team.code}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.played}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.won}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.drawn}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.lost}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_for}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_against}</td>
                <td className={`px-1 py-2.5 text-center font-mono ${goalDiffColor(s.goal_diff)}`}>
                  {fmtDiff(s.goal_diff)}
                </td>
                <td className={`px-1 py-2.5 text-center font-black text-sm ${
                  idx === 0 ? "text-[#f59e0b]" : idx === 1 ? "text-[#00c85a]" : "text-[#94a3b8]"
                }`}>
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KnockoutMatchCard (phase view — full card with date + venue) ────────

function KnockoutMatchCard({ match, large = false }: { match: KnockoutPreviewMatch; large?: boolean }) {
  const homeTeam  = match.home_team;
  const awayTeam  = match.away_team;
  const homeFlag  = homeTeam?.flag_emoji;
  const awayFlag  = awayTeam?.flag_emoji;
  const homeName  = homeTeam?.name  ?? match.home_placeholder ?? "Por definir";
  const awayName  = awayTeam?.name  ?? match.away_placeholder ?? "Por definir";
  const homeCode  = homeTeam?.code  ?? match.home_placeholder ?? "TBD";
  const awayCode  = awayTeam?.code  ?? match.away_placeholder ?? "TBD";
  const hasScore  = match.home_score !== null && match.away_score !== null;
  const isLive    = match.status === "live";
  const isFinished = match.status === "finished";
  const flagSize  = large ? "text-3xl" : "text-2xl";
  const nameSize  = large ? "text-sm"  : "text-xs";
  const scoreSize = large ? "text-2xl" : "text-base";

  return (
    <div className={`bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden${large ? " ring-1 ring-[#f59e0b]/15" : ""}`}>
      <div className="px-4 py-2.5 border-b border-[#1e1e35] flex items-center gap-2 min-w-0">
        {match.match_number !== null && (
          <span className="text-[10px] font-mono text-[#64748b] shrink-0">M{match.match_number}</span>
        )}
        <span className="text-[10px] text-[#64748b] flex-1 truncate">{formatKickoff(match.starts_at)}</span>
        {isLive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ef4444]/15 border border-[#ef4444]/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[9px] font-black text-[#ef4444] uppercase tracking-wide">En vivo</span>
          </div>
        )}
        {isFinished && (
          <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest shrink-0">Fin.</span>
        )}
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`${flagSize} leading-none shrink-0 ${!homeFlag ? "opacity-30" : ""}`}>{homeFlag ?? "🏳️"}</span>
          <div className="min-w-0">
            {homeTeam ? (
              <>
                <p className={`${nameSize} font-bold text-[#f1f5f9] truncate`}>{homeTeam.name}</p>
                <p className="text-[10px] text-[#64748b] font-mono">{homeTeam.code}</p>
              </>
            ) : (
              <p className={`${nameSize} font-mono text-[#64748b] italic truncate`}>{homeCode}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-center min-w-[52px]">
          {hasScore ? (
            <p className={`${scoreSize} font-black tabular-nums text-[#f1f5f9]`}>
              {match.home_score}<span className="mx-1 text-[#2a2a45]">-</span>{match.away_score}
            </p>
          ) : (
            <p className="text-[11px] text-[#2a2a45] font-mono">vs</p>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <div className="min-w-0 text-right">
            {awayTeam ? (
              <>
                <p className={`${nameSize} font-bold text-[#f1f5f9] truncate`}>{awayTeam.name}</p>
                <p className="text-[10px] text-[#64748b] font-mono">{awayTeam.code}</p>
              </>
            ) : (
              <p className={`${nameSize} font-mono text-[#64748b] italic truncate`}>{awayCode}</p>
            )}
          </div>
          <span className={`${flagSize} leading-none shrink-0 ${!awayFlag ? "opacity-30" : ""}`}>{awayFlag ?? "🏳️"}</span>
        </div>
      </div>
      {match.venue && (
        <div className="px-4 pb-2.5 -mt-1">
          <p className="text-[10px] text-[#64748b] truncate">{match.venue}</p>
        </div>
      )}
    </div>
  );
}

// ── Phase tab components ───────────────────────────────────────────────

function GruposTab({ groups }: { groups: GroupStanding[] }) {
  if (groups.length === 0) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">No hay equipos de grupos registrados.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#64748b]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> 1° — clasifica directo</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c85a]" /> 2° — clasifica directo</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]/40" /> 3° — posible mejor tercero</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => <GroupCard key={g.group_code} group={g} />)}
      </div>
    </div>
  );
}

function KnockoutTab({ matches, emptyMessage, cols = 2 }: {
  matches: KnockoutPreviewMatch[];
  emptyMessage: string;
  cols?: 1 | 2;
}) {
  if (matches.length === 0) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className={cols === 2 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      {matches.map((m) => <KnockoutMatchCard key={m.id} match={m} />)}
    </div>
  );
}

function FinalTab({ finals, thirdPlace }: { finals: KnockoutPreviewMatch[]; thirdPlace: KnockoutPreviewMatch[] }) {
  const finalMatch = finals[0]     ?? null;
  const thirdMatch = thirdPlace[0] ?? null;
  if (!finalMatch && !thirdMatch) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">Los partidos de Final aún no están disponibles.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {finalMatch && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🏆</span>
            <h2 className="text-sm font-black text-[#f59e0b] uppercase tracking-widest">Final</h2>
          </div>
          <KnockoutMatchCard match={finalMatch} large />
        </section>
      )}
      {thirdMatch && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🥉</span>
            <h2 className="text-sm font-black text-[#94a3b8] uppercase tracking-widest">Tercer puesto</h2>
          </div>
          <KnockoutMatchCard match={thirdMatch} />
        </section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BRACKET VIEW — components
// ══════════════════════════════════════════════════════════════════════

// ── BracketGroupMini — compact 4-team group for bracket column ─────────

function BracketGroupMini({ group }: { group: GroupStanding }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-xl px-2.5 py-2 space-y-1.5">
      <p className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">G{group.group_code}</p>
      {group.teams.map((t, i) => (
        <div key={t.team.id} className="flex items-center gap-1 min-w-0">
          <span className={`text-[9px] font-mono w-3 shrink-0 ${
            i === 0 ? "text-[#f59e0b]" : i === 1 ? "text-[#00c85a]" : "text-[#64748b]"
          }`}>{i + 1}</span>
          <span className="text-xs leading-none shrink-0">{t.team.flag_emoji ?? "🏳️"}</span>
          <span className={`text-[10px] font-semibold truncate ${i <= 1 ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>
            {t.team.code}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── BracketMatchRow — compact 2-line card for bracket column ───────────

function BracketMatchRow({ match, highlight = false }: {
  match: KnockoutPreviewMatch;
  highlight?: boolean;
}) {
  const home = match.home_team;
  const away = match.away_team;
  const homeCode  = home?.code  ?? match.home_placeholder ?? "TBD";
  const awayCode  = away?.code  ?? match.away_placeholder ?? "TBD";
  const hasScore  = match.home_score !== null && match.away_score !== null;
  const homeWins  = hasScore && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWins  = hasScore && (match.away_score ?? 0) > (match.home_score ?? 0);
  const isLive    = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`bg-[#11111c] border rounded-xl overflow-hidden ${
      highlight    ? "border-[#f59e0b]/40 ring-1 ring-[#f59e0b]/10" :
      isLive       ? "border-[#ef4444]/40" :
      "border-[#1e1e35]"
    }`}>
      {/* Match header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#1e1e35]">
        <span className="text-[9px] font-mono text-[#64748b]">
          {match.match_number ? `M${match.match_number}` : "–"}
        </span>
        {isLive && (
          <span className="text-[8px] font-black text-[#ef4444] uppercase tracking-wide animate-pulse">Live</span>
        )}
        {isFinished && !isLive && (
          <span className="text-[8px] font-mono text-[#64748b] uppercase tracking-widest">Fin</span>
        )}
      </div>
      {/* Home row */}
      <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-[#1e1e35]/50 ${homeWins ? "bg-[#00c85a]/[0.06]" : ""}`}>
        <span className={`text-sm leading-none shrink-0 ${!home ? "opacity-30" : ""}`}>
          {home?.flag_emoji ?? "🏳️"}
        </span>
        <span className={`text-[11px] font-semibold flex-1 truncate ${
          home ? (homeWins ? "text-[#00c85a]" : "text-[#f1f5f9]") : "text-[#64748b] italic"
        }`}>{homeCode}</span>
        {hasScore && (
          <span className={`text-xs font-black tabular-nums shrink-0 ${homeWins ? "text-[#00c85a]" : "text-[#64748b]"}`}>
            {match.home_score}
          </span>
        )}
      </div>
      {/* Away row */}
      <div className={`flex items-center gap-1.5 px-2 py-1.5 ${awayWins ? "bg-[#00c85a]/[0.06]" : ""}`}>
        <span className={`text-sm leading-none shrink-0 ${!away ? "opacity-30" : ""}`}>
          {away?.flag_emoji ?? "🏳️"}
        </span>
        <span className={`text-[11px] font-semibold flex-1 truncate ${
          away ? (awayWins ? "text-[#00c85a]" : "text-[#f1f5f9]") : "text-[#64748b] italic"
        }`}>{awayCode}</span>
        {hasScore && (
          <span className={`text-xs font-black tabular-nums shrink-0 ${awayWins ? "text-[#00c85a]" : "text-[#64748b]"}`}>
            {match.away_score}
          </span>
        )}
      </div>
    </div>
  );
}

// ── BracketEmptySlot — placeholder when phase has no data ──────────────

function BracketEmptySlot({ label }: { label: string }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35]/50 rounded-xl px-3 py-4 text-center">
      <p className="text-[10px] text-[#64748b] italic">{label}</p>
    </div>
  );
}

// ── Bracket geometry ────────────────────────────────────────────────────
// Slot model: each phase's matches sit in vertical slots whose height
// doubles every round so every match is exactly centered between its
// two source matches — matching the Apple Sports visual pattern.
//
//  R32  → flat space-y-2 list; effective slot = CARD_H + GAP = 96 px
//  R16  → slot = 2 × 96  =  192 px   (1 dest match per 2 R32 matches)
//  QF   → slot = 4 × 96  =  384 px
//  SF   → slot = 8 × 96  =  768 px
//  FIN  → slot = 16 × 96 = 1536 px

const CARD_H = 88;             // approximate BracketMatchRow rendered height (px)
const HEADER = 44;             // column header (title + subtitle + mb-3) height (px)
const R32_SH = CARD_H + 8;    // R32 slot height in flat layout = 96
const R16_SH = 2  * R32_SH;   // 192
const QF_SH  = 4  * R32_SH;   // 384
const SF_SH  = 8  * R32_SH;   // 768
const FIN_SH = 16 * R32_SH;   // 1536

// ── BracketConnectorSVG ─────────────────────────────────────────────────
// Draws precise SVG bracket connectors:
//   ─ left arm  from source match top    (x: 0 → midX)
//   │ vertical  between the two arms     (x: midX, y: y1 → y2)
//   ─ left arm  from source match bottom (x: 0 → midX)
//   ─ right arm from midpoint to dest    (x: midX → W)
//
// srcSlotH:        slot height of the SOURCE column
// srcCenterOffset: y from slot-top to match center
//   flat layout (R32): CARD_H / 2 = 44 px
//   slot layout       : srcSlotH  / 2

function BracketConnectorSVG({
  pairs,
  srcSlotH,
  srcCenterOffset,
}: {
  pairs:           number;
  srcSlotH:        number;
  srcCenterOffset: number;
}) {
  const W      = 40;
  const MID_X  = W / 2;
  const totalH = 2 * pairs * srcSlotH;

  return (
    <div
      className="shrink-0 mx-1"
      style={{
        width:     W,
        marginTop: HEADER,
        filter:    "drop-shadow(0 0 4px rgba(0,200,90,0.22))",
      }}
    >
      <svg width={W} height={totalH} style={{ display: "block", overflow: "visible" }}>
        {Array.from({ length: pairs }, (_, i) => {
          const y1   = i * 2 * srcSlotH + srcCenterOffset;
          const y2   = (i * 2 + 1) * srcSlotH + srcCenterOffset;
          const yMid = (y1 + y2) / 2;
          return (
            <g key={i} stroke="rgba(0,200,90,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round">
              <line x1={0}     y1={y1}   x2={MID_X} y2={y1}   />
              <line x1={0}     y1={y2}   x2={MID_X} y2={y2}   />
              <line x1={MID_X} y1={y1}   x2={MID_X} y2={y2}   />
              <line x1={MID_X} y1={yMid} x2={W}     y2={yMid} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── BracketView — full horizontal bracket (slot model) ────────────────
// Every knockout column uses fixed-height slots so each match sits at the
// exact vertical midpoint of its two source matches.  All five knockout
// columns (R32 through Final) share the same total body height (1536 px),
// which keeps the whole bracket the same height regardless of phase.

function BracketView({ groups, roundOf32, roundOf16, quarterFinals, semiFinals, thirdPlace, finals }: Omit<Props, "bestThirds" | "defaultTab">) {
  const playedGroupMatches = groups.reduce((sum, g) => sum + g.teams.reduce((s, t) => s + t.played, 0) / 2, 0);

  // Column header rendered as a fixed-height block so the connector
  // marginTop=HEADER aligns precisely with the first match slot.
  function ColHeader({ title, titleColor = "text-[#f1f5f9]", subtitle }: {
    title: string; titleColor?: string; subtitle?: string;
  }) {
    return (
      <div style={{ height: HEADER, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 4 }}>
        <p className={`text-[11px] font-black uppercase tracking-widest ${titleColor}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
    );
  }

  // Single slot wrapper — vertically centers its child inside a fixed-height div.
  function Slot({ h, children }: { h: number; children: React.ReactNode }) {
    return (
      <div style={{ height: h, display: "flex", alignItems: "center" }}>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar -mx-4">
      <div className="flex items-start px-4 pb-6 min-w-max" style={{ gap: 0 }}>

        {/* ── Grupos ──────────────────────────────────────────── */}
        <div className="w-56 shrink-0 pr-3">
          <ColHeader title="Grupos" subtitle={`${playedGroupMatches} de ${groups.length * 6} partidos jugados`} />
          {groups.length === 0
            ? <BracketEmptySlot label="Sin grupos" />
            : <div className="grid grid-cols-2 gap-2">{groups.map((g) => <BracketGroupMini key={g.group_code} group={g} />)}</div>
          }
        </div>

        {/* Groups → R32: vertical divider (no clean 2:1 pairing) */}
        <div className="w-px bg-[#1e1e35] self-stretch mx-3 shrink-0" />

        {/* ── Dieciseisavos — 16 × R32_SH slots ──────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Dieciseisavos" subtitle={`${roundOf32.length}/16`} />
          {roundOf32.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : roundOf32.map((m) => (
                <Slot key={m.id} h={R32_SH}><BracketMatchRow match={m} /></Slot>
              ))
          }
        </div>

        {/* R32 → R16: 16 → 8, connector arms hit slot centers */}
        <BracketConnectorSVG pairs={8} srcSlotH={R32_SH} srcCenterOffset={R32_SH / 2} />

        {/* ── Octavos — 8 × R16_SH slots ─────────────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Octavos" subtitle={`${roundOf16.length}/8`} />
          {roundOf16.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : roundOf16.map((m) => (
                <Slot key={m.id} h={R16_SH}><BracketMatchRow match={m} /></Slot>
              ))
          }
        </div>

        {/* R16 → QF */}
        <BracketConnectorSVG pairs={4} srcSlotH={R16_SH} srcCenterOffset={R16_SH / 2} />

        {/* ── Cuartos — 4 × QF_SH slots ──────────────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Cuartos" subtitle={`${quarterFinals.length}/4`} />
          {quarterFinals.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : quarterFinals.map((m) => (
                <Slot key={m.id} h={QF_SH}><BracketMatchRow match={m} /></Slot>
              ))
          }
        </div>

        {/* QF → SF */}
        <BracketConnectorSVG pairs={2} srcSlotH={QF_SH} srcCenterOffset={QF_SH / 2} />

        {/* ── Semis — 2 × SF_SH slots ─────────────────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Semis" subtitle={`${semiFinals.length}/2`} />
          {semiFinals.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : semiFinals.map((m) => (
                <Slot key={m.id} h={SF_SH}><BracketMatchRow match={m} /></Slot>
              ))
          }
        </div>

        {/* SF → Final */}
        <BracketConnectorSVG pairs={1} srcSlotH={SF_SH} srcCenterOffset={SF_SH / 2} />

        {/* ── Final — single FIN_SH slot ──────────────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="🏆 Final" titleColor="text-[#f59e0b]" />
          <Slot h={FIN_SH}>
            <div>
              {finals.length > 0
                ? finals.map((m) => <BracketMatchRow key={m.id} match={m} highlight />)
                : (
                  <div className="bg-[#11111c] border border-[#f59e0b]/20 rounded-xl px-3 py-5 text-center">
                    <p className="text-xl leading-none mb-1">🏆</p>
                    <p className="text-[10px] text-[#64748b]">Por definir</p>
                  </div>
                )
              }
              {thirdPlace.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">🥉 3er Puesto</p>
                  {thirdPlace.map((m) => <BracketMatchRow key={m.id} match={m} />)}
                </div>
              )}
            </div>
          </Slot>
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function CaminoTabs({
  groups,
  bestThirds: _bestThirds,
  roundOf32,
  roundOf16,
  quarterFinals,
  semiFinals,
  thirdPlace,
  finals,
  defaultTab,
}: Props) {
  const [view, setView] = useState<ViewId>(() => {
    if (typeof window === "undefined") return "bracket";
    return (localStorage.getItem("camino-view") as ViewId) ?? "bracket";
  });
  const [tab,  setTab]  = useState<TabId>((defaultTab as TabId) ?? "groups");

  function handleViewChange(v: ViewId) {
    setView(v);
    localStorage.setItem("camino-view", v);
  }

  return (
    <div className="space-y-4">

      {/* ── View toggle ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 bg-[#11111c] border border-[#1e1e35] rounded-xl p-1">
          {(["phase", "bracket"] as ViewId[]).map((v) => {
            const label = v === "phase" ? "Por fase" : "Bracket";
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#18182a] text-[#f1f5f9]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Phase view ──────────────────────────────────────────── */}
      {view === "phase" && (
        <div className="space-y-4">
          {/* Tab bar (scrollable on mobile) */}
          <div className="-mx-4 px-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#00c85a]/10 text-[#00c85a] border border-[#00c85a]/20"
                        : "text-[#64748b] hover:text-[#94a3b8] border border-transparent"
                    }`}
                  >
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          {tab === "groups" && <GruposTab groups={groups} />}
          {tab === "r32"    && (
            <KnockoutTab matches={roundOf32}     emptyMessage="Los cruces de dieciseisavos aún no están disponibles." />
          )}
          {tab === "r16"    && (
            <KnockoutTab matches={roundOf16}     emptyMessage="Los cruces de octavos aún no están disponibles." />
          )}
          {tab === "qf"     && (
            <KnockoutTab matches={quarterFinals} emptyMessage="Los cuartos de final aún no están disponibles." />
          )}
          {tab === "sf"     && (
            <KnockoutTab matches={semiFinals}    emptyMessage="Las semifinales aún no están disponibles." />
          )}
          {tab === "final"  && (
            <FinalTab finals={finals} thirdPlace={thirdPlace} />
          )}
        </div>
      )}

      {/* ── Bracket view ────────────────────────────────────────── */}
      {view === "bracket" && (
        <BracketView
          groups={groups}
          roundOf32={roundOf32}
          roundOf16={roundOf16}
          quarterFinals={quarterFinals}
          semiFinals={semiFinals}
          thirdPlace={thirdPlace}
          finals={finals}
        />
      )}

    </div>
  );
}
