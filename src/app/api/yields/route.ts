import { NextResponse } from 'next/server'
import { fetchYields } from '@/lib/api/yields'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchYields()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Failed to fetch yields:', err)
    return NextResponse.json([], { status: 200 }) // graceful degradation
  }
}
