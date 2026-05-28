import { Trophy, Users, Target, Zap } from "lucide-react";
import Card from "@/components/ui/Card";

const features = [
  {
    icon: Users,
    color: "#00c85a",
    title: "Private Groups",
    description:
      "Create closed groups and invite your friends via a unique link. Your predictions stay among your crew.",
  },
  {
    icon: Target,
    color: "#3b82f6",
    title: "Score Predictions",
    description:
      "Predict the exact score of every match. Exact scores earn more points — precision is rewarded.",
  },
  {
    icon: Trophy,
    color: "#f59e0b",
    title: "Live Leaderboards",
    description:
      "Watch the rankings shift in real time as match results come in. Every goal changes everything.",
  },
  {
    icon: Zap,
    color: "#ef4444",
    title: "VAR Moments",
    description:
      'Controversial calls, dramatic reversals — El VAR tracks them all. "Under review" never felt this fun.',
  },
];

export default function Features() {
  return (
    <section className="px-4 py-20 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xs font-mono text-[#00c85a] uppercase tracking-widest mb-3">
          How it works
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-[#f1f5f9] mb-3">
          Built for the 90 minutes
        </h2>
        <p className="text-[#64748b] max-w-md mx-auto">
          Everything you need to run a World Cup prediction group — nothing you
          don&apos;t.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      {/* Scoring breakdown */}
      <div className="mt-16">
        <ScoringBreakdown />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  description,
}: (typeof features)[0]) {
  return (
    <Card className="p-6 hover:border-[#2a2a45]/80 transition-all duration-200 group hover:-translate-y-0.5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} style={{ color }} strokeWidth={1.8} />
      </div>
      <h3 className="font-bold text-[#f1f5f9] mb-2">{title}</h3>
      <p className="text-sm text-[#64748b] leading-relaxed">{description}</p>
    </Card>
  );
}

function ScoringBreakdown() {
  const tiers = [
    {
      label: "Exact score",
      points: "+10",
      example: "Predicted 2–1, result 2–1",
      color: "#fbbf24",
      badge: "⚡",
    },
    {
      label: "Correct winner + goal diff",
      points: "+7",
      example: "Predicted 3–1, result 2–0",
      color: "#00c85a",
      badge: "✓",
    },
    {
      label: "Correct winner",
      points: "+5",
      example: "Predicted 1–0, result 3–1",
      color: "#3b82f6",
      badge: "→",
    },
    {
      label: "Correct draw",
      points: "+5",
      example: "Predicted 1–1, result 0–0",
      color: "#94a3b8",
      badge: "≈",
    },
    {
      label: "Wrong prediction",
      points: "+0",
      example: "Predicted win, result loss",
      color: "#475569",
      badge: "✗",
    },
  ];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          Scoring system
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-[#1e1e35] last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm" style={{ color: tier.color }}>
                {tier.badge}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#94a3b8] truncate">
                  {tier.label}
                </p>
                <p className="text-xs text-[#475569]">{tier.example}</p>
              </div>
            </div>
            <span
              className="text-sm font-bold tabular-nums shrink-0"
              style={{ color: tier.color }}
            >
              {tier.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
