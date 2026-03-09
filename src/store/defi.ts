import { create } from 'zustand'
import type { ProtocolNode, YieldNode } from '@/types/defillama'
import type {
  AnalyticsPayload,
  MarketAlert,
  InsightCard,
  MarketSentiment,
  ProtocolGrowthMetrics,
  LiquidityFlow,
  ChainDominance,
  StablecoinSummary,
} from '@/types/analytics'
import type { InvestorProfileType } from '@/types/risk'

interface FilterState {
  chain: string | null
  category: string | null
  minTVL: number
  searchQuery: string
}

interface DefiStore {
  // Selected protocol (clicked node in EcosystemCloud)
  selectedProtocol: ProtocolNode | null
  setSelectedProtocol: (protocol: ProtocolNode | null) => void

  // Selected yield pool (clicked node in TopAPYCloud)
  selectedPool: YieldNode | null
  setSelectedPool: (pool: YieldNode | null) => void

  // Hovered protocol (mouse over)
  hoveredProtocol: string | null
  setHoveredProtocol: (id: string | null) => void

  // Filters for the ranking table
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  resetFilters: () => void

  // UI state
  isPanelOpen: boolean
  setPanelOpen: (open: boolean) => void

  // ── Analytics state ──────────────────────────────────────────────────────
  analytics: AnalyticsPayload | null
  setAnalytics: (payload: AnalyticsPayload) => void

  // Dismissed alert IDs (persisted to localStorage)
  dismissedAlertIds: Set<string>
  dismissAlert: (id: string) => void
  loadDismissedAlerts: () => void

  // Alert panel open state
  isAlertPanelOpen: boolean
  setAlertPanelOpen: (open: boolean) => void

  // ── Investor profile filter ───────────────────────────────────────────────
  // Set by PoolIntelligenceOverview "View all pools" button; read by YieldOpportunities
  profileFilter: InvestorProfileType | null
  setProfileFilter: (profile: InvestorProfileType | null) => void

  // Convenience selectors
  activeAlerts: () => MarketAlert[]
  insights: () => InsightCard[]
  sentiment: () => MarketSentiment | null
  growthMetrics: () => Record<string, ProtocolGrowthMetrics>
  flows: () => LiquidityFlow[]
  chainDominance: () => ChainDominance[]
  stablecoinSummary: () => StablecoinSummary | null
}

const defaultFilters: FilterState = {
  chain: null,
  category: null,
  minTVL: 0,
  searchQuery: '',
}

const DISMISSED_KEY = 'defiscope_dismissed_alerts'

export const useDefiStore = create<DefiStore>((set, get) => ({
  selectedProtocol: null,
  setSelectedProtocol: (protocol) =>
    set({ selectedProtocol: protocol, selectedPool: null, isPanelOpen: protocol !== null }),

  selectedPool: null,
  setSelectedPool: (pool) =>
    set({ selectedPool: pool, selectedProtocol: null, isPanelOpen: pool !== null }),

  hoveredProtocol: null,
  setHoveredProtocol: (id) => set({ hoveredProtocol: id }),

  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  isPanelOpen: false,
  setPanelOpen: (open) => set({ isPanelOpen: open }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: null,
  setAnalytics: (payload) => set({ analytics: payload }),

  dismissedAlertIds: new Set(),
  dismissAlert: (id) => {
    const next = new Set(get().dismissedAlertIds)
    next.add(id)
    set({ dismissedAlertIds: next })
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)))
    } catch {
      // localStorage unavailable (SSR / private browsing)
    }
  },
  loadDismissedAlerts: () => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      if (raw) {
        const ids: string[] = JSON.parse(raw)
        set({ dismissedAlertIds: new Set(ids) })
      }
    } catch {
      // ignore
    }
  },

  isAlertPanelOpen: false,
  setAlertPanelOpen: (open) => set({ isAlertPanelOpen: open }),

  // ── Investor profile filter ───────────────────────────────────────────────
  profileFilter: null,
  setProfileFilter: (profile) => set({ profileFilter: profile }),

  // Selectors
  activeAlerts: () => {
    const { analytics, dismissedAlertIds } = get()
    if (!analytics) return []
    return analytics.alerts.filter((a) => !dismissedAlertIds.has(a.id))
  },
  insights: () => get().analytics?.insights ?? [],
  sentiment: () => get().analytics?.sentiment ?? null,
  growthMetrics: () => get().analytics?.growthMetrics ?? {},
  flows: () => get().analytics?.flows ?? [],
  chainDominance: () => get().analytics?.chainDominance ?? [],
  stablecoinSummary: () => get().analytics?.stablecoinSummary ?? null,
}))
