'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createIndexedDbRepository } from '@/lib/repository/indexeddb'
import { createSupabaseRepository } from '@/lib/repository/supabase'
import type { WatchlistRepository } from '@/lib/repository/types'
import type { WatchlistEntry, WatchlistFilters, SortState, UserSettings } from '@/lib/types/watchlist'
import { DEFAULT_FILTERS, DEFAULT_SORT, DEFAULT_SETTINGS } from '@/lib/types/watchlist'
import type { User } from '@supabase/supabase-js'

const localRepo = createIndexedDbRepository()

function getRepo(user: User | null): WatchlistRepository {
  if (user) {
    const supabase = createClient()
    return createSupabaseRepository(supabase, user.id)
  }
  return localRepo
}

export function useWatchlist() {
  const [user, setUser] = useState<User | null>(null)
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<WatchlistFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [migrationPending, setMigrationPending] = useState(false)
  const realtimeRef = useRef<ReturnType<typeof createClient> | null>(null)

  // Track auth state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const reload = useCallback(async (currentUser: User | null) => {
    setLoading(true)
    try {
      const repo = getRepo(currentUser)
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

  // Reload when user or filters/sort change
  useEffect(() => { reload(user) }, [user, reload])

  // Real-time subscription when signed in
  useEffect(() => {
    if (!user) {
      realtimeRef.current?.removeAllChannels()
      realtimeRef.current = null
      return
    }
    const supabase = createClient()
    realtimeRef.current = supabase
    const channel = supabase
      .channel('watchlist-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'watchlist_entries',
        filter: `user_id=eq.${user.id}`,
      }, () => { reload(user) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_settings',
        filter: `user_id=eq.${user.id}`,
      }, () => { reload(user) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, reload])

  // Check for local data to migrate when user first signs in
  useEffect(() => {
    if (!user) return
    localRepo.count().then(count => {
      if (count > 0) setMigrationPending(true)
    })
  }, [user])

  async function migrateLocalData() {
    if (!user) return
    const localEntries = await localRepo.getAll()
    const cloudRepo = createSupabaseRepository(createClient(), user.id)
    await cloudRepo.importJson(JSON.stringify({ entries: localEntries }), 'merge')
    await localRepo.clear()
    setMigrationPending(false)
    await reload(user)
  }

  const addEntry = useCallback(async (entry: WatchlistEntry) => {
    await getRepo(user).add(entry)
    await reload(user)
  }, [user, reload])

  const updateEntry = useCallback(async (id: string, patch: Partial<WatchlistEntry>) => {
    await getRepo(user).update(id, patch)
    await reload(user)
  }, [user, reload])

  const removeEntry = useCallback(async (id: string) => {
    await getRepo(user).remove(id)
    await reload(user)
  }, [user, reload])

  const checkDuplicate = useCallback(async (tmdbId: number) => {
    return getRepo(user).getByTmdbId(tmdbId)
  }, [user])

  const saveSettings = useCallback(async (s: UserSettings) => {
    await getRepo(user).saveSettings(s)
    setSettings(s)
  }, [user])

  const exportJson = useCallback(() => getRepo(user).exportJson(), [user])

  const importJson = useCallback(async (json: string, mode: 'merge' | 'replace') => {
    const result = await getRepo(user).importJson(json, mode)
    await reload(user)
    return result
  }, [user, reload])

  const clearAll = useCallback(async () => {
    await getRepo(user).clear()
    await reload(user)
  }, [user, reload])

  return {
    user, entries, loading, filters, sort, settings,
    migrationPending, migrateLocalData,
    setFilters, setSort,
    addEntry, updateEntry, removeEntry,
    checkDuplicate, saveSettings,
    exportJson, importJson, clearAll,
    reload: () => reload(user),
  }
}

export function useAllEntries() {
  const [all, setAll] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localRepo.getAll().then(entries => { setAll(entries); setLoading(false) })
  }, [])

  return { all, loading }
}
