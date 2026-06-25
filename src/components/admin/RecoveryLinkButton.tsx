"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import GroupModal from "@/components/groups/GroupModal";
import Button from "@/components/ui/Button";
import { generateRecoveryLinkAction, type RecoveryLinkState } from "@/app/actions/admin";

type Step = "idle" | "confirm" | "result";

export default function RecoveryLinkButton({
  userId,
  userEmail,
  userName,
}: {
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] =
    useActionState<RecoveryLinkState, FormData>(generateRecoveryLinkAction, null);

  // Only move to the result view in response to a fresh submission —
  // re-opening the modal later must not show a stale previous result.
  useEffect(() => {
    if (state && "success" in state) setStep("result");
  }, [state]);

  function close() {
    setStep("idle");
    setCopied(false);
  }

  async function handleCopy(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const result = state && "success" in state ? state : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("confirm")}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#3b3b60] transition-colors"
      >
        <KeyRound size={12} /> Generar enlace
      </button>

      <GroupModal
        open={step !== "idle"}
        onClose={close}
        title={step === "result" ? "Enlace de recuperación" : "Generar enlace de recuperación"}
      >
        {step === "confirm" && (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="user_email" value={userEmail} />
            <input type="hidden" name="user_name" value={userName} />

            <p className="text-sm text-[#94a3b8]">
              Se generará un enlace de un solo uso para que{" "}
              <strong className="text-[#f1f5f9]">{userName}</strong> defina una nueva contraseña.
              Envíaselo manualmente (WhatsApp, correo, etc).
            </p>

            {state && "error" in state && (
              <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-xs text-[#ef4444]">{state.error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" fullWidth onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" fullWidth loading={pending}>
                Confirmar y generar
              </Button>
            </div>
          </form>
        )}

        {step === "result" && result && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#94a3b8]">
              Enlace generado para <strong className="text-[#f1f5f9]">{result.userName}</strong>.
            </p>

            <div className="bg-[#0a0a12] border border-[#1e1e35] rounded-xl px-3 py-2.5">
              <p className="text-xs text-[#f1f5f9] font-mono break-all">{result.link}</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => handleCopy(result.link)}
              >
                {copied ? (
                  <><Check size={14} className="text-[#00c85a]" /> ¡Copiado!</>
                ) : (
                  <><Copy size={14} /> Copiar</>
                )}
              </Button>
              <a href={result.link} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="secondary">
                  <ExternalLink size={14} />
                </Button>
              </a>
            </div>

            <p className="text-[10px] text-[#64748b] leading-relaxed">
              Este enlace es de un solo uso y expira automáticamente según la configuración de
              Supabase. No lo compartas en canales públicos.
            </p>

            <Button type="button" variant="ghost" fullWidth onClick={close}>
              Cerrar
            </Button>
          </div>
        )}
      </GroupModal>
    </>
  );
}
