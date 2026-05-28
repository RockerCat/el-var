"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();

  const isAuth = pathname?.startsWith("/(auth)") ||
    pathname === "/login" ||
    pathname === "/signup";

  if (isAuth) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1e1e35]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <VarLogo />
          <span className="font-bold text-lg tracking-tight text-[#f1f5f9]">
            El <span className="text-gradient-green">VAR</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/dashboard" active={pathname === "/dashboard"}>
            Dashboard
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-[#94a3b8] hover:text-[#f1f5f9] px-3 py-2 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-[#00c85a] text-[#0a0a12] px-4 py-2 rounded-xl hover:bg-[#00e87a] transition-colors"
          >
            Join group
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm px-3 py-2 rounded-lg transition-colors",
        active
          ? "text-[#f1f5f9] bg-[#18182a]"
          : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]/60"
      )}
    >
      {children}
    </Link>
  );
}

function VarLogo() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#00c85a] flex items-center justify-center">
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
        <path
          d="M1 1L5.5 12L9 5L12.5 12L17 1"
          stroke="#0a0a12"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
