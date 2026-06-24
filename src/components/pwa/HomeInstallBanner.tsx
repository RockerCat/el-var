"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import IOSInstallModal from "@/components/pwa/IOSInstallModal";

/**
 * Compact, single-row install strip shown only on the Home/dashboard screen.
 * Dismissal is plain component state — it intentionally does not persist
 * anywhere, so the banner reappears whenever Home is mounted again.
 */
export default function HomeInstallBanner() {
  const { platform, showInstallCta, promptInstall } = usePWAInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!showInstallCta || dismissed) return null;

  const text = platform === "android"
    ? "📲 Instala La Penúltima como app"
    : "📲 Agrega La Penúltima al inicio";
  const actionLabel = platform === "android" ? "Instalar" : "Ver cómo";

  async function handleAction() {
    if (platform === "android") {
      await promptInstall();
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 h-11 px-3 mb-4 rounded-xl bg-[#00c85a]/8 border border-[#00c85a]/20">
        <p className="flex-1 min-w-0 text-xs font-medium text-[#f1f5f9] truncate">{text}</p>
        <button
          onClick={handleAction}
          className="shrink-0 text-xs font-bold text-[#00c85a] hover:text-[#00e87a] transition-colors"
        >
          {actionLabel}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="shrink-0 w-6 h-6 flex items-center justify-center text-[#64748b] hover:text-[#94a3b8] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <IOSInstallModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
