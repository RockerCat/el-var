import Link from "next/link";
import { getMatchesForAdmin } from "@/lib/db/admin";
import MatchAdminCard from "@/components/admin/MatchAdminCard";

export default async function AdminPage() {
  const matches = await getMatchesForAdmin();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#475569] font-mono uppercase tracking-widest mb-1">
            Admin
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">Gestión de partidos</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-[#64748b]">No hay partidos registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchAdminCard key={match.id} match={match} />
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
