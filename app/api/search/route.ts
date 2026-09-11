import { NextRequest, NextResponse } from 'next/server'
import { tmdbMetadataProvider } from '@/lib/providers/tmdb'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }
  try {
    const results = await tmdbMetadataProvider.search(query)
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message, results: [] }, { status: 500 })
  }
}
