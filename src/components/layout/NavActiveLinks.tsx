"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function NavActiveLinks() {
  const pathname = usePathname();

  return (
    <Link
      href="/dashboard"
      className={cn(
        "text-sm px-3 py-2 rounded-lg transition-colors",
        pathname === "/dashboard"
          ? "text-[#f1f5f9] bg-[#18182a]"
          : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]/60"
      )}
    >
      Inicio
    </Link>
  );
}
