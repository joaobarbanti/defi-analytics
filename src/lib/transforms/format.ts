// Format large numbers to human-readable strings
export function formatTVL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

export function formatAPY(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value.toFixed(2)}%`
}

export function formatChange(value: number | null | undefined): {
  text: string
  positive: boolean
} {
  if (value == null || isNaN(value)) return { text: 'N/A', positive: true }
  const positive = value >= 0
  return {
    text: `${positive ? '+' : ''}${value.toFixed(2)}%`,
    positive,
  }
}
