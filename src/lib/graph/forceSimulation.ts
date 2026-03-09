import type { ProtocolNode } from '@/types/defillama'
import { getClusterPosition, clusterOffset } from './clusterLayout'

// Initialize node positions based on their primary chain cluster
export function initializeNodePositions(nodes: ProtocolNode[]): ProtocolNode[] {
  return nodes.map((node) => {
    const cluster = getClusterPosition(node.primaryChain)
    const offset = clusterOffset(4)
    return {
      ...node,
      x: cluster.x + offset.x,
      y: cluster.y + offset.y,
      z: cluster.z + offset.z,
      vx: 0,
      vy: 0,
      vz: 0,
    }
  })
}

// Simple 3D force simulation tick (runs in animation loop)
// Returns new positions without mutating input
export function simulationTick(
  nodes: ProtocolNode[],
  options: {
    repulsionStrength?: number
    clusterStrength?: number
    damping?: number
    maxVelocity?: number
  } = {}
): ProtocolNode[] {
  const {
    repulsionStrength = 0.05,
    clusterStrength = 0.01,
    damping = 0.92,
    maxVelocity = 0.3,
  } = options

  // Copy nodes
  const next = nodes.map((n) => ({ ...n }))

  // Cluster attraction — pull toward chain centroid
  for (const node of next) {
    const target = getClusterPosition(node.primaryChain)
    node.vx += (target.x - node.x) * clusterStrength
    node.vy += (target.y - node.y) * clusterStrength
    node.vz += (target.z - node.z) * clusterStrength
  }

  // Repulsion between all node pairs (O(n²) — limited by top 300 cap)
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i]
      const b = next[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      const distSq = dx * dx + dy * dy + dz * dz + 0.01
      const minDist = a.radius + b.radius + 0.5
      if (distSq < minDist * minDist) {
        const force = repulsionStrength / distSq
        a.vx += dx * force
        a.vy += dy * force
        a.vz += dz * force
        b.vx -= dx * force
        b.vy -= dy * force
        b.vz -= dz * force
      }
    }
  }

  // Apply damping and velocity cap, then integrate position
  for (const node of next) {
    node.vx = Math.max(-maxVelocity, Math.min(maxVelocity, node.vx * damping))
    node.vy = Math.max(-maxVelocity, Math.min(maxVelocity, node.vy * damping))
    node.vz = Math.max(-maxVelocity, Math.min(maxVelocity, node.vz * damping))
    node.x += node.vx
    node.y += node.vy
    node.z += node.vz
  }

  return next
}
