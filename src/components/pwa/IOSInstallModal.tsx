"use client";

import { useEffect } from "react";
import { X, Share, SquarePlus, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: Share,        text: "Toca el botón Compartir" },
  { icon: SquarePlus,   text: 'Selecciona "Agregar a inicio"' },
  { icon: CheckCircle2, text: "Confirma la instalación" },
];

export default function IOSInstallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full bg-[#11111c] border border-[#2a2a45] rounded-t-3xl sm:rounded-2xl sm:max-w-sm sm:mx-4 pb-safe-b animate-fade-in-up">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#2a2a45]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e35]">
          <h2 className="text-base font-bold text-[#f1f5f9]">Agregar La Penúltima al inicio</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#20203a] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#00c85a]/15 text-[#00c85a] flex items-center justify-center text-xs font-black shrink-0">
                {i + 1}
              </span>
              <Icon size={16} className="text-[#94a3b8] shrink-0" />
              <p className="text-sm text-[#f1f5f9]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
