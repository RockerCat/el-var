import { Archive } from "lucide-react";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import SnapshotButton from "@/components/admin/SnapshotButton";

export default function AdminSecurityPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-8 space-y-8">
      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Seguridad
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Seguridad</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Gestiona la contraseña y los respaldos de la aplicación.
        </p>
      </div>

      {/* ── Respaldo de datos ─────────────────────────────────────────── */}
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#1e1e35] flex items-center justify-center shrink-0 mt-0.5">
            <Archive size={14} className="text-[#64748b]" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#f1f5f9]">
              Respaldo de datos
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">
              Genera un snapshot completo antes de cambios importantes:
              eliminatorias, recálculo de puntos, migraciones.
            </p>
          </div>
        </div>
        <SnapshotButton />
      </div>

      {/* ── Cambio de contraseña ──────────────────────────────────────── */}
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
