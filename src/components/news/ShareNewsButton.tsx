"use client";

import { Share2 } from "lucide-react";

function buildShareText(content: string, shortUrl: string): string {
  const normalized = content.trim().replace(/\n{2,}/g, "\n");
  return `La Penúltima News:\n\n${normalized}\n\nMás noticias en:\n${shortUrl}`;
}

export default function ShareNewsButton({
  newsId,
  content,
}: {
  newsId: string;
  content: string;
}) {
  function handleShare() {
    const shortUrl = `${window.location.origin}/n/${newsId}`;
    const shareText = buildShareText(content, shortUrl);
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
