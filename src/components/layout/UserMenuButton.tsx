"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, BookOpen, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function UserMenuButton({
  displayName,
  initial,
  size = "sm",
}: {
  displayName: string;
  initial: string;
  /** "sm" = mobile (smaller avatar), "md" = desktop chip style */
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isMd = size === "md";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 min-w-0 transition-opacity",
          isMd && "bg-[#18182a] border border-[#2a2a45] rounded-xl px-3 py-1.5 hover:border-[#3a3a55]"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "rounded-full bg-[#00c85a]/20 flex items-center justify-center shrink-0",
          isMd
            ? "w-5 h-5 border-0"
            : "w-7 h-7 border border-[#00c85a]/30"
        )}>
          <span className={cn(
            "font-bold text-[#00c85a]",
            isMd ? "text-[10px]" : "text-[10px]"
          )}>
            {initial}
          </span>
        </div>

        {/* Name */}
        <span className={cn(
          "font-medium text-[#94a3b8] truncate",
          isMd ? "text-sm max-w-[110px]" : "text-sm max-w-[90px]"
        )}>
          {displayName}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          className={cn(
            "text-[#475569] shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#11111c] border border-[#1e1e35] rounded-xl shadow-2xl z-50 overflow-hidden">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors"
          >
            <User size={14} strokeWidth={1.8} />
            Perfil
          </Link>
          <Link
            href="/rules"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors"
          >
            <BookOpen size={14} strokeWidth={1.8} />
            Reglas
          </Link>
          <div className="border-t border-[#1e1e35]">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <LogOut size={14} strokeWidth={1.8} className="shrink-0" />
              )}
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
