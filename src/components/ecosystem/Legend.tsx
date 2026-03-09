'use client'

import { Html } from '@react-three/drei'
import { CHAIN_CLUSTERS } from '@/lib/graph/clusterLayout'
import { CATEGORY_COLORS } from '@/lib/transforms/normalizeProtocol'

// ── Protocol ecosystem legend (used in EcosystemCloud) ────────────────────────

export function Legend() {
  const chains = Object.keys(CHAIN_CLUSTERS).slice(0, 8)
  const categories = Object.entries(CATEGORY_COLORS)
    .filter(([k]) => k !== 'Default')
    .slice(0, 10)

  return (
    <Html
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        pointerEvents: 'none',
      }}
      prepend
    >
      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
          Categories
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {categories.map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-white/60">{cat}</span>
            </div>
          ))}
        </div>
        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          Clusters
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {chains.map((chain) => (
            <span key={chain} className="text-xs text-white/50">
              {chain}
            </span>
          ))}
        </div>
      </div>
    </Html>
  )
}

// ── APY tier legend (used in TopAPYCloud) ─────────────────────────────────────

const APY_TIERS = [
  { label: 'Ultra High', range: '≥ 100%', color: '#f43f5e' },
  { label: 'Very High',  range: '50–100%', color: '#f97316' },
  { label: 'High',       range: '20–50%', color: '#eab308' },
  { label: 'Medium',     range: '10–20%', color: '#10b981' },
  { label: 'Moderate',   range: '5–10%', color: '#06b6d4' },
  { label: 'Low',        range: '< 5%', color: '#6366f1' },
]

export function APYLegend() {
  return (
    <Html
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        pointerEvents: 'none',
      }}
      prepend
    >
      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur-sm min-w-[170px]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
          APY Tiers
        </p>
        <div className="space-y-1.5">
          {APY_TIERS.map((tier) => (
            <div key={tier.label} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tier.color, boxShadow: `0 0 6px ${tier.color}` }}
              />
              <span className="text-xs text-white/70 flex-1">{tier.label}</span>
              <span className="text-xs text-white/35">{tier.range}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-white/10 pt-2.5 space-y-1">
          <p className="text-xs text-white/30">Bubble size ∝ APY magnitude</p>
          <p className="text-xs text-white/30">Click bubble to inspect pool</p>
        </div>
      </div>
    </Html>
  )
}
