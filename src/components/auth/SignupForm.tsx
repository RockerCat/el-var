"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Hash, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage, validatePassword } from "@/lib/auth-errors";
import { joinGroupAction } from "@/app/actions/groups";

interface SignupFormProps {
  inviteCode: string | null;
  groupName: string | null;
}

type JoinStatus =
  | { phase: "joining" }
  | { phase: "success"; groupName: string }
  | { phase: "error"; userMsg: string; devDetail?: string };

export default function SignupForm({ inviteCode, groupName }: SignupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (passwordError) setPasswordError(validatePassword(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoinStatus(null);

    const pwdErr = validatePassword(password);
    if (pwdErr) { setPasswordError(pwdErr); return; }
    setPasswordError(null);
    setLoading(true);

    // ── 1. Log what we received ───────────────────────────────────────
    console.log("[SignupForm] handleSubmit →", {
      email,
      inviteCode,
      groupName,
      hasInviteCode: !!inviteCode,
    });

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

    // ── 2. Log session state ──────────────────────────────────────────
    console.log("[SignupForm] signUp result →", {
      userId:           data.user?.id ?? null,
      sessionExists:    !!data.session,
      sessionToken:     data.session?.access_token
                          ? `${data.session.access_token.slice(0, 20)}...`
                          : null,
      emailConfirmNeeded: !data.session && !!data.user,
    });

    // ── Email confirmation required ───────────────────────────────────
    if (data.user && !data.session) {
      setEmailConfirmationNeeded(true);
      setLoading(false);
      return;
    }

    // ── Session present — try to auto-join ───────────────────────────
    if (data.session) {
      if (inviteCode) {
        console.log("[SignupForm] session OK, calling joinGroupAction with code:", inviteCode);
        setJoinStatus({ phase: "joining" });

        const fd = new FormData();
        fd.set("invite_code", inviteCode);
        const joinResult = await joinGroupAction(null, fd);

        // ── 3. Log the full join result ──────────────────────────────
        console.log("[SignupForm] joinGroupAction result →", JSON.stringify(joinResult, null, 2));

        if (joinResult && "error" in joinResult) {
          const status: JoinStatus = {
            phase:     "error",
            userMsg:   joinResult.error,
            devDetail: joinResult.devMessage,
          };
          setJoinStatus(status);
          setLoading(false);
          // DON'T redirect — show the error so the user can report it
          return;
        }

        if (joinResult && "success" in joinResult) {
          setJoinStatus({
            phase:     "success",
            groupName: joinResult.group?.name ?? groupName ?? "el grupo",
          });
          console.log("[SignupForm] join SUCCESS ✓, redirecting in 1.5s");
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 1500);
          return;
        }
      } else {
        // No invite code — plain signup
        router.push("/dashboard");
        router.refresh();
      }
    }

    setLoading(false);
  }

  // ── Email confirmation screen ────────────────────────────────────────
  if (emailConfirmationNeeded) {
    return <EmailConfirmationScreen email={email} inviteCode={inviteCode} />;
  }

  // ── Join status overlay ──────────────────────────────────────────────
  if (joinStatus) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <JoinStatusCard
          status={joinStatus}
          onContinue={() => { router.push("/dashboard"); router.refresh(); }}
          onRetry={() => setJoinStatus(null)}
        />
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#00c85a] flex items-center justify-center">
            <svg width="20" height="16" viewBox="0 0 18 14" fill="none">
              <path d="M1 1L5.5 12L9 5L12.5 12L17 1" stroke="#0a0a12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-xl text-[#f1f5f9]">
            La <span className="text-[#00c85a]">Penúltima</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Únete a La Penúltima</h1>
        <p className="text-sm text-[#64748b] mt-1">
          {inviteCode
            ? "Únete al grupo y deja tu penúltima palabra."
            : "Demuestra que sabes más fútbol que tus amigos."}
        </p>
      </div>

      {inviteCode && (
        <div className="mb-4 flex items-center gap-3 bg-[#00c85a]/8 border border-[#00c85a]/20 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c85a]/15 flex items-center justify-center shrink-0">
            <Hash size={14} className="text-[#00c85a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#64748b]">Te invitaron a jugar</p>
            <p className="text-sm font-bold text-[#f1f5f9] truncate">
              {groupName ?? "un grupo de La Penúltima"}
            </p>
          </div>
          <Badge variant="green">{inviteCode}</Badge>
        </div>
      )}

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre de usuario" type="text" placeholder="ej. goleador_9" value={username} onChange={(e) => setUsername(e.target.value)} leftIcon={<User size={16} />} hint="Así te van a ver tus amigos" required autoFocus />
          <Input label="Correo electrónico" type="email" placeholder="tú@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} required autoComplete="email" />
          <Input label="Contraseña" type="password" placeholder="Mín. 8 caracteres" value={password} onChange={(e) => handlePasswordChange(e.target.value)} leftIcon={<Lock size={16} />} error={passwordError ?? undefined} required autoComplete="new-password" minLength={8} />

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
          <span className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer">términos</span>.
        </p>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#64748b]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#00c85a] font-semibold hover:text-[#00e87a]">Ingresar</Link>
          </p>
        </div>
      </Card>

      {inviteCode && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a] animate-live-pulse" />
          <span className="text-xs font-mono text-[#00c85a] uppercase tracking-widest">Invitación validada</span>
        </div>
      )}
    </div>
  );
}

// ── Join status card ────────────────────────────────────────────────────

function JoinStatusCard({
  status,
  onContinue,
  onRetry,
}: {
  status: JoinStatus;
  onContinue: () => void;
  onRetry: () => void;
}) {
  if (status.phase === "joining") {
    return (
      <Card className="p-6 text-center">
        <Loader2 size={28} className="animate-spin text-[#00c85a] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#f1f5f9]">Uniéndote al grupo...</p>
      </Card>
    );
  }

  if (status.phase === "success") {
    return (
      <Card variant="glow-green" className="p-6 text-center">
        <CheckCircle2 size={28} className="text-[#00c85a] mx-auto mb-3" />
        <p className="text-base font-black text-[#f1f5f9] mb-1">¡Te uniste al grupo!</p>
        <p className="text-sm text-[#64748b] mb-5">{status.groupName}</p>
        <p className="text-xs text-[#475569]">Redirigiendo al dashboard...</p>
      </Card>
    );
  }

  // Error
  return (
    <Card className="p-6">
      <div className="flex items-start gap-2 mb-4">
        <AlertCircle size={18} className="text-[#ef4444] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#f1f5f9] mb-1">
            No se pudo unir al grupo
          </p>
          <p className="text-xs text-[#ef4444]">{status.userMsg}</p>
        </div>
      </div>

      {status.devDetail && (
        <div className="bg-[#0a0a12] border border-[#f59e0b]/30 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-[10px] text-[#f59e0b] font-mono uppercase tracking-widest mb-1">
            🔧 Error de desarrollo
          </p>
          <pre className="text-[10px] text-[#94a3b8] font-mono whitespace-pre-wrap break-all leading-relaxed">
            {status.devDetail}
          </pre>
        </div>
      )}

      <p className="text-xs text-[#475569] mb-4">
        Tu cuenta fue creada correctamente. Puedes intentar unirte de nuevo desde el dashboard.
      </p>

      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 h-9 text-xs font-semibold text-[#94a3b8] bg-[#20203a] border border-[#2a2a45] rounded-xl hover:text-[#f1f5f9] transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={onContinue}
          className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0a0a12] bg-[#00c85a] rounded-xl hover:bg-[#00e87a] transition-colors"
        >
          Ir al dashboard
          <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
}

// ── Email confirmation screen ────────────────────────────────────────────

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
      <h2 className="text-2xl font-black text-[#f1f5f9] mb-2">Revisa tu correo</h2>
      <p className="text-[#64748b] text-sm leading-relaxed mb-2">
        Te enviamos un enlace de confirmación a:
      </p>
      <p className="text-[#f1f5f9] font-semibold text-sm mb-6">{email}</p>
      <Card className="p-4 text-left">
        <p className="text-xs text-[#475569] leading-relaxed">
          Confirma tu correo para activar tu cuenta.
          {inviteCode && " Luego visita el enlace de invitación para unirte al grupo."}
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
        <Link href="/login" className="text-sm text-[#00c85a] font-semibold hover:text-[#00e87a]">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
