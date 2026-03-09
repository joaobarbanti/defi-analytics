import { create } from 'zustand'
import type { ProtocolNode, YieldNode } from '@/types/defillama'

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
}

const defaultFilters: FilterState = {
  chain: null,
  category: null,
  minTVL: 0,
  searchQuery: '',
}

export const useDefiStore = create<DefiStore>((set) => ({
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
}))
