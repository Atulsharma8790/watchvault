import type { SearchResult, TitleMetadata, OttAvailability } from '@/lib/types/watchlist'

// ─── Provider Interfaces ──────────────────────────────────────────────────────
// Swap any implementation without touching UI code

export interface MetadataProvider {
  name: string
  search(query: string): Promise<SearchResult[]>
  getMetadata(tmdbId: number, type: 'movie' | 'series'): Promise<TitleMetadata>
}

export interface AvailabilityProvider {
  name: string
  getAvailability(tmdbId: number, type: 'movie' | 'series', region: string): Promise<OttAvailability[]>
}

export interface RatingProvider {
  name: string
  getImdbRating(imdbId: string): Promise<{ rating: number | null; votes: number | null }>
}
