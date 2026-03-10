// Format large numbers to human-readable strings

/**
 * Format a TVL / market-cap value.
 *
 * Precision rules (keeps displays uncluttered):
 *   >= 1T    -> 1 decimal   "$1.2T"
 *   >= 1B    -> 1 decimal   "$4.5B"
 *   >= 100M  -> 0 decimals  "$420M"
 *   >= 1M    -> 1 decimal   "$12.3M"
 *   >= 1K    -> 1 decimal   "$456.7K"
 *   < 1K     -> 0 decimals  "$123"
 */
export function formatTVL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e8)  return `$${(value / 1e6).toFixed(0)}M`
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3)  return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function formatAPY(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value.toFixed(2)}%`
}

/**
 * Format a % change with sign prefix, for coloured table cells.
 * Returns both the display string and a boolean for color decisions.
 * Uses 1 decimal place to match formatPct defaults.
 */
export function formatChange(value: number | null | undefined): {
  text: string
  positive: boolean
} {
  if (value == null || isNaN(value)) return { text: 'N/A', positive: true }
  const positive = value >= 0
  return {
    text: `${positive ? '+' : ''}${value.toFixed(1)}%`,
    positive,
  }
}

/**
 * Format a signed dollar flow amount.
 *
 * Examples:
 *   formatFlow(1_500_000_000)           -> "+$1.5B"
 *   formatFlow(-420_000_000)            -> "-$420M"
 *   formatFlow(1_500_000_000, { signed: false }) -> "$1.5B"
 *
 * Precision: billions -> 1 decimal, millions -> 0 decimals, sub-million -> 0 decimals.
 */
export function formatFlow(
  value: number | null | undefined,
  opts: { signed?: boolean } = {},
): string {
  if (value == null || isNaN(value)) return 'N/A'
  const { signed = true } = opts
  const abs = Math.abs(value)
  const sign = signed ? (value >= 0 ? '+' : '-') : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  return `${sign}$${abs.toFixed(0)}`
}

/**
 * Format a percentage with optional sign prefix.
 *
 * Compact notation kicks in for large values to keep tables readable:
 *   >= 10,000%  -> "+10K%"
 *   >= 1,000%   -> "+1.2K%"
 *   otherwise   -> "+12.5%"
 *
 * Examples:
 *   formatPct(12.5)                        -> "+12.5%"
 *   formatPct(-3.2)                        -> "-3.2%"
 *   formatPct(75, { signed: false })       -> "75%"
 *   formatPct(75, { decimals: 0 })         -> "+75%"
 *   formatPct(1500)                        -> "+1.5K%"
 *   formatPct(null)                        -> "-"
 *
 * Defaults: 1 decimal place, signed = true.
 */
export function formatPct(
  value: number | null | undefined,
  opts: { decimals?: number; signed?: boolean } = {},
): string {
  if (value == null || isNaN(value)) return '-'
  const { decimals = 1, signed = true } = opts
  const sign = signed ? (value > 0 ? '+' : '') : ''
  const abs = Math.abs(value)
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)}K%`
  if (abs >= 1_000)  return `${sign}${(abs / 1000).toFixed(1)}K%`
  return `${sign}${value.toFixed(decimals)}%`
}
