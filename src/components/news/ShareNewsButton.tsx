"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shortUrl = `${window.location.origin}/n/${newsId}`;
    const shareText = buildShareText(content, shortUrl);
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // unavailable
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
    >
      {copied ? (
        <>
          <Check size={15} className="text-[#00c85a]" />
          <span className="text-[#00c85a]">Noticia copiada</span>
        </>
      ) : (
        <>
          <Share2 size={15} />
          <span>Compartir noticia</span>
        </>
      )}
    </button>
  );
}
