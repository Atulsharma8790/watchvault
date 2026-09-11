import { NextRequest, NextResponse } from 'next/server'
import { tmdbMetadataProvider, tmdbAvailabilityProvider, deriveAvailabilityStatus } from '@/lib/providers/tmdb'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tmdbId = parseInt(id)
  const type = req.nextUrl.searchParams.get('type') as 'movie' | 'series' | null
  const region = req.nextUrl.searchParams.get('region') ?? 'IN'

  if (!tmdbId || isNaN(tmdbId) || (type !== 'movie' && type !== 'series')) {
    return NextResponse.json({ error: 'Invalid id or type' }, { status: 400 })
  }

  try {
    const [metadata, availability] = await Promise.all([
      tmdbMetadataProvider.getMetadata(tmdbId, type),
      tmdbAvailabilityProvider.getAvailability(tmdbId, type, region),
    ])

    const enriched = {
      ...metadata,
      availability,
      availabilityStatus: deriveAvailabilityStatus(availability),
      lastAvailabilityCheckedAt: new Date().toISOString(),
    }

    return NextResponse.json({ metadata: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Metadata fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
