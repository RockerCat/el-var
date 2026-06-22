import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import AppFooter from "@/components/layout/AppFooter";
import MobileTabSkeletonOverlay from "@/components/layout/MobileTabSkeletonOverlay";
import { TabNavigationProvider } from "@/contexts/tab-navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: liveMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "live")
    .limit(1)
    .maybeSingle();
  const hasLiveMatch = !!liveMatch;

  return (
    <TabNavigationProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar hasLiveMatch={hasLiveMatch} />
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          <div className="flex-1">
            {children}
          </div>
          <AppFooter />
        </div>
        <BottomNav hasLiveMatch={hasLiveMatch} />
        <MobileTabSkeletonOverlay />
      </div>
    </TabNavigationProvider>
  );
}
