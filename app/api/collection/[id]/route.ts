import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

async function tmdbFetch(path: string) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const data = await tmdbFetch(`/collection/${id}`)
    const parts = (data.parts ?? [])
      .sort((a: { release_date?: string }, b: { release_date?: string }) =>
        (a.release_date ?? '').localeCompare(b.release_date ?? '')
      )
      .map((p: { id: number; title: string; release_date?: string; vote_average?: number; poster_path?: string; overview?: string }) => ({
        tmdbId: p.id,
        title: p.title,
        releaseYear: p.release_date ? parseInt(p.release_date.slice(0, 4)) : null,
        rating: p.vote_average ? Math.round(p.vote_average * 10) / 10 : null,
        poster: p.poster_path ? `${POSTER_BASE}${p.poster_path}` : null,
        description: p.overview ?? null,
        type: 'movie' as const,
      }))

    return NextResponse.json({
      id: data.id,
      name: data.name,
      parts,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}
