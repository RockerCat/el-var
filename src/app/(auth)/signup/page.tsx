"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, User, Hash } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // In production this would come from the URL: /signup?invite=abc123
  const inviteCode = "WC2026";
  const groupName = "The Offside Trap";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: Supabase auth + auto-join group
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
        <h1 className="text-2xl font-black text-[#f1f5f9]">Join the group</h1>
        <p className="text-sm text-[#64748b] mt-1">
          Create your account and start predicting
        </p>
      </div>

      {/* Group invite banner */}
      <div className="mb-4 flex items-center gap-3 bg-[#00c85a]/8 border border-[#00c85a]/20 rounded-xl p-3">
        <div className="w-8 h-8 rounded-lg bg-[#00c85a]/15 flex items-center justify-center shrink-0">
          <Hash size={14} className="text-[#00c85a]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#64748b]">You&apos;re invited to</p>
          <p className="text-sm font-bold text-[#f1f5f9] truncate">
            {groupName}
          </p>
        </div>
        <Badge variant="green">{inviteCode}</Badge>
      </div>

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            type="text"
            placeholder="e.g. goal_machine"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftIcon={<User size={16} />}
            hint="This is how your friends will see you"
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
            autoComplete="new-password"
            minLength={8}
          />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Create account & join
          </Button>
        </form>

        <p className="text-xs text-[#475569] text-center mt-4">
          By signing up you agree to our{" "}
          <span className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer">
            terms
          </span>
          .
        </p>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#64748b]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#00c85a] font-semibold hover:text-[#00e87a]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a] animate-live-pulse" />
        <span className="text-xs font-mono text-[#00c85a] uppercase tracking-widest">
          Invite validated
        </span>
      </div>
    </div>
  );
}
