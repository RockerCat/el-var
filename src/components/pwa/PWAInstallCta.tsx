"use client";

import { useState } from "react";
import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import IOSInstallModal from "./IOSInstallModal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface PWAInstallCtaProps {
  className?: string;
  fullWidth?: boolean;
  /** "button" = standalone CTA (login screen). "menu-item" = row inside the user dropdown. */
  variant?: "button" | "menu-item";
  /** Called right before the click is handled — e.g. to close the dropdown it lives in. */
  onTriggered?: () => void;
}

/**
 * Shared install CTA for the login screen and the authenticated user menu.
 * Centralizes platform-specific label + click behavior (native prompt on
 * Android, instructions modal on iOS Safari) so both surfaces stay in sync.
 * Renders nothing on iOS Chrome/unsupported, desktop, or standalone mode.
 */
export default function PWAInstallCta({
  className,
  fullWidth,
  variant = "button",
  onTriggered,
}: PWAInstallCtaProps) {
  const { platform, showInstallCta, promptInstall } = usePWAInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (!showInstallCta) return null;

  const label = platform === "android" ? "📲 Instalar App" : "📲 Agregar al inicio";

  async function handleClick() {
    onTriggered?.();
    if (platform === "android") {
      await promptInstall();
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      {variant === "menu-item" ? (
        <button
          onClick={handleClick}
          className={cn(
            "w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors",
            className
          )}
        >
          {label}
        </button>
      ) : (
        <Button type="button" variant="secondary" fullWidth={fullWidth} onClick={handleClick} className={className}>
          {label}
        </Button>
      )}

      <IOSInstallModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
