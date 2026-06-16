import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import { getNewsDetail } from "@/lib/db/news";
import ShareNewsButton from "@/components/news/ShareNewsButton";

// ── Open Graph metadata ───────────────────────────────────────────────
// metadataBase is set in src/app/layout.tsx — all relative URLs here
// are resolved against NEXT_PUBLIC_SITE_URL (or VERCEL_URL / localhost).

type PageProps = { params: Promise<{ newsId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { newsId } = await params;
  const item = await getNewsDetail(newsId);
  if (!item) return { title: "Noticia | La Penúltima" };

  const title       = `${item.title} | La Penúltima`;
  const description = item.summary;
  const url         = `/noticias/${newsId}`;
  const image       = "/social/corresponsal-lapenultima.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "La Penúltima",
      type:     "article",
      images:   [{ url: image }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [image],
    },
  };
}

// ── Block parsing ─────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  "⚽": "Resultado",
  "🏆": "Liderato",
  "📈": "Movimiento destacado",
  "📉": "Movimiento destacado",
  "🎯": "Marcador exacto",
  "⚡": "Participación",
  "💰": "Premios proyectados",
};

function detectLabel(text: string): string | null {
  for (const [emoji, label] of Object.entries(BLOCK_LABELS)) {
    if (text.startsWith(emoji)) return label;
  }
  return null;
}

function parseBlocks(content: string): { label: string | null; text: string }[] {
  if (!content?.trim()) return [];
  return content
    .split("\n\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((text) => ({ label: detectLabel(text), text }));
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function NoticiaDetailPage({ params }: PageProps) {
  const { newsId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const item = await getNewsDetail(newsId);
  if (!item) notFound();

  const blocks = parseBlocks(item.content);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Back */}
      <a
        href="/noticias"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Noticias
      </a>

      {/* Header */}
      <div>
        <p className="text-[10px] text-[#475569] font-mono uppercase tracking-widest mb-2">
          {formatDate(item.created_at)}
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9] leading-tight">{item.title}</h1>
      </div>

      {/* Blocks */}
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <div
              key={i}
              className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-4 py-3.5"
            >
              {block.label && (
                <p className="text-[10px] text-[#475569] font-mono uppercase tracking-widest mb-1.5">
                  {block.label}
                </p>
              )}
              <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                {block.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-4 py-3.5">
          <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
            {item.content}
          </p>
        </div>
      )}

      {/* Share */}
      <ShareNewsButton newsId={item.id} title={item.title} />

      {/* CTA — discrete, below content */}
      {item.related_match_id && (
        <Link
          href={`/matches/${item.related_match_id}`}
          className="inline-flex items-center gap-1 text-xs text-[#475569] hover:text-[#64748b] transition-colors"
        >
          Ver pronósticos y tabla →
        </Link>
      )}

    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
