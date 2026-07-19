import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavActiveLinks from "./NavActiveLinks";
import UserMenuButton from "./UserMenuButton";

export default async function Navbar({
  hasLiveMatch = false,
  podiumActive = false,
}: {
  hasLiveMatch?: boolean;
  podiumActive?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = user?.user_metadata?.username as string | undefined;
  const displayName = username ?? user?.email?.split("@")[0] ?? "jugador";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1e1e35]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/login"} className="flex items-center gap-2 shrink-0">
          <VarLogo />
          <span className="font-bold text-lg tracking-tight text-[#f1f5f9]">
            La <span className="text-gradient-green">Penúltima</span>
          </span>
        </Link>

        {user ? (
          <AuthenticatedNav
            displayName={displayName}
            initial={initial}
            hasLiveMatch={hasLiveMatch}
            podiumActive={podiumActive}
          />
        ) : (
          <GuestNav />
        )}
      </div>
    </header>
  );
}

/* ── Authenticated nav ──────────────────────────────────────────────── */

function AuthenticatedNav({
  displayName,
  initial,
  hasLiveMatch,
  podiumActive,
}: {
  displayName: string;
  initial: string;
  hasLiveMatch?: boolean;
  podiumActive?: boolean;
}) {
  return (
    <>
      {/* Desktop center links */}
      <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
        <NavActiveLinks hasLiveMatch={hasLiveMatch} podiumActive={podiumActive} />
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Mobile: avatar/name → dropdown (Perfil, Reglas, Cerrar sesión) */}
        <div className="sm:hidden">
          <UserMenuButton displayName={displayName} initial={initial} size="sm" />
        </div>

        {/* Desktop: user chip → dropdown (Perfil, Reglas, Cerrar sesión) */}
        <div className="hidden sm:flex">
          <UserMenuButton displayName={displayName} initial={initial} size="md" />
        </div>
      </div>
    </>
  );
}

/* ── Guest nav ──────────────────────────────────────────────────────── */

function GuestNav() {
  return (
    <Link
      href="/login"
      className="text-sm font-semibold bg-[#00c85a] text-[#0a0a12] px-4 py-2 rounded-xl hover:bg-[#00e87a] transition-colors"
    >
      Ingresar
    </Link>
  );
}

/* ── Shared ─────────────────────────────────────────────────────────── */

function VarLogo() {
  return (
    <img src="/icons/logo.png" alt="La Penúltima" className="w-8 h-8 rounded-lg object-cover" />
  );
}
