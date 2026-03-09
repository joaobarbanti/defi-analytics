// Pool Intelligence — Indicator Engine
import type { ClassifiedPool } from '@/types/risk'
import type { PoolFlag, PoolIndicator, PoolIntelligenceReport, InvestorProfile, InvestorProfileType } from '@/types/risk'

const T = {
  STABLE_SAFE_MIN_TVL: 5_000_000,
  STABLE_SAFE_MIN_APY: 2,
  STABLE_SAFE_MAX_APY: 25,
  SUSPICIOUS_LOW_TVL: 500_000,
  SUSPICIOUS_EXTREME_APY: 200,
  SUSPICIOUS_REWARD_RATIO: 0.8,
  SUSPICIOUS_APY_CRASH: 0.5,
  TRANSIENT_MIN_REWARD: 5,
  TRANSIENT_MIN_TVL: 2_000_000,
} as const

const SUSPICIOUS_FLAGS: PoolFlag[] = ['reward_driven', 'low_tvl', 'extreme_apy', 'apy_crash']

function flagPool(pool: ClassifiedPool): PoolFlag[] {
  const flags: PoolFlag[] = []
  const rewardRatio = pool.apy > 0 && pool.apyReward != null ? pool.apyReward / pool.apy : 0
  if (pool.riskLevel === 'low' && pool.stablecoin && pool.tvlUsd >= T.STABLE_SAFE_MIN_TVL && pool.apy >= T.STABLE_SAFE_MIN_APY && pool.apy <= T.STABLE_SAFE_MAX_APY && pool.ilRisk !== 'yes') flags.push('stable_safe')
  if (rewardRatio > T.SUSPICIOUS_REWARD_RATIO) flags.push('reward_driven')
  if (pool.tvlUsd < T.SUSPICIOUS_LOW_TVL) flags.push('low_tvl')
  if (pool.apy > T.SUSPICIOUS_EXTREME_APY) flags.push('extreme_apy')
  if (pool.apyPct7D != null && pool.apyPct7D < -(T.SUSPICIOUS_APY_CRASH * 100)) flags.push('apy_crash')
  if (pool.apyReward != null && pool.apyReward > T.TRANSIENT_MIN_REWARD && pool.tvlUsd >= T.TRANSIENT_MIN_TVL && pool.riskLevel !== 'high') flags.push('transient')
  if (pool.category === 'liquid-staking') flags.push('lst')
  return flags
}

function computeConfidenceScore(pools: PoolIndicator[], profileType: InvestorProfileType): number {
  if (pools.length === 0) return 0
  let score = 50
  score += Math.min(30, pools.length * 10)
  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0)
  if (totalTvl > 1_000_000_000) score += 10
  const avgApy = pools.reduce((s, p) => s + p.apy, 0) / pools.length
  if (profileType === 'conservative' && avgApy >= 2 && avgApy <= 25) score += 10
  if (profileType === 'moderate' && avgApy >= 5 && avgApy <= 60) score += 10
  if (profileType === 'aggressive' && avgApy > 25 && avgApy <= 200) score += 10
  return Math.min(100, Math.max(0, score))
}

function buildConservativeProfile(indicators: PoolIndicator[]): InvestorProfile {
  const pools = indicators
    .filter((p) => p.flags.includes('stable_safe') && !SUSPICIOUS_FLAGS.some((f) => p.flags.includes(f)))
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
  const avgApy = pools.length > 0 ? pools.reduce((s, p) => s + p.apy, 0) / pools.length : 0
  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0)
  const reasons: string[] = []
  if (pools.length > 0) reasons.push(`${pools.length} stablecoin pool${pools.length !== 1 ? 's' : ''} with $5M+ TVL and 2-25% APY range`)
  if (avgApy > 0) reasons.push(`Average APY ${avgApy.toFixed(1)}% - above T-bill rates with minimal impermanent loss exposure`)
  const baseYieldPools = pools.filter((p) => !p.flags.includes('reward_driven'))
  if (baseYieldPools.length > 0) reasons.push(`${baseYieldPools.length} pool${baseYieldPools.length !== 1 ? 's' : ''} with base-only yield - no dependency on reward token inflation`)
  if (totalTvl > 1e9) reasons.push(`$${(totalTvl / 1e9).toFixed(1)}B total TVL - deep liquidity across qualifying pools`)
  const riskWarnings: string[] = []
  if (pools.length < 3) riskWarnings.push('Fewer than 3 qualifying stablecoin pools available - diversification is limited')
  return { type: 'conservative', label: 'Conservative', poolCount: pools.length, avgApy, totalTvl, reasons, topPools: pools.slice(0, 3), confidenceScore: computeConfidenceScore(pools, 'conservative'), riskWarnings }
}

function buildModerateProfile(indicators: PoolIndicator[]): InvestorProfile {
  const pools = indicators
    .filter((p) => (p.flags.includes('lst') || p.flags.includes('transient')) && !p.flags.includes('extreme_apy') && !p.flags.includes('low_tvl'))
    .sort((a, b) => b.apy - a.apy)
  const avgApy = pools.length > 0 ? pools.reduce((s, p) => s + p.apy, 0) / pools.length : 0
  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0)
  const lstCount = pools.filter((p) => p.flags.includes('lst')).length
  const transientCount = pools.filter((p) => p.flags.includes('transient')).length
  const reasons: string[] = []
  if (lstCount > 0) reasons.push(`${lstCount} liquid staking pool${lstCount !== 1 ? 's' : ''} - ETH/BTC yield with protocol-level security`)
  if (transientCount > 0) reasons.push(`${transientCount} incentivised pool${transientCount !== 1 ? 's' : ''} with $2M+ TVL - active liquidity mining window`)
  if (avgApy > 0) reasons.push(`Average APY ${avgApy.toFixed(1)}% - enhanced yield relative to conservative tier`)
  if (pools.length > 0 && pools.every((p) => p.tvlUsd >= T.TRANSIENT_MIN_TVL)) reasons.push('All pools exceed $2M TVL liquidity threshold - entry/exit risk is low')
  const riskWarnings: string[] = []
  if (transientCount > lstCount && transientCount > 0) riskWarnings.push('Profile is primarily incentive-driven - reward windows may close without notice')
  return { type: 'moderate', label: 'Moderate', poolCount: pools.length, avgApy, totalTvl, reasons, topPools: pools.slice(0, 3), confidenceScore: computeConfidenceScore(pools, 'moderate'), riskWarnings }
}

function buildAggressiveProfile(indicators: PoolIndicator[]): InvestorProfile {
  const pools = indicators
    .filter((p) => p.apy > T.STABLE_SAFE_MAX_APY && p.apy <= T.SUSPICIOUS_EXTREME_APY && !p.flags.includes('low_tvl') && !p.flags.includes('apy_crash'))
    .sort((a, b) => b.apy - a.apy)
  const avgApy = pools.length > 0 ? pools.reduce((s, p) => s + p.apy, 0) / pools.length : 0
  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0)
  const rewardDriven = pools.filter((p) => p.flags.includes('reward_driven')).length
  const reasons: string[] = []
  if (pools.length > 0) reasons.push(`${pools.length} high-APY pool${pools.length !== 1 ? 's' : ''} in 25-200% range with $500k+ TVL`)
  if (avgApy > 0) reasons.push(`Average APY ${avgApy.toFixed(1)}% - maximum yield-seeking with active position management required`)
  if (rewardDriven > 0) reasons.push(`${rewardDriven} reward-incentivised pool${rewardDriven !== 1 ? 's' : ''} - monitor incentive schedules closely`)
  if (pools.filter((p) => !p.flags.includes('apy_crash')).length === pools.length && pools.length > 0) reasons.push('No pools with recent APY crashes included - momentum is currently intact')
  const riskWarnings: string[] = []
  if (rewardDriven > pools.length * 0.5 && rewardDriven > 0) riskWarnings.push(`${rewardDriven} of ${pools.length} pools are >80% reward-driven - yields are structurally fragile`)
  if (avgApy > 100) riskWarnings.push(`Average APY of ${avgApy.toFixed(0)}% is unsustainable at scale - positions require frequent review`)
  return { type: 'aggressive', label: 'Aggressive', poolCount: pools.length, avgApy, totalTvl, reasons, topPools: pools.slice(0, 3), confidenceScore: computeConfidenceScore(pools, 'aggressive'), riskWarnings }
}

export function computePoolIntelligence(classifiedPools: ClassifiedPool[]): PoolIntelligenceReport {
  const total = classifiedPools.length
  if (total === 0) {
    const emptyProfile = (type: InvestorProfileType, label: string): InvestorProfile => ({
      type, label, poolCount: 0, avgApy: 0, totalTvl: 0, reasons: [], topPools: [], confidenceScore: 0, riskWarnings: [],
    })
    return {
      totalAnalyzed: 0, stableSafeCount: 0, suspiciousCount: 0, transientCount: 0, lstCount: 0,
      pctSafe: 0, pctSuspicious: 0, pctRewardOnly: 0, pctTransient: 0, pctLst: 0,
      profiles: {
        conservative: emptyProfile('conservative', 'Conservative'),
        moderate: emptyProfile('moderate', 'Moderate'),
        aggressive: emptyProfile('aggressive', 'Aggressive'),
      },
      generatedAt: Date.now(),
    }
  }
  const indicators: PoolIndicator[] = classifiedPools.map((pool) => ({
    poolId: pool.pool, symbol: pool.symbol, project: pool.project, chain: pool.chain, flags: flagPool(pool), apy: pool.apy, tvlUsd: pool.tvlUsd,
  }))
  const stableSafeCount = indicators.filter((p) => p.flags.includes('stable_safe')).length
  // A pool is suspicious only if it carries 2+ suspicious flags.
  // A single flag (e.g. reward_driven alone) does not constitute a suspicious pool.
  const suspiciousCount = indicators.filter(
    (p) => SUSPICIOUS_FLAGS.filter((f) => p.flags.includes(f)).length >= 2
  ).length
  const transientCount = indicators.filter((p) => p.flags.includes('transient')).length
  const lstCount = indicators.filter((p) => p.flags.includes('lst')).length
  const rewardOnlyCount = indicators.filter((p) => p.flags.includes('reward_driven')).length

  return {
    totalAnalyzed: total,
    stableSafeCount,
    suspiciousCount,
    transientCount,
    lstCount,
    pctSafe: stableSafeCount / total,
    pctSuspicious: suspiciousCount / total,
    pctRewardOnly: rewardOnlyCount / total,
    pctTransient: transientCount / total,
    pctLst: lstCount / total,
    profiles: {
      conservative: buildConservativeProfile(indicators),
      moderate: buildModerateProfile(indicators),
      aggressive: buildAggressiveProfile(indicators),
    },
    generatedAt: Date.now(),
  }
}
