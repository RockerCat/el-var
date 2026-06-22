"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, ListOrdered, Radio, Trophy, Users } from "lucide-react";
import { useTabNavigation } from "@/contexts/tab-navigation";

const navItems = [
  { href: "/dashboard",   label: "Inicio",    icon: Home        },
  { href: "/leaderboard", label: "Tabla",     icon: ListOrdered },
  { href: "/en-vivo",     label: "En Vivo",   icon: Radio       },
  { href: "/copa",        label: "Copa",      icon: Trophy      },
  { href: "/community",   label: "Comunidad", icon: Users       },
];

export default function BottomNav({ hasLiveMatch = false }: { hasLiveMatch?: boolean }) {
  const pathname = usePathname();
  // pendingHref is owned by TabNavigationProvider and only clears once the
  // destination tab's own content signals it has mounted (TabReadySignal) —
  // not just on route/pathname change, which can fire before the new
  // page's client bundle has actually rendered anything visible.
  const { pendingHref, startTabTransition } = useTabNavigation();

  function handleTap(href: string) {
    if (href === pathname) return;
    startTabTransition(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a12]/90 backdrop-blur-xl border-t border-[#1e1e35] overflow-hidden">
      <div className="flex items-stretch h-16 w-full">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isCurrentRoute =
            pathname === href ||
            (href === "/community" && pathname.startsWith("/groups"));
          const active = pendingHref ? pendingHref === href : isCurrentRoute;
          const isLive = href === "/en-vivo";

          return (
            <Link
              key={href}
              href={href}
              onClick={() => handleTap(href)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                active
                  ? (isLive && hasLiveMatch ? "text-[#ef4444]" : "text-[#00c85a]")
                  : "text-[#64748b] hover:text-[#94a3b8]"
              )}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {isLive && hasLiveMatch && (
                  <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ef4444]" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
