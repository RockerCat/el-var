"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Hash, AlertCircle, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage, validatePassword } from "@/lib/auth-errors";

interface SignupFormProps {
  /** Invite code from URL — null means direct signup with no pending invite */
  inviteCode: string | null;
  /** Group display name — null when no invite */
  groupName: string | null;
}

export default function SignupForm({ inviteCode, groupName }: SignupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (passwordError) setPasswordError(validatePassword(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }
    setPasswordError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError));
      setLoading(false);
      return;
    }

    // Session present → email confirmation disabled, auto-login
    if (data.session) {
      if (inviteCode) {
        // Go to the invite page so the user can explicitly confirm joining
        router.push(`/invite/${inviteCode}`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
      return;
    }

    // No session → email confirmation required
    if (data.user && !data.session) {
      setEmailConfirmationNeeded(true);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  if (emailConfirmationNeeded) {
    return <EmailConfirmationScreen email={email} inviteCode={inviteCode} />;
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
        <h1 className="text-2xl font-black text-[#f1f5f9]">
          {inviteCode ? "Únete al grupo" : "Crear cuenta"}
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          {inviteCode
            ? "Crea tu cuenta y empieza a predecir"
            : "Empieza a predecir el Mundial 2026"}
        </p>
      </div>

      {/* Invite banner — only shown when an invite code is present */}
      {inviteCode && (
        <div className="mb-4 flex items-center gap-3 bg-[#00c85a]/8 border border-[#00c85a]/20 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c85a]/15 flex items-center justify-center shrink-0">
            <Hash size={14} className="text-[#00c85a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#64748b]">Te invitaron a</p>
            <p className="text-sm font-bold text-[#f1f5f9] truncate">
              {groupName ?? "un grupo de El VAR"}
            </p>
          </div>
          <Badge variant="green">{inviteCode}</Badge>
        </div>
      )}

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre de usuario"
            type="text"
            placeholder="ej. goleador_9"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftIcon={<User size={16} />}
            hint="Así te van a ver tus amigos"
            required
            autoFocus
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tú@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mín. 8 caracteres"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            leftIcon={<Lock size={16} />}
            error={passwordError ?? undefined}
            required
            autoComplete="new-password"
            minLength={8}
          />

          {error && (
            <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#ef4444] leading-relaxed">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {inviteCode ? "Crear cuenta y unirme" : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-xs text-[#475569] text-center mt-4">
          Al registrarte aceptas nuestros{" "}
          <span className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer">
            términos
          </span>
          .
        </p>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#64748b]">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-[#00c85a] font-semibold hover:text-[#00e87a]"
            >
              Ingresar
            </Link>
          </p>
        </div>
      </Card>

      {inviteCode && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a] animate-live-pulse" />
          <span className="text-xs font-mono text-[#00c85a] uppercase tracking-widest">
            Invitación validada
          </span>
        </div>
      )}
    </div>
  );
}

function EmailConfirmationScreen({
  email,
  inviteCode,
}: {
  email: string;
  inviteCode: string | null;
}) {
  return (
    <div className="w-full max-w-sm animate-fade-in-up text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#00c85a]/15 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} className="text-[#00c85a]" />
      </div>
      <h2 className="text-2xl font-black text-[#f1f5f9] mb-2">
        Revisa tu correo
      </h2>
      <p className="text-[#64748b] text-sm leading-relaxed mb-2">
        Te enviamos un enlace de confirmación a:
      </p>
      <p className="text-[#f1f5f9] font-semibold text-sm mb-6">{email}</p>
      <Card className="p-4 text-left">
        <p className="text-xs text-[#475569] leading-relaxed">
          Confirma tu correo para activar tu cuenta.
          {inviteCode && (
            <>
              {" "}
              Luego visita el enlace de invitación para unirte al grupo.
            </>
          )}
          {" "}Si no lo ves, revisa tu carpeta de spam.
        </p>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {inviteCode && (
          <Link
            href={`/invite/${inviteCode}`}
            className="flex items-center justify-center h-11 w-full bg-[#18182a] text-[#94a3b8] text-sm font-medium rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
          >
            Ir al enlace de invitación
          </Link>
        )}
        <Link
          href="/login"
          className="text-sm text-[#00c85a] font-semibold hover:text-[#00e87a]"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
