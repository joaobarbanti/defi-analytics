import { NextResponse } from 'next/server'
import { fetchStablecoins } from '@/lib/api/stablecoins'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchStablecoins()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Failed to fetch stablecoins:', err)
    return NextResponse.json({ error: 'Failed to fetch stablecoins' }, { status: 500 })
  }
}
