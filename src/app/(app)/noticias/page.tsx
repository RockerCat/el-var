import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import { getNewsList } from "@/lib/db/news";

export default async function NoticiasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const news = await getNewsList();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden h-[220px] sm:h-[280px]">
        <img
          src="/img/corresponsal_lapenultima.png"
          alt="La Penúltima News"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hero text */}
      <div>
        <h1 className="text-xl font-black text-[#f1f5f9]">La Penúltima News</h1>
        <p className="text-sm text-[#64748b] mt-1 leading-relaxed">
          Las últimas novedades del Mundial, movimientos en la tabla, líderes, premios proyectados y resultados destacados.
        </p>
      </div>

      {news.length === 0 ? (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-10 text-center">
          <p className="text-2xl mb-2">📰</p>
          <p className="text-sm text-[#64748b]">Aún no hay noticias.</p>
          <p className="text-xs text-[#475569] mt-1">
            Aparecerán aquí cuando finalice el primer partido.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <Link key={item.id} href={`/noticias/${item.id}`} className="block">
              <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4 hover:border-[#2a2a45] transition-colors flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#f1f5f9] mb-1">{item.title}</p>
                  <p className="text-xs text-[#94a3b8] mb-2.5 leading-relaxed">{item.summary}</p>
                  <p className="text-[10px] text-[#475569] font-mono">{formatDate(item.created_at)}</p>
                </div>
                <ChevronRight size={16} className="text-[#2a2a45] shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
