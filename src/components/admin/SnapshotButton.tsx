"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

type SuccessResult = {
  totalRecords: number;
  fileSizeKb: number;
  filename: string;
};

export default function SnapshotButton() {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDownload() {
    setState("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/snapshot");

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? `Error ${res.status}`
        );
      }

      const blob = await res.blob();
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "lapenultima-backup.json";

      // Parse metadata from response to show record count
      let totalRecords = 0;
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { metadata?: { totalRecords?: number } };
        totalRecords = parsed.metadata?.totalRecords ?? 0;
      } catch {
        // non-fatal
      }

      const fileSizeKb = Math.round(blob.size / 1024);

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState("success");
      setResult({ totalRecords, fileSizeKb, filename });
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div className="flex gap-3 p-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl">
        <ShieldAlert
          size={15}
          className="text-[#f59e0b] shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          Este archivo contiene información completa de la aplicación.{" "}
          <span className="text-[#f59e0b] font-medium">
            Guárdelo en un lugar seguro.
          </span>
        </p>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={state === "loading"}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00c85a] hover:bg-[#00b050] disabled:opacity-50 disabled:cursor-not-allowed text-[#080810] font-semibold text-sm rounded-xl transition-colors"
      >
        {state === "loading" ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Generando snapshot...
          </>
        ) : (
          <>
            <Download size={15} strokeWidth={2.2} />
            Descargar Snapshot
          </>
        )}
      </button>

      {/* Success feedback */}
      {state === "success" && result && (
        <div className="flex gap-3 p-3 bg-[#00c85a]/5 border border-[#00c85a]/20 rounded-xl">
          <CheckCircle2
            size={15}
            className="text-[#00c85a] shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[#00c85a]">
              Snapshot generado correctamente.
            </p>
            <p className="text-xs text-[#64748b]">
              {result.totalRecords.toLocaleString()} registros exportados ·{" "}
              {result.fileSizeKb} KB
            </p>
            <p className="text-[11px] text-[#475569] font-mono break-all">
              {result.filename}
            </p>
          </div>
        </div>
      )}

      {/* Error feedback */}
      {state === "error" && (
        <div className="flex gap-3 p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
          <AlertCircle
            size={15}
            className="text-[#ef4444] shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-xs text-[#ef4444]">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
