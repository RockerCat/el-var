import { createClient } from "@/lib/supabase/server";
import { getTournamentFinished } from "@/lib/db/matches";
import { getPodiumData } from "@/lib/db/podium";
import PodiumView from "@/components/podium/PodiumView";

// Admin-only preview of the Podio page, reachable before the tournament
// closes. No separate permission system: this route lives under (admin),
// whose layout (src/app/(admin)/layout.tsx) already redirects any
// unauthenticated or non-admin visitor to /dashboard before this ever runs.
export default async function AdminPodioPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const finished = await getTournamentFinished();
  const { leaderboard, projectedPrizes } = await getPodiumData(user.id);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PodiumView
        mode={finished ? "final" : "preview"}
        leaderboard={leaderboard}
        projectedPrizes={projectedPrizes}
        currentUserId={user.id}
      />
    </div>
  );
}
