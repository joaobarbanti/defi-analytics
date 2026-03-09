// 3D cluster centroids for major chains arranged in a galaxy spiral pattern
// Returns [x, y, z] in Three.js world units

export interface ClusterPosition {
  x: number
  y: number
  z: number
}

export const CHAIN_CLUSTERS: Record<string, ClusterPosition> = {
  Ethereum:  { x:  0,    y:  0,    z:  0    },
  Arbitrum:  { x:  8,    y:  2,    z: -4    },
  Optimism:  { x: -8,    y: -2,    z: -4    },
  Base:      { x:  5,    y: -6,    z:  6    },
  Polygon:   { x: -5,    y:  6,    z:  6    },
  Solana:    { x: 14,    y:  0,    z:  0    },
  Avalanche: { x: -14,   y:  0,    z:  0    },
  BSC:       { x:  0,    y: 10,    z: -10   },
  Fantom:    { x:  0,    y: -10,   z:  10   },
  Sui:       { x: 10,    y: -10,   z: -6    },
  Aptos:     { x: -10,   y:  10,   z: -6    },
  Tron:      { x: -4,    y: -8,    z: -12   },
  Near:      { x:  4,    y:  8,    z: -12   },
  Cosmos:    { x: 12,    y:  8,    z:  4    },
  Starknet:  { x: -12,   y: -8,    z:  4    },
  Scroll:    { x:  3,    y: -4,    z:  12   },
  zkSync:    { x: -3,    y:  4,    z:  12   },
  Linea:     { x:  7,    y:  4,    z:  8    },
  Mantle:    { x: -7,    y: -4,    z:  8    },
}

const FALLBACK_CLUSTER: ClusterPosition = { x: 0, y: 0, z: 0 }

export function getClusterPosition(chain: string): ClusterPosition {
  return CHAIN_CLUSTERS[chain] ?? FALLBACK_CLUSTER
}

// Random offset within a cluster radius so nodes don't stack exactly on top
export function clusterOffset(radius = 5): ClusterPosition {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = radius * Math.cbrt(Math.random())
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  }
}
