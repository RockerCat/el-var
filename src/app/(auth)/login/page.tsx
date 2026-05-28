"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: Supabase auth
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
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
        <h1 className="text-2xl font-black text-[#f1f5f9]">Welcome back</h1>
        <p className="text-sm text-[#64748b] mt-1">
          Sign in to your prediction group
        </p>
      </div>

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
            autoFocus
          />
          <Input
            label="Password"
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
              Forgot password?
            </button>
          </div>

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#64748b]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#00c85a] font-semibold hover:text-[#00e87a]"
            >
              Join via invite
            </Link>
          </p>
        </div>
      </Card>

      {/* VAR review label */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          Identity check in progress
        </span>
      </div>
    </div>
  );
}
