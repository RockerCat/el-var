"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareNewsButton({
  newsId,
  title,
}: {
  newsId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/noticias/${newsId}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // unavailable — nothing to do
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
          <span className="text-[#00c85a]">Enlace copiado</span>
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
