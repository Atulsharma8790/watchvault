'use client'

import { openDB, type IDBPDatabase } from 'idb'
import type { WatchlistRepository } from './types'
import type { WatchlistEntry, WatchlistFilters, SortState, UserSettings, Priority } from '@/lib/types/watchlist'
import { DEFAULT_SETTINGS, PRIORITY_ORDER } from '@/lib/types/watchlist'

const DB_NAME = 'watchvault'
const DB_VERSION = 1
const STORE_ENTRIES = 'entries'
const STORE_SETTINGS = 'settings'

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' })
        store.createIndex('tmdbId', 'externalIds.tmdb', { unique: true })
        store.createIndex('watchStatus', 'watchStatus')
        store.createIndex('priority', 'priority')
        store.createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS)
      }
    },
  })
}

function matchesFilters(entry: WatchlistEntry, filters: WatchlistFilters): boolean {
  const q = filters.query.toLowerCase()
  if (q) {
    const searchable = [
      entry.title,
      entry.originalTitle ?? '',
      entry.description ?? '',
      ...entry.cast.map(c => c.name),
      ...entry.cast.map(c => c.character),
      ...entry.directors,
      ...entry.creators,
      ...entry.genres,
      ...entry.availability.map(a => a.platform),
      entry.source.name ?? '',
      entry.source.note ?? '',
      entry.personalNotes,
      ...entry.languages,
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
  if (filters.sourceType !== 'all' && entry.source.type !== filters.sourceType) return false
  if (filters.cast && !entry.cast.some(c => c.name.toLowerCase().includes(filters.cast.toLowerCase()))) return false
  return true
}

function sortEntries(entries: WatchlistEntry[], sort: SortState): WatchlistEntry[] {
  return [...entries].sort((a, b) => {
    let valA: number | string = 0
    let valB: number | string = 0

    switch (sort.field) {
      case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break
      case 'createdAt': valA = a.createdAt; valB = b.createdAt; break
      case 'updatedAt': valA = a.updatedAt; valB = b.updatedAt; break
      case 'releaseYear': valA = a.releaseYear ?? 0; valB = b.releaseYear ?? 0; break
      case 'ratingImdb': valA = a.ratings.imdb ?? 0; valB = b.ratings.imdb ?? 0; break
      case 'ratingTmdb': valA = a.ratings.tmdb ?? 0; valB = b.ratings.tmdb ?? 0; break
      case 'personalRating': valA = a.personalRating ?? 0; valB = b.personalRating ?? 0; break
      case 'priority': valA = PRIORITY_ORDER[a.priority]; valB = PRIORITY_ORDER[b.priority]; break
      case 'runtime': valA = a.runtimeMinutes ?? 0; valB = b.runtimeMinutes ?? 0; break
    }

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB as string)
      return sort.direction === 'asc' ? cmp : -cmp
    }
    return sort.direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
  })
}

export const createIndexedDbRepository = (): WatchlistRepository => ({
  async getAll() {
    const db = await getDb()
    return db.getAll(STORE_ENTRIES)
  },

  async getById(id) {
    const db = await getDb()
    return (await db.get(STORE_ENTRIES, id)) ?? null
  },

  async getByTmdbId(tmdbId) {
    const db = await getDb()
    return (await db.getFromIndex(STORE_ENTRIES, 'tmdbId', tmdbId)) ?? null
  },

  async add(entry) {
    const db = await getDb()
    await db.add(STORE_ENTRIES, entry)
  },

  async update(id, patch) {
    const db = await getDb()
    const existing = await db.get(STORE_ENTRIES, id)
    if (!existing) throw new Error(`Entry ${id} not found`)
    await db.put(STORE_ENTRIES, { ...existing, ...patch, updatedAt: new Date().toISOString() })
  },

  async remove(id) {
    const db = await getDb()
    await db.delete(STORE_ENTRIES, id)
  },

  async search(filters, sort) {
    const db = await getDb()
    const all: WatchlistEntry[] = await db.getAll(STORE_ENTRIES)
    const filtered = all.filter(e => matchesFilters(e, filters))
    return sortEntries(filtered, sort)
  },

  async count() {
    const db = await getDb()
    return db.count(STORE_ENTRIES)
  },

  async getSettings() {
    const db = await getDb()
    return (await db.get(STORE_SETTINGS, 'user')) ?? DEFAULT_SETTINGS
  },

  async saveSettings(settings) {
    const db = await getDb()
    await db.put(STORE_SETTINGS, settings, 'user')
  },

  async exportJson() {
    const db = await getDb()
    const entries: WatchlistEntry[] = await db.getAll(STORE_ENTRIES)
    const settings = (await db.get(STORE_SETTINGS, 'user')) ?? DEFAULT_SETTINGS
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries, settings }, null, 2)
  },

  async importJson(json, mode) {
    let parsed: { version?: number; entries?: WatchlistEntry[]; settings?: UserSettings }
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new Error('Invalid JSON file')
    }
    if (!Array.isArray(parsed.entries)) throw new Error('JSON does not contain an entries array')

    const db = await getDb()
    let added = 0; let skipped = 0; const errors: string[] = []

    if (mode === 'replace') {
      await db.clear(STORE_ENTRIES)
    }

    for (const entry of parsed.entries) {
      if (!entry.id || !entry.title || !entry.externalIds?.tmdb) {
        errors.push(`Skipped invalid entry: ${entry.title ?? 'unknown'}`)
        skipped++
        continue
      }
      try {
        const existing = await db.getFromIndex(STORE_ENTRIES, 'tmdbId', entry.externalIds.tmdb)
        if (existing && mode === 'merge') { skipped++; continue }
        await db.put(STORE_ENTRIES, entry)
        added++
      } catch {
        errors.push(`Failed to import: ${entry.title}`)
        skipped++
      }
    }

    if (parsed.settings && mode === 'replace') {
      await db.put(STORE_SETTINGS, parsed.settings, 'user')
    }

    return { added, skipped, errors }
  },

  async clear() {
    const db = await getDb()
    await db.clear(STORE_ENTRIES)
  },
})
