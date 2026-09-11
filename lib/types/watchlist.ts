// ─── Enums ────────────────────────────────────────────────────────────────────

export type TitleType = 'movie' | 'series'

export type WatchStatus = 'want_to_watch' | 'watching' | 'watched' | 'paused' | 'dropped'

export type Priority = 'must_watch' | 'high' | 'normal' | 'low'

export type AvailabilityType = 'stream' | 'rent' | 'buy' | 'free'

export type AvailabilityStatus = 'streaming' | 'rent_buy' | 'free' | 'unavailable' | 'unknown'

export type SourceType = 'instagram' | 'friend' | 'reddit' | 'youtube' | 'self' | 'other'

// ─── Availability ─────────────────────────────────────────────────────────────

export interface OttAvailability {
  platform: string
  logoPath: string | null
  type: AvailabilityType
  region: string
  url: string | null
}

// ─── External IDs ─────────────────────────────────────────────────────────────

export interface ExternalIds {
  tmdb: number
  imdb: string | null
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export interface Ratings {
  tmdb: number | null
  tmdbVotes: number | null
  imdb: number | null
  imdbVotes: number | null
}

// ─── Cast / Crew ──────────────────────────────────────────────────────────────

export interface CastMember {
  name: string
  character: string
  profilePath: string | null
}

export interface CrewMember {
  name: string
  job: string
}

// ─── Series Info ──────────────────────────────────────────────────────────────

export interface SeriesInfo {
  seasons: number | null
  episodes: number | null
  status: string | null  // "Ended", "Returning Series", etc.
}

// ─── Recommendation Source ────────────────────────────────────────────────────

export interface RecommendationSource {
  type: SourceType | null
  name: string | null   // e.g. "Amit"
  note: string | null   // e.g. "He said this is one of the best crime series"
}

// ─── Global Title Metadata (provider-owned, shareable across users in V2) ─────

export interface TitleMetadata {
  externalIds: ExternalIds
  title: string
  originalTitle: string | null
  type: TitleType
  releaseYear: number | null
  releaseDate: string | null
  ratings: Ratings
  genres: string[]
  description: string | null
  poster: string | null          // full URL
  backdrop: string | null        // full URL
  cast: CastMember[]
  directors: string[]
  creators: string[]             // for series
  languages: string[]
  countries: string[]
  runtimeMinutes: number | null
  seriesInfo: SeriesInfo | null
  availability: OttAvailability[]
  availabilityStatus: AvailabilityStatus
  lastMetadataUpdatedAt: string
  lastAvailabilityCheckedAt: string
  collectionId: number | null       // TMDB collection ID (movies only)
  collectionName: string | null
}

// ─── User Watchlist Entry (user-owned, will have userId in V2) ────────────────

export interface UserWatchlistEntry {
  // V2: userId will go here
  watchStatus: WatchStatus
  priority: Priority
  personalRating: number | null   // 1-5
  personalNotes: string
  source: RecommendationSource
  createdAt: string
  updatedAt: string
}

// ─── Combined V1 Entry ────────────────────────────────────────────────────────

export interface WatchlistEntry extends TitleMetadata, UserWatchlistEntry {
  id: string   // internal UUID
}

// ─── Search Result (before full metadata fetch) ───────────────────────────────

export interface SearchResult {
  tmdbId: number
  title: string
  originalTitle: string | null
  type: TitleType
  releaseYear: number | null
  rating: number | null
  poster: string | null
  description: string | null
  genres: string[]
}

// ─── OTT Platform Preference (user settings) ─────────────────────────────────

export interface UserSettings {
  ottPlatforms: string[]   // e.g. ["Netflix", "Amazon Prime Video"]
  region: string           // e.g. "IN"
  defaultView: 'grid' | 'list'
}

export const DEFAULT_SETTINGS: UserSettings = {
  ottPlatforms: ['Netflix', 'Amazon Prime Video', 'JioCinema', 'SonyLIV', 'Zee5', 'Disney+ Hotstar'],
  region: 'IN',
  defaultView: 'grid',
}

// ─── Filter / Sort State ──────────────────────────────────────────────────────

export interface WatchlistFilters {
  query: string
  type: TitleType | 'all'
  status: WatchStatus | 'all'
  priority: Priority | 'all'
  genre: string
  platform: string
  minRating: number | null
  availabilityStatus: AvailabilityStatus | 'all'
  language: string
  sourceType: SourceType | 'all'
}

export type SortField =
  | 'createdAt'
  | 'updatedAt'
  | 'title'
  | 'releaseYear'
  | 'ratingImdb'
  | 'ratingTmdb'
  | 'personalRating'
  | 'priority'
  | 'runtime'

export interface SortState {
  field: SortField
  direction: 'asc' | 'desc'
}

export const DEFAULT_FILTERS: WatchlistFilters = {
  query: '',
  type: 'all',
  status: 'all',
  priority: 'all',
  genre: '',
  platform: '',
  minRating: null,
  availabilityStatus: 'all',
  language: '',
  sourceType: 'all',
}

export const DEFAULT_SORT: SortState = {
  field: 'createdAt',
  direction: 'desc',
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  want_to_watch: 'Want to Watch',
  watching: 'Watching',
  watched: 'Watched',
  paused: 'Paused',
  dropped: 'Dropped',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  must_watch: 'Must Watch',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  instagram: 'Instagram',
  friend: 'Friend',
  reddit: 'Reddit',
  youtube: 'YouTube',
  self: 'Self-discovered',
  other: 'Other',
}

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  streaming: 'Streaming',
  rent_buy: 'Rent / Buy',
  free: 'Free',
  unavailable: 'Not Available',
  unknown: 'Unknown',
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  must_watch: 4,
  high: 3,
  normal: 2,
  low: 1,
}
