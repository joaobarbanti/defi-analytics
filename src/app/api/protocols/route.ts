import { NextResponse } from 'next/server'
import { fetchProtocols } from '@/lib/api/protocols'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchProtocols()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Failed to fetch protocols:', err)
    return NextResponse.json({ error: 'Failed to fetch protocols' }, { status: 500 })
  }
}
