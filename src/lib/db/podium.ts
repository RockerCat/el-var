import { getUserGroupsWithMeta, getActivePlayerCount } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import {
  computePrizePool,
  computeProjectedPrizes,
  type LeaderboardEntry,
  type PrizePool,
  type ProjectedPrize,
} from "@/lib/groups";

export type PodiumData = {
  leaderboard: LeaderboardEntry[];
  prizePool: PrizePool | null;
  /** Per-user projected prize, as entries (Map isn't a valid RSC prop). */
  projectedPrizes: [string, ProjectedPrize][];
};

/**
 * Data for the Podio page. Reuses the exact same ranking and prize sources
 * already powering the dashboard (getGroupLeaderboard, computePrizePool,
 * computeProjectedPrizes) — no new ranking criteria, tie-break, or prize
 * math is introduced here.
 */
export async function getPodiumData(userId: string): Promise<PodiumData> {
  const groups = await getUserGroupsWithMeta(userId);
  const community = groups[0] ?? null;

  const [leaderboard, activePlayers] = await Promise.all([
    community ? getGroupLeaderboard(community.id) : Promise.resolve([]),
    community ? getActivePlayerCount(community.id) : Promise.resolve(0),
  ]);

  const prizePool = community
    ? computePrizePool(
        {
          entry_fee:        community.entry_fee        ?? 0,
          first_place_pct:  community.first_place_pct  ?? 70,
          second_place_pct: community.second_place_pct ?? 30,
        },
        activePlayers // active players only — excludes admins and disabled users
      )
    : null;

  const projectedPrizes = prizePool
    ? Array.from(computeProjectedPrizes(prizePool, leaderboard).entries())
    : [];

  return { leaderboard, prizePool, projectedPrizes };
}
