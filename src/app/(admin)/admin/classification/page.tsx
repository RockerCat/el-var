import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import {
  computeGroupStandings,
  computeBestThirds,
  type ClassificationMatch,
  type KnockoutPreviewMatch,
} from "@/lib/classification";
import CaminoTabs from "@/components/admin/ClassificationTabs";

const KNOCKOUT_SELECT =
  "id, match_number, starts_at, venue, status, home_score, away_score, winner_side, " +
  "home_placeholder, away_placeholder, " +
  "home_team:home_team_id(id, name, code, flag_emoji), " +
  "away_team:away_team_id(id, name, code, flag_emoji)";

function detectDefaultTab(
  groupMatches: ClassificationMatch[],
  r32: KnockoutPreviewMatch[],
  r16: KnockoutPreviewMatch[],
  qf:  KnockoutPreviewMatch[],
  sf:  KnockoutPreviewMatch[],
): string {
  if (groupMatches.some((m) => m.status !== "finished")) return "groups";
  if (r32.some((m) => m.status !== "finished")) return "r32";
  if (r16.some((m) => m.status !== "finished")) return "r16";
  if (qf.some((m)  => m.status !== "finished")) return "qf";
  if (sf.some((m)  => m.status !== "finished")) return "sf";
  return "final";
}

export default async function ClassificationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const [
    { data: groupMatchData },
    { data: r32Data },
    { data: r16Data },
    { data: qfData },
    { data: sfData },
    { data: thirdPlaceData },
    { data: finalData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "group_code, home_score, away_score, status, " +
        "home_team:home_team_id(id, name, code, flag_emoji), " +
        "away_team:away_team_id(id, name, code, flag_emoji)"
      )
      .eq("stage", "group"),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "round_of_32").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "round_of_16").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "quarter_final").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "semi_final").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "third_place").order("match_number", { ascending: true }),
    supabase.from("matches").select(KNOCKOUT_SELECT).eq("stage", "final").order("match_number", { ascending: true }),
  ]);

  const groupMatches  = (groupMatchData  ?? []) as unknown as ClassificationMatch[];
  const r32           = (r32Data         ?? []) as unknown as KnockoutPreviewMatch[];
  const r16           = (r16Data         ?? []) as unknown as KnockoutPreviewMatch[];
  const qf            = (qfData          ?? []) as unknown as KnockoutPreviewMatch[];
  const sf            = (sfData          ?? []) as unknown as KnockoutPreviewMatch[];
  const thirdPlace    = (thirdPlaceData  ?? []) as unknown as KnockoutPreviewMatch[];
  const finals        = (finalData       ?? []) as unknown as KnockoutPreviewMatch[];

  const groups      = computeGroupStandings(groupMatches);
  const bestThirds  = computeBestThirds(groups);
  const defaultTab  = detectDefaultTab(groupMatches, r32, r16, qf, sf);

  const finishedGroup = groupMatches.filter((m) => m.status === "finished").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Copa
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Camino a la Copa</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Solo lectura · {finishedGroup} partido{finishedGroup !== 1 ? "s" : ""} de grupos finalizado{finishedGroup !== 1 ? "s" : ""}
        </p>
      </div>

      <CaminoTabs
        groups={groups}
        bestThirds={bestThirds}
        roundOf32={r32}
        roundOf16={r16}
        quarterFinals={qf}
        semiFinals={sf}
        thirdPlace={thirdPlace}
        finals={finals}
        defaultTab={defaultTab}
      />
    </div>
  );
}
