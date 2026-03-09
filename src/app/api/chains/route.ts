import { NextResponse } from 'next/server'
import { fetchChains } from '@/lib/api/chains'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchChains()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Failed to fetch chains:', err)
    return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 })
  }
}
