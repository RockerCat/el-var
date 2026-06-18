"use client";

import { Share2 } from "lucide-react";

function buildShareText(content: string, newsUrl: string): string {
  const normalized = content.trim().replace(/\n{3,}/g, "\n\n");
  return `🎙️ La Penúltima News\n🤖 Generado por IA\n\n${normalized}\n\n📰 Más noticias:\n${newsUrl}`;
}

export default function ShareNewsButton({
  content,
}: {
  content: string;
}) {
  function handleShare() {
    const newsUrl = `${window.location.origin}/news`;
    const shareText = buildShareText(content, newsUrl);
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
    >
      <Share2 size={15} />
      <span>💬 Compartir en WhatsApp</span>
    </button>
  );
}
