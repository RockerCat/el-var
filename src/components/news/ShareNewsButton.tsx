"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareNewsButton({
  newsId,
  title,
  summary,
}: {
  newsId: string;
  title: string;
  summary: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url  = `${window.location.origin}/noticias/${newsId}`;
    const text = `🏆 La Penúltima\n\n${title}\n\n${summary}\n\nVer noticia completa:\n${url}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // AbortError = user dismissed the share sheet — silent
        if (err instanceof Error && err.name === "AbortError") return;
        // Any other failure → fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard also unavailable — nothing to do
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
          <span className="text-[#00c85a]">Copiado al portapapeles</span>
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
