"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-2xl mb-2">⚠️</p>
        <p className="text-base font-bold text-[#f1f5f9] mb-1">Algo salió mal</p>
        <p className="text-sm text-[#64748b] mb-6">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-[#00c85a] text-[#0a0a12] text-sm font-bold rounded-xl hover:bg-[#00e87a] transition-colors"
        >
          <RefreshCw size={14} />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
