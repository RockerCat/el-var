import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import { getTournamentFinished } from "@/lib/db/matches";
import { getPodiumData } from "@/lib/db/podium";
import PodiumView from "@/components/podium/PodiumView";
import TabReadySignal from "@/components/layout/TabReadySignal";

export default async function PodioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  // Same guard admins/regular users guessing this URL early are subject to:
  // the Podio page only opens for everyone once the real tournament-finished
  // condition is true. Before that, send them back to the tab it replaces.
  const finished = await getTournamentFinished();
  if (!finished) redirect("/en-vivo");

  const { leaderboard, projectedPrizes } = await getPodiumData(user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <TabReadySignal />
      <PodiumView
        mode="final"
        leaderboard={leaderboard}
        projectedPrizes={projectedPrizes}
        currentUserId={user.id}
      />
    </div>
  );
}
