'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import type { ProtocolNode } from '@/types/defillama'
import { CHAIN_CLUSTERS } from '@/lib/graph/clusterLayout'

interface EdgeLinesProps {
  nodes: ProtocolNode[]
}

export function EdgeLines({ nodes }: EdgeLinesProps) {
  const ref = useRef<THREE.LineSegments>(null)

  const { positions } = useMemo(() => {
    // Group nodes by chain and connect within cluster
    const chainGroups: Record<string, ProtocolNode[]> = {}
    for (const node of nodes) {
      const chain = node.primaryChain
      if (!chainGroups[chain]) chainGroups[chain] = []
      chainGroups[chain].push(node)
    }

    const lines: number[] = []
    for (const chain of Object.keys(chainGroups)) {
      const cluster = CHAIN_CLUSTERS[chain]
      if (!cluster) continue
      const members = chainGroups[chain].slice(0, 15) // limit lines per cluster
      for (const node of members) {
        // Line from node to cluster centroid
        lines.push(node.x, node.y, node.z)
        lines.push(cluster.x, cluster.y, cluster.z)
      }
    }

    return { positions: new Float32Array(lines) }
  }, [nodes])

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#334155"
        transparent
        opacity={0.25}
        fog={false}
      />
    </lineSegments>
  )
}
