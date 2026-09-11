'use client'

import { useState, useEffect, useCallback } from 'react'
import { createIndexedDbRepository } from '@/lib/repository/indexeddb'
import type { WatchlistEntry, WatchlistFilters, SortState, UserSettings } from '@/lib/types/watchlist'
import { DEFAULT_FILTERS, DEFAULT_SORT, DEFAULT_SETTINGS } from '@/lib/types/watchlist'

const repo = createIndexedDbRepository()

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<WatchlistFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [results, userSettings] = await Promise.all([
        repo.search(filters, sort),
        repo.getSettings(),
      ])
      setEntries(results)
      setSettings(userSettings)
    } finally {
      setLoading(false)
    }
  }, [filters, sort])

  useEffect(() => { reload() }, [reload])

  const addEntry = useCallback(async (entry: WatchlistEntry) => {
    await repo.add(entry)
    await reload()
  }, [reload])

  const updateEntry = useCallback(async (id: string, patch: Partial<WatchlistEntry>) => {
    await repo.update(id, patch)
    await reload()
  }, [reload])

  const removeEntry = useCallback(async (id: string) => {
    await repo.remove(id)
    await reload()
  }, [reload])

  const checkDuplicate = useCallback(async (tmdbId: number) => {
    return repo.getByTmdbId(tmdbId)
  }, [])

  const saveSettings = useCallback(async (s: UserSettings) => {
    await repo.saveSettings(s)
    setSettings(s)
  }, [])

  const exportJson = useCallback(() => repo.exportJson(), [])

  const importJson = useCallback(async (json: string, mode: 'merge' | 'replace') => {
    const result = await repo.importJson(json, mode)
    await reload()
    return result
  }, [reload])

  const clearAll = useCallback(async () => {
    await repo.clear()
    await reload()
  }, [reload])

  return {
    entries, loading, filters, sort, settings,
    setFilters, setSort,
    addEntry, updateEntry, removeEntry,
    checkDuplicate, saveSettings,
    exportJson, importJson, clearAll,
    reload,
  }
}

export function useAllEntries() {
  const [all, setAll] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    repo.getAll().then(entries => { setAll(entries); setLoading(false) })
  }, [])

  return { all, loading }
}
