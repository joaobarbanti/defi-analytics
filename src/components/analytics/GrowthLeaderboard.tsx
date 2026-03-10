'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDefiStore } from '@/store/defi'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TvlSparkline } from '@/components/ui/TvlSparkline'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTVL, formatPct } from '@/lib/transforms/format'
import type { GrowthLeaderboardEntry, TVLPoint } from '@/types/analytics'

// Stable empty array — prevents a new reference on every render when analytics is null,
// which would cause Zustand's Object.is equality check to always fail and loop infinitely.
const EMPTY_ARRAY: GrowthLeaderboardEntry[] = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatAxisDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatTooltipDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-white/30">—</span>
  const positive = value > 0
  return (
    <span
      className={
        positive
          ? 'font-mono text-emerald-400'
          : value < 0
            ? 'font-mono text-red-400'
            : 'font-mono text-white/50'
      }
    >
      {formatPct(value)}
    </span>
  )
}

// ─── TVL History Modal ────────────────────────────────────────────────────────

interface TvlHistoryModalProps {
  entry: GrowthLeaderboardEntry
  onClose: () => void
}

function TvlHistoryModal({ entry, onClose }: TvlHistoryModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  // Fetch 90-day history; fall back to sparklinePoints if unavailable
  const { data, isLoading } = useSWR<{ slug: string; points: TVLPoint[] }>(
    `/api/protocol-history/${encodeURIComponent(entry.slug)}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const chartPoints: TVLPoint[] =
    data?.points && data.points.length > 0
      ? data.points
      : entry.sparklinePoints

  // Determine chart color based on 30d change
  const isPositive = (entry.change30d ?? 0) >= 0
  const strokeColor = isPositive ? '#34d399' : '#f87171'
  const fillId = isPositive ? 'tvlGradientGreen' : 'tvlGradientRed'
  const fillColor = isPositive ? '#34d399' : '#f87171'

  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  // Custom tooltip
  function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: TVLPoint }[] }) {
    if (!active || !payload?.length) return null
    const point = payload[0].payload
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl">
        <p className="text-[11px] text-white/40">{formatTooltipDate(point.date)}</p>
        <p className="text-sm font-bold text-white">{formatTVL(point.tvl)}</p>
      </div>
    )
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {entry.logo ? (
              <Image
                src={entry.logo}
                alt={entry.name}
                width={28}
                height={28}
                className="rounded-full shrink-0 object-cover"
                unoptimized
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/10 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{entry.name}</h3>
              <p className="text-[11px] text-white/40 truncate">{entry.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 border-b border-white/5 px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30">TVL</p>
            <p className="font-mono text-base font-bold text-white">{formatTVL(entry.tvl)}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30">7d</p>
            <p className="font-mono text-sm font-semibold">
              <ChangeCell value={entry.change7d} />
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30">30d</p>
            <p className="font-mono text-sm font-semibold">
              <ChangeCell value={entry.change30d} />
            </p>
          </div>
          {!entry.hasRealHistory && (
            <span className="ml-auto rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] text-yellow-400/70">
              30d estimated
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="px-5 py-4">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-white/30">
            TVL History {data?.points && data.points.length > 0 ? '(90d)' : '(30d)'}
          </p>

          {isLoading && chartPoints.length === 0 ? (
            <div className="h-[160px] animate-pulse rounded-lg bg-white/5" />
          ) : chartPoints.length === 0 ? (
            <div className="flex h-[160px] items-center justify-center rounded-lg border border-white/5 bg-white/[0.02]">
              <p className="text-sm text-white/30">No history available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={fillColor} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => formatTVL(v)}
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tvl"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  fill={`url(#${fillId})`}
                  dot={false}
                  activeDot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Top 15 fastest-growing protocols by 30-day TVL change.
 * Reads from the Zustand growthLeaderboard selector.
 * Clicking a row opens a TVL history modal.
 */
export function GrowthLeaderboard() {
  const entries = useDefiStore((s) => s.analytics?.growthLeaderboard ?? EMPTY_ARRAY)
  const loading = entries.length === 0

  const [selected, setSelected] = useState<GrowthLeaderboardEntry | null>(null)

  return (
    <section className="px-4 sm:px-8">
      <SectionHeader
        title="Growth Leaderboard"
        subtitle="Top 15 protocols by 30-day TVL change · click a row to view TVL history"
        trailing={
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40 uppercase tracking-widest">
            Live
          </span>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-widest text-white/30">
              <th className="px-4 py-3 w-8">#</th>
              <th className="px-4 py-3">Protocol</th>
              <th className="px-4 py-3 text-right">TVL</th>
              <th className="px-4 py-3 text-right">7d</th>
              <th className="px-4 py-3 text-right">30d</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={6} className="px-4 py-2">
                      <Skeleton className="h-7 w-full" />
                    </td>
                  </tr>
                ))
              : entries.map((entry, i) => (
                  <tr
                    key={entry.slug}
                    onClick={() => setSelected(entry)}
                    className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-4 py-2 text-white/30 text-xs">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.logo ? (
                          <Image
                            src={entry.logo}
                            alt={entry.name}
                            width={20}
                            height={20}
                            className="rounded-full shrink-0 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white/90">{entry.name}</p>
                          <p className="text-[10px] text-white/30 truncate">{entry.category}</p>
                        </div>
                        {!entry.hasRealHistory && (
                          <span
                            className="ml-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 text-[9px] text-yellow-400/70 shrink-0"
                            title="30d change is estimated from 7d data"
                          >
                            est
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white/70">
                      {formatTVL(entry.tvl)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChangeCell value={entry.change7d} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChangeCell value={entry.change30d} />
                    </td>
                    <td className="px-4 py-2 text-right hidden sm:table-cell">
                      <div className="flex justify-end">
                        <TvlSparkline
                          points={entry.sparklinePoints}
                          change={entry.change30d}
                          height={28}
                          width={64}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <TvlHistoryModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}
