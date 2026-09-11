'use client'

import { useState, useRef, useCallback } from 'react'
import type { SearchResult, TitleMetadata } from '@/lib/types/watchlist'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string, region = 'IN') => {
    setQuery(q)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResults(data.results ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const fetchMetadata = useCallback(async (tmdbId: number, type: 'movie' | 'series', region = 'IN'): Promise<TitleMetadata | null> => {
    setFetchingMeta(true)
    setError(null)
    try {
      const res = await fetch(`/api/metadata/${tmdbId}?type=${type}&region=${region}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data.metadata
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch details')
      return null
    } finally {
      setFetchingMeta(false)
    }
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return { query, results, searching, fetchingMeta, error, search, fetchMetadata, clear }
}
