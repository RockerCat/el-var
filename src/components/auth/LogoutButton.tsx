"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

interface LogoutButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export default function LogoutButton({ variant = "ghost" }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant={variant}
      size="sm"
      loading={loading}
      onClick={handleLogout}
    >
      <LogOut size={14} />
      Cerrar sesión
    </Button>
  );
}
