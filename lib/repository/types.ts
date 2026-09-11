import type { WatchlistEntry, WatchlistFilters, SortState, UserSettings } from '@/lib/types/watchlist'

export interface WatchlistRepository {
  getAll(): Promise<WatchlistEntry[]>
  getById(id: string): Promise<WatchlistEntry | null>
  getByTmdbId(tmdbId: number): Promise<WatchlistEntry | null>
  add(entry: WatchlistEntry): Promise<void>
  update(id: string, patch: Partial<WatchlistEntry>): Promise<void>
  remove(id: string): Promise<void>
  search(filters: WatchlistFilters, sort: SortState): Promise<WatchlistEntry[]>
  count(): Promise<number>
  getSettings(): Promise<UserSettings>
  saveSettings(settings: UserSettings): Promise<void>
  exportJson(): Promise<string>
  importJson(json: string, mode: 'merge' | 'replace'): Promise<{ added: number; skipped: number; errors: string[] }>
  clear(): Promise<void>
}
