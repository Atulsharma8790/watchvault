import type { SupabaseClient } from '@supabase/supabase-js'
import type { WatchlistRepository } from './types'
import type { WatchlistEntry, WatchlistFilters, SortState, UserSettings, Priority } from '@/lib/types/watchlist'
import { DEFAULT_SETTINGS, PRIORITY_ORDER } from '@/lib/types/watchlist'

// ─── Row ↔ Entry conversion ────────────────────────────────────────────────

function toRow(entry: WatchlistEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    external_ids: entry.externalIds,
    title: entry.title,
    original_title: entry.originalTitle,
    type: entry.type,
    release_year: entry.releaseYear,
    release_date: entry.releaseDate,
    ratings: entry.ratings,
    genres: entry.genres,
    description: entry.description,
    poster: entry.poster,
    backdrop: entry.backdrop,
    cast_members: entry.cast,
    directors: entry.directors,
    creators: entry.creators,
    languages: entry.languages,
    countries: entry.countries,
    runtime_minutes: entry.runtimeMinutes,
    series_info: entry.seriesInfo,
    availability: entry.availability,
    availability_status: entry.availabilityStatus,
    last_metadata_updated_at: entry.lastMetadataUpdatedAt,
    last_availability_checked_at: entry.lastAvailabilityCheckedAt,
    collection_id: entry.collectionId,
    collection_name: entry.collectionName,
    watch_status: entry.watchStatus,
    priority: entry.priority,
    personal_rating: entry.personalRating,
    personal_notes: entry.personalNotes,
    source: entry.source,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): WatchlistEntry {
  return {
    id: row.id,
    externalIds: row.external_ids ?? { tmdb: 0, imdb: null },
    title: row.title,
    originalTitle: row.original_title,
    type: row.type,
    releaseYear: row.release_year,
    releaseDate: row.release_date,
    ratings: row.ratings ?? {},
    genres: row.genres ?? [],
    description: row.description,
    poster: row.poster,
    backdrop: row.backdrop,
    cast: row.cast_members ?? [],
    directors: row.directors ?? [],
    creators: row.creators ?? [],
    languages: row.languages ?? [],
    countries: row.countries ?? [],
    runtimeMinutes: row.runtime_minutes,
    seriesInfo: row.series_info,
    availability: row.availability ?? [],
    availabilityStatus: row.availability_status ?? 'unknown',
    lastMetadataUpdatedAt: row.last_metadata_updated_at ?? '',
    lastAvailabilityCheckedAt: row.last_availability_checked_at ?? '',
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    watchStatus: row.watch_status,
    priority: row.priority,
    personalRating: row.personal_rating,
    personalNotes: row.personal_notes ?? '',
    source: row.source ?? { type: null, name: null, note: null },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Filter + Sort (client-side, same logic as IndexedDB repo) ────────────

function matchesFilters(entry: WatchlistEntry, filters: WatchlistFilters): boolean {
  const q = filters.query.toLowerCase()
  if (q) {
    const searchable = [
      entry.title, entry.originalTitle ?? '', entry.description ?? '',
      ...entry.cast.map(c => c.name), ...entry.directors, ...entry.creators,
      ...entry.genres, ...entry.availability.map(a => a.platform),
      entry.source.name ?? '', entry.source.note ?? '',
      entry.personalNotes, ...entry.languages,
    ].join(' ').toLowerCase()
    if (!searchable.includes(q)) return false
  }
  if (filters.type !== 'all' && entry.type !== filters.type) return false
  if (filters.status !== 'all' && entry.watchStatus !== filters.status) return false
  if (filters.priority !== 'all' && entry.priority !== filters.priority) return false
  if (filters.genre && !entry.genres.some(g => g.toLowerCase().includes(filters.genre.toLowerCase()))) return false
  if (filters.platform && !entry.availability.some(a => a.platform.toLowerCase().includes(filters.platform.toLowerCase()))) return false
  if (filters.minRating !== null) {
    const rating = entry.ratings.imdb ?? entry.ratings.tmdb
    if (!rating || rating < filters.minRating) return false
  }
  if (filters.availabilityStatus !== 'all' && entry.availabilityStatus !== filters.availabilityStatus) return false
  if (filters.language && !entry.languages.some(l => l.toLowerCase().includes(filters.language.toLowerCase()))) return false
  if (filters.cast && !entry.cast.some(c => c.name.toLowerCase().includes(filters.cast.toLowerCase()))) return false
  return true
}

function sortEntries(entries: WatchlistEntry[], sort: SortState): WatchlistEntry[] {
  return [...entries].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1
    switch (sort.field) {
      case 'title': return dir * a.title.localeCompare(b.title)
      case 'releaseYear': return dir * ((a.releaseYear ?? 0) - (b.releaseYear ?? 0))
      case 'ratingImdb': return dir * ((a.ratings.imdb ?? a.ratings.tmdb ?? 0) - (b.ratings.imdb ?? b.ratings.tmdb ?? 0))
      case 'priority': return dir * (PRIORITY_ORDER[a.priority as Priority] - PRIORITY_ORDER[b.priority as Priority])
      case 'runtime': return dir * ((a.runtimeMinutes ?? 0) - (b.runtimeMinutes ?? 0))
      case 'createdAt': return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'updatedAt': return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      default: return 0
    }
  })
}

// ─── Repository ────────────────────────────────────────────────────────────

export function createSupabaseRepository(supabase: SupabaseClient, userId: string): WatchlistRepository {
  async function fetchAll(): Promise<WatchlistEntry[]> {
    const { data, error } = await supabase
      .from('watchlist_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(fromRow)
  }

  return {
    async getAll() { return fetchAll() },

    async getById(id) {
      const { data } = await supabase.from('watchlist_entries').select('*').eq('id', id).eq('user_id', userId).single()
      return data ? fromRow(data) : null
    },

    async getByTmdbId(tmdbId) {
      const { data } = await supabase.from('watchlist_entries').select('*').eq('user_id', userId).contains('external_ids', { tmdb: tmdbId }).maybeSingle()
      return data ? fromRow(data) : null
    },

    async add(entry) {
      const { error } = await supabase.from('watchlist_entries').insert(toRow(entry, userId))
      if (error) throw error
    },

    async update(id, patch) {
      const existing = await this.getById(id)
      if (!existing) return
      const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      const row = toRow(merged, userId)
      const { error } = await supabase.from('watchlist_entries').update(row).eq('id', id).eq('user_id', userId)
      if (error) throw error
    },

    async remove(id) {
      const { error } = await supabase.from('watchlist_entries').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },

    async search(filters, sort) {
      const all = await fetchAll()
      const filtered = all.filter(e => matchesFilters(e, filters))
      return sortEntries(filtered, sort)
    },

    async count() {
      const { count } = await supabase.from('watchlist_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      return count ?? 0
    },

    async getSettings() {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
      if (!data) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ottPlatforms: data.ott_platforms ?? DEFAULT_SETTINGS.ottPlatforms, region: data.region ?? 'IN' }
    },

    async saveSettings(settings) {
      await supabase.from('user_settings').upsert({ user_id: userId, ott_platforms: settings.ottPlatforms, region: settings.region, updated_at: new Date().toISOString() })
    },

    async exportJson() {
      const all = await fetchAll()
      return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: all }, null, 2)
    },

    async importJson(json, mode) {
      const data = JSON.parse(json)
      const entries: WatchlistEntry[] = Array.isArray(data) ? data : (data.entries ?? [])
      if (mode === 'replace') {
        await supabase.from('watchlist_entries').delete().eq('user_id', userId)
      }
      let added = 0; let skipped = 0; const errors: string[] = []
      for (const entry of entries) {
        try {
          const existing = await this.getByTmdbId(entry.externalIds?.tmdb)
          if (existing && mode === 'merge') { skipped++; continue }
          const row = toRow({ ...entry, id: entry.id ?? `wv-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }, userId)
          const { error } = await supabase.from('watchlist_entries').upsert(row)
          if (error) { errors.push(error.message); continue }
          added++
        } catch (e) { errors.push(String(e)) }
      }
      return { added, skipped, errors }
    },

    async clear() {
      await supabase.from('watchlist_entries').delete().eq('user_id', userId)
      await supabase.from('user_settings').delete().eq('user_id', userId)
    },
  }
}
