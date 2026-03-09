import { NextResponse } from 'next/server'
import { fetchWithRetry, API_URLS } from '@/lib/api/defillama'
import type { ProtocolDetail } from '@/types/defillama'

export const revalidate = 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const data = await fetchWithRetry<ProtocolDetail>(API_URLS.protocol(slug))
    return NextResponse.json(data)
  } catch (err) {
    console.error(`Failed to fetch protocol ${slug}:`, err)
    return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
  }
}
