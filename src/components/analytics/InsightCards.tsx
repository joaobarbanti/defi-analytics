'use client'

import { useDefiStore } from '@/store/defi'
import type { InsightCategory } from '@/types/analytics'

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  InsightCategory,
  { icon: string; accent: string; bg: string }
> = {
  chain:      { icon: '⛓', accent: 'text-blue-400',    bg: 'border-blue-500/20 bg-blue-500/5' },
  protocol:   { icon: '📊', accent: 'text-violet-400',  bg: 'border-violet-500/20 bg-violet-500/5' },
  stablecoin: { icon: '💵', accent: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/5' },
  liquidity:  { icon: '💧', accent: 'text-cyan-400',    bg: 'border-cyan-500/20 bg-cyan-500/5' },
  sentiment:  { icon: '📈', accent: 'text-amber-400',   bg: 'border-amber-500/20 bg-amber-500/5' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InsightCards() {
  const analytics = useDefiStore((s) => s.analytics)
  const insights = analytics?.insights ?? []

  if (!insights.length) return null

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Market Intelligence</h2>
        <p className="text-sm text-white/40">
          AI-generated insights · Updated every 2 minutes
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {insights.map((card) => {
          const cfg = CATEGORY_CONFIG[card.category] ?? CATEGORY_CONFIG.protocol
          return (
            <div
              key={card.id}
              className={`animate-fade-up glass-card rounded-xl border p-4 transition-all hover:brightness-110 ${cfg.bg}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">{cfg.icon}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.accent}`}>
                  {card.category}
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white">
                {card.headline}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                {card.detail}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
