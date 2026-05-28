"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, Hash } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { joinGroupAction } from "@/app/actions/groups";

interface LoginFormProps {
  /** Invite code from ?invite= URL param — null means plain login */
  inviteCode: string | null;
}

export default function LoginForm({ inviteCode }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(getAuthErrorMessage(authError));
      setLoading(false);
      return;
    }

    // Auto-join group if the user arrived from an invite link
    if (inviteCode) {
      console.log("[LoginForm] auto-joining group:", inviteCode);
      const fd = new FormData();
      fd.set("invite_code", inviteCode);
      const joinResult = await joinGroupAction(null, fd);
      if (joinResult && "error" in joinResult) {
        console.warn("[LoginForm] auto-join result:", joinResult.error);
        // "Ya eres miembro" is fine — non-blocking for any error
      } else {
        console.log("[LoginForm] auto-join successful ✓");
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#00c85a] flex items-center justify-center">
            <svg width="20" height="16" viewBox="0 0 18 14" fill="none">
              <path
                d="M1 1L5.5 12L9 5L12.5 12L17 1"
                stroke="#0a0a12"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-bold text-xl text-[#f1f5f9]">
            El <span className="text-[#00c85a]">VAR</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Bienvenido de nuevo</h1>
        <p className="text-sm text-[#64748b] mt-1">
          {inviteCode
            ? "Ingresa para unirte al grupo"
            : "Ingresa a tu grupo de predicciones"}
        </p>
      </div>

      {/* Invite code banner — shown when user arrives from an invite link */}
      {inviteCode && (
        <div className="mb-4 flex items-center gap-3 bg-[#00c85a]/8 border border-[#00c85a]/20 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c85a]/15 flex items-center justify-center shrink-0">
            <Hash size={14} className="text-[#00c85a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#64748b]">Código de invitación</p>
            <p className="text-sm font-bold font-mono text-[#f1f5f9]">{inviteCode}</p>
          </div>
        </div>
      )}

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tú@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-[#64748b] hover:text-[#00c85a] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#ef4444] leading-relaxed">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {inviteCode ? "Ingresar y unirme al grupo" : "Ingresar"}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#64748b]">
            ¿No tienes cuenta?{" "}
            <Link
              href={inviteCode ? `/signup?invite=${inviteCode}` : "/signup"}
              className="text-[#00c85a] font-semibold hover:text-[#00e87a]"
            >
              {inviteCode ? "Crear cuenta" : "Únete por invitación"}
            </Link>
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          Verificando tu identidad
        </span>
      </div>
    </div>
  );
}
