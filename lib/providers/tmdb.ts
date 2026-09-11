import type { MetadataProvider, AvailabilityProvider } from './types'
import type { SearchResult, TitleMetadata, OttAvailability, AvailabilityStatus, CastMember } from '@/lib/types/watchlist'

const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

function posterUrl(path: string | null, size: 'w342' | 'w780' | 'original' = 'w342') {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) throw new Error('TMDB_READ_TOKEN not configured')
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

function deriveAvailabilityStatus(availability: OttAvailability[]): AvailabilityStatus {
  if (!availability.length) return 'unavailable'
  if (availability.some(a => a.type === 'free')) return 'free'
  if (availability.some(a => a.type === 'stream')) return 'streaming'
  if (availability.some(a => a.type === 'rent' || a.type === 'buy')) return 'rent_buy'
  return 'unavailable'
}

// ─── TMDB Metadata Provider ───────────────────────────────────────────────────

export const tmdbMetadataProvider: MetadataProvider = {
  name: 'TMDB',

  async search(query: string): Promise<SearchResult[]> {
    const data = await tmdbFetch('/search/multi', { query, include_adult: 'false', language: 'en-US', page: '1' })
    const results: SearchResult[] = []

    for (const item of (data.results ?? []).slice(0, 10)) {
      if (item.media_type !== 'movie' && item.media_type !== 'tv') continue
      const isMovie = item.media_type === 'movie'
      results.push({
        tmdbId: item.id,
        title: isMovie ? item.title : item.name,
        originalTitle: isMovie ? (item.original_title ?? null) : (item.original_name ?? null),
        type: isMovie ? 'movie' : 'series',
        releaseYear: isMovie
          ? (item.release_date ? parseInt(item.release_date.split('-')[0]) : null)
          : (item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null),
        rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
        poster: posterUrl(item.poster_path),
        description: item.overview || null,
        genres: [],
      })
    }
    return results
  },

  async getMetadata(tmdbId: number, type: 'movie' | 'series'): Promise<TitleMetadata> {
    const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
    const [detail, credits, externalIds] = await Promise.all([
      tmdbFetch(endpoint, { language: 'en-US', append_to_response: 'videos' }),
      tmdbFetch(`${endpoint}/credits`, { language: 'en-US' }),
      tmdbFetch(`${endpoint}/external_ids`),
    ])

    const isMovie = type === 'movie'

    const cast: CastMember[] = (credits.cast ?? []).slice(0, 15).map((c: Record<string, unknown>) => ({
      name: c.name as string,
      character: (c.character as string) || '',
      profilePath: posterUrl(c.profile_path as string | null, 'w342'),
    }))

    const directors: string[] = isMovie
      ? (credits.crew ?? []).filter((c: Record<string, unknown>) => c.job === 'Director').map((c: Record<string, unknown>) => c.name as string)
      : []

    const creators: string[] = !isMovie
      ? (detail.created_by ?? []).map((c: Record<string, unknown>) => c.name as string)
      : []

    const genres: string[] = (detail.genres ?? []).map((g: Record<string, unknown>) => g.name as string)
    const languages: string[] = (detail.spoken_languages ?? []).map((l: Record<string, unknown>) => l.english_name as string)
    const countries: string[] = (detail.production_countries ?? []).map((c: Record<string, unknown>) => c.name as string)

    const releaseDate = isMovie ? (detail.release_date ?? null) : (detail.first_air_date ?? null)
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null

    const seriesInfo = !isMovie ? {
      seasons: detail.number_of_seasons ?? null,
      episodes: detail.number_of_episodes ?? null,
      status: detail.status ?? null,
    } : null

    const now = new Date().toISOString()

    return {
      externalIds: { tmdb: tmdbId, imdb: externalIds.imdb_id ?? null },
      title: isMovie ? detail.title : detail.name,
      originalTitle: isMovie ? (detail.original_title ?? null) : (detail.original_name ?? null),
      type,
      releaseYear,
      releaseDate,
      ratings: {
        tmdb: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null,
        tmdbVotes: detail.vote_count ?? null,
        imdb: null,
        imdbVotes: null,
      },
      genres,
      description: detail.overview || null,
      poster: posterUrl(detail.poster_path, 'w342'),
      backdrop: posterUrl(detail.backdrop_path, 'w780'),
      cast,
      directors,
      creators,
      languages,
      countries,
      runtimeMinutes: isMovie ? (detail.runtime ?? null) : (detail.episode_run_time?.[0] ?? null),
      seriesInfo,
      availability: [],
      availabilityStatus: 'unknown',
      lastMetadataUpdatedAt: now,
      lastAvailabilityCheckedAt: now,
      collectionId: isMovie ? (detail.belongs_to_collection?.id ?? null) : null,
      collectionName: isMovie ? (detail.belongs_to_collection?.name ?? null) : null,
    }
  },
}

// ─── TMDB Availability Provider (uses JustWatch data via TMDB) ────────────────

export const tmdbAvailabilityProvider: AvailabilityProvider = {
  name: 'TMDB/JustWatch',

  async getAvailability(tmdbId: number, type: 'movie' | 'series', region: string): Promise<OttAvailability[]> {
    const endpoint = type === 'movie' ? `/movie/${tmdbId}/watch/providers` : `/tv/${tmdbId}/watch/providers`
    const data = await tmdbFetch(endpoint)
    const regionData = data.results?.[region]
    if (!regionData) return []

    const availability: OttAvailability[] = []
    const seen = new Set<string>()

    const addPlatforms = (items: Record<string, unknown>[] | undefined, availType: OttAvailability['type']) => {
      if (!items) return
      for (const item of items) {
        const key = `${item.provider_name}-${availType}`
        if (seen.has(key)) continue
        seen.add(key)
        availability.push({
          platform: item.provider_name as string,
          logoPath: item.logo_path ? posterUrl(item.logo_path as string, 'w342') : null,
          type: availType,
          region,
          url: regionData.link ?? null,
        })
      }
    }

    addPlatforms(regionData.flatrate, 'stream')
    addPlatforms(regionData.free, 'free')
    addPlatforms(regionData.ads, 'free')
    addPlatforms(regionData.rent, 'rent')
    addPlatforms(regionData.buy, 'buy')

    return availability
  },
}

export { deriveAvailabilityStatus }
