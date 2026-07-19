"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, ListOrdered, Radio, Crown, Trophy, Users, User } from "lucide-react";

const BASE_NAV_ITEMS = [
  { href: "/dashboard",   label: "Inicio",    icon: Home        },
  { href: "/leaderboard", label: "Tabla",     icon: ListOrdered },
  { href: "/en-vivo",     label: "En Vivo",   icon: Radio       },
  { href: "/copa",        label: "Copa",      icon: Trophy      },
  { href: "/community",   label: "Comunidad", icon: Users       },
  { href: "/profile",     label: "Perfil",    icon: User        },
];

// Once the tournament is finished, this replaces the "En Vivo" entry in the
// exact same slot — same position, same responsive behaviour.
const PODIUM_NAV_ITEM = { href: "/podio", label: "Podio", icon: Crown };

export default function NavActiveLinks({
  hasLiveMatch = false,
  podiumActive = false,
}: {
  hasLiveMatch?: boolean;
  podiumActive?: boolean;
}) {
  const pathname = usePathname();
  const navItems = podiumActive
    ? BASE_NAV_ITEMS.map((item) => (item.href === "/en-vivo" ? PODIUM_NAV_ITEM : item))
    : BASE_NAV_ITEMS;

  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/community" && pathname.startsWith("/groups"));
        const isLive = href === "/en-vivo";

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors",
              active
                ? "text-[#f1f5f9] bg-[#18182a]"
                : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]/60"
            )}
          >
            <div className="relative">
              <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
              {isLive && hasLiveMatch && (
                <span className="absolute -top-0.5 -right-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                </span>
              )}
            </div>
            {label}
          </Link>
        );
      })}
    </>
  );
}
