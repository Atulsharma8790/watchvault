'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Plus, Film, Tv, ChevronRight, Check, ArrowLeft, Library } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { useToast } from '@/components/ui/Toast'
import { SearchBar } from './SearchBar'
import { StarRating } from '@/components/ui/StarRating'
import type { SearchResult, TitleMetadata, WatchlistEntry, WatchStatus, Priority, SourceType, RecommendationSource } from '@/lib/types/watchlist'
import { SOURCE_LABELS } from '@/lib/types/watchlist'
import Image from 'next/image'

interface CollectionPart {
  tmdbId: number
  title: string
  releaseYear: number | null
  rating: number | null
  poster: string | null
  type: 'movie'
  description: string | null
}

interface Props {
  onClose: () => void
  onAdd: (entry: WatchlistEntry) => Promise<void>
  onAddMany?: (entries: WatchlistEntry[]) => Promise<void>
  checkDuplicate: (tmdbId: number) => Promise<WatchlistEntry | null>
  region?: string
}

type Step = 'search' | 'detail' | 'collection'

function generateId() {
  return `wv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildEntry(metadata: TitleMetadata, opts: {
  status: WatchStatus; priority: Priority; personalRating: number | null
  notes: string; sourceType: SourceType | ''; sourceName: string; sourceNote: string
}): WatchlistEntry {
  const now = new Date().toISOString()
  const source: RecommendationSource = { type: opts.sourceType || null, name: opts.sourceName || null, note: opts.sourceNote || null }
  return { id: generateId(), ...metadata, watchStatus: opts.status, priority: opts.priority, personalRating: opts.personalRating, personalNotes: opts.notes, source, createdAt: now, updatedAt: now }
}

export function AddTitleModal({ onClose, onAdd, onAddMany, checkDuplicate, region = 'IN' }: Props) {
  const { query, results, searching, fetchingMeta, error, search, fetchMetadata, clear } = useSearch()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('search')
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [metadata, setMetadata] = useState<TitleMetadata | null>(null)
  const [duplicate, setDuplicate] = useState<WatchlistEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Collection state
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [collectionParts, setCollectionParts] = useState<CollectionPart[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [alreadySaved, setAlreadySaved] = useState<Set<number>>(new Set())
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set())

  // User fields (shared across main title + sequels)
  const [status, setStatus] = useState<WatchStatus>('want_to_watch')
  const [priority, setPriority] = useState<Priority>('normal')
  const [personalRating, setPersonalRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState<SourceType | ''>('')
  const [sourceName, setSourceName] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  // Reset highlight when results change
  useEffect(() => { setHighlightedIndex(-1) }, [results])

  // Keyboard navigation for search results
  useEffect(() => {
    if (step !== 'search') return
    function onKey(e: KeyboardEvent) {
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(i => {
          const next = Math.min(i + 1, results.length - 1)
          resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(i => {
          const next = Math.max(i - 1, 0)
          resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelectResult(results[highlightedIndex])
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, results, highlightedIndex])

  async function handleSelectResult(result: SearchResult) {
    setSelected(result)
    const dup = await checkDuplicate(result.tmdbId)
    if (dup) { setDuplicate(dup); setStep('detail'); return }
    setDuplicate(null)
    const meta = await fetchMetadata(result.tmdbId, result.type, region)
    setMetadata(meta)
    setStep('detail')
  }

  async function handleOpenCollection() {
    if (!metadata?.collectionId) return
    setCollectionLoading(true)
    setStep('collection')
    try {
      const res = await fetch(`/api/collection/${metadata.collectionId}`)
      const data = await res.json()
      const parts: CollectionPart[] = data.parts ?? []
      setCollectionName(data.name ?? metadata.collectionName ?? '')

      // Mark which are already saved
      const savedSet = new Set<number>()
      const unselectedSet = new Set<number>()
      for (const p of parts) {
        const dup = await checkDuplicate(p.tmdbId)
        if (dup) savedSet.add(p.tmdbId)
        else unselectedSet.add(p.tmdbId)
      }
      setAlreadySaved(savedSet)
      setSelectedParts(unselectedSet) // pre-select all not-yet-saved
      setCollectionParts(parts)
    } catch {
      toast('Could not load collection', 'error')
      setStep('detail')
    } finally {
      setCollectionLoading(false)
    }
  }

  function togglePart(tmdbId: number) {
    setSelectedParts(prev => {
      const next = new Set(prev)
      if (next.has(tmdbId)) next.delete(tmdbId); else next.add(tmdbId)
      return next
    })
  }

  // Save: either just the main title (from detail step), or selected collection parts
  async function handleSave() {
    if (!metadata) return
    setSaving(true)
    try {
      const opts = { status, priority, personalRating, notes, sourceType, sourceName, sourceNote }

      if (step === 'detail') {
        const entry = buildEntry(metadata, opts)
        await onAdd(entry)
        toast(`"${metadata.title}" added!`, 'success')
      } else if (step === 'collection') {
        const toAdd = collectionParts.filter(p => selectedParts.has(p.tmdbId) && !alreadySaved.has(p.tmdbId))
        const entries: WatchlistEntry[] = []
        for (const part of toAdd) {
          try {
            const meta = await fetchMetadata(part.tmdbId, 'movie', region)
            if (!meta) continue
            entries.push(buildEntry(meta, { ...opts, personalRating: null, notes: '' }))
          } catch { /* skip failed */ }
        }
        if (entries.length > 0) {
          if (onAddMany) await onAddMany(entries)
          else for (const e of entries) await onAdd(e)
        }
        toast(`Added ${entries.length} title${entries.length !== 1 ? 's' : ''} from ${collectionName}!`, 'success')
      }
      onClose()
    } catch {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rating = metadata?.ratings.imdb ?? metadata?.ratings.tmdb ?? selected?.rating
  const saveCount = step === 'collection' ? selectedParts.size : 1

  // ── Collection screen ────────────────────────────────────────────────────────
  const collectionScreen = (
    <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setStep('detail')} className="rounded-xl p-1.5 hover:bg-white/5" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate">{collectionName || 'Collection'}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {collectionLoading ? 'Loading…' : `${collectionParts.length} titles · ${alreadySaved.size} already saved`}
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/5" style={{ color: 'var(--muted)' }}><X size={18} /></button>
      </div>

      {/* Parts list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {collectionLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading collection…</p>
          </div>
        )}
        {!collectionLoading && collectionParts.map(part => {
          const saved = alreadySaved.has(part.tmdbId)
          const checked = selectedParts.has(part.tmdbId)
          const isCurrent = part.tmdbId === metadata?.externalIds.tmdb
          return (
            <button key={part.tmdbId}
              onClick={() => !saved && togglePart(part.tmdbId)}
              disabled={saved}
              className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all"
              style={{
                background: saved ? 'var(--surface)' : checked ? 'var(--accent-dim)' : 'var(--card)',
                border: `1px solid ${saved ? 'var(--border)' : checked ? 'var(--accent)' : 'var(--border)'}`,
                opacity: saved ? 0.6 : 1,
                cursor: saved ? 'default' : 'pointer',
              }}>
              {part.poster
                ? <Image src={part.poster} alt={part.title} width={44} height={64} className="rounded-xl object-cover flex-shrink-0" style={{ width: 44, height: 64 }} />
                : <div className="rounded-xl flex-shrink-0 flex items-center justify-center" style={{ width: 44, height: 64, background: 'var(--border)' }}>
                    <Film size={16} style={{ color: 'var(--muted)' }} />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{part.title}</p>
                  {isCurrent && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Current</span>}
                  {saved && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Saved ✓</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {part.releaseYear ?? '—'}{part.rating ? ` · ⭐ ${part.rating}` : ''}
                </p>
                {part.description && <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--muted)' }}>{part.description}</p>}
              </div>
              {!saved && (
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: checked ? 'var(--accent)' : 'transparent', border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}` }}>
                  {checked && <Check size={12} color="#0A0D14" strokeWidth={3} />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Select all / none + save */}
      {!collectionLoading && collectionParts.length > 0 && (
        <div className="px-6 py-4 flex-shrink-0 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <div className="flex gap-3">
              <button onClick={() => setSelectedParts(new Set(collectionParts.filter(p => !alreadySaved.has(p.tmdbId)).map(p => p.tmdbId)))}
                className="hover:opacity-80 font-medium" style={{ color: 'var(--accent)' }}>Select all</button>
              <button onClick={() => setSelectedParts(new Set())} className="hover:opacity-80 font-medium">Deselect all</button>
            </div>
            <span>{selectedParts.size} selected</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('detail')}
              className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              Back
            </button>
            <button onClick={handleSave} disabled={saving || selectedParts.size === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0A0D14' }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? 'Adding…' : `Add ${selectedParts.size} title${selectedParts.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Main / detail screen ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      {step === 'collection' ? collectionScreen : (
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-bold">Add to Watchlist</h2>
            <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/5 transition-all" style={{ color: 'var(--muted)' }}><X size={18} /></button>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* ── SEARCH STEP ── */}
            {step === 'search' && (
              <>
                <SearchBar query={query} onChange={search} onClear={clear} searching={searching} autoFocus placeholder="Enter movie or series name…" />
                {error && <p className="text-sm text-red-400">{error}</p>}
                {results.length > 0 && (
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <button key={r.tmdbId} ref={el => { resultRefs.current[i] = el }} onClick={() => handleSelectResult(r)}
                        className="w-full flex items-center gap-4 rounded-2xl p-3 text-left transition-all hover:bg-white/5"
                        style={{ background: i === highlightedIndex ? 'var(--accent-dim)' : 'var(--card)', border: `1px solid ${i === highlightedIndex ? 'var(--accent)' : 'var(--border)'}` }}>
                        {r.poster
                          ? <Image src={r.poster} alt={r.title} width={44} height={64} className="rounded-lg object-cover flex-shrink-0" style={{ width: 44, height: 64 }} />
                          : <div className="w-11 h-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--border)' }}>
                              {r.type === 'movie' ? <Film size={18} style={{ color: 'var(--muted)' }} /> : <Tv size={18} style={{ color: 'var(--muted)' }} />}
                            </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{r.title}</div>
                          <div className="text-sm flex items-center gap-2 mt-0.5" style={{ color: 'var(--muted)' }}>
                            <span>{r.type === 'movie' ? '🎬' : '📺'} {r.type === 'movie' ? 'Movie' : 'Series'}</span>
                            {r.releaseYear && <span>· {r.releaseYear}</span>}
                            {r.rating && <span>· ⭐ {r.rating}</span>}
                          </div>
                          {r.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{r.description}</p>}
                        </div>
                        <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--muted)' }} />
                      </button>
                    ))}
                  </div>
                )}
                {query.length >= 2 && !searching && results.length === 0 && (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No results for &ldquo;{query}&rdquo;</div>
                )}
              </>
            )}

            {/* ── DETAIL STEP ── */}
            {step === 'detail' && (
              <>
                {/* Duplicate */}
                {duplicate && (
                  <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <p className="text-amber-400 font-semibold mb-1">⚠️ Already in your watchlist</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>&ldquo;{selected?.title}&rdquo; is already saved.</p>
                    <button onClick={() => { setSelected(null); setMetadata(null); setStep('search'); clear() }}
                      className="text-sm px-4 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      Search again
                    </button>
                  </div>
                )}

                {/* Loading */}
                {!duplicate && fetchingMeta && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Fetching details…</p>
                  </div>
                )}

                {/* Metadata + fields */}
                {!duplicate && metadata && !fetchingMeta && (
                  <>
                    {/* Title card */}
                    <div className="flex gap-4 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      {metadata.poster
                        ? <Image src={metadata.poster} alt={metadata.title} width={72} height={108} className="rounded-xl object-cover flex-shrink-0" style={{ width: 72, height: 108 }} />
                        : <div className="w-18 h-28 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--border)' }}><Film size={24} style={{ color: 'var(--muted)' }} /></div>
                      }
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-tight">{metadata.title}</h3>
                        {metadata.originalTitle && metadata.originalTitle !== metadata.title && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{metadata.originalTitle}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                          <span>{metadata.type === 'movie' ? '🎬 Movie' : '📺 Series'}</span>
                          {metadata.releaseYear && <span>{metadata.releaseYear}</span>}
                          {rating && <span>⭐ {rating}</span>}
                          {metadata.genres.slice(0, 3).map(g => <span key={g}>{g}</span>)}
                        </div>
                        {metadata.seriesInfo && (
                          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                            {metadata.seriesInfo.seasons} Season{metadata.seriesInfo.seasons !== 1 ? 's' : ''} · {metadata.seriesInfo.episodes} Episodes
                          </p>
                        )}
                        {metadata.runtimeMinutes && metadata.type === 'movie' && (
                          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>⏱ {metadata.runtimeMinutes} min</p>
                        )}

                        {/* Clickable collection badge */}
                        {metadata.collectionId && (
                          <button onClick={handleOpenCollection}
                            className="mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110 active:scale-95"
                            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                            <Library size={12} />
                            <span>Part of <strong>{metadata.collectionName}</strong></span>
                            <span className="ml-auto opacity-70">Browse all →</span>
                          </button>
                        )}

                        {metadata.availability.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {metadata.availability.slice(0, 3).map((a, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(45,212,191,0.1)', color: 'var(--teal)' }}>{a.platform}</span>
                            ))}
                          </div>
                        )}
                        {metadata.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>{metadata.description}</p>}
                      </div>
                    </div>

                    {/* User fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Watch Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as WatchStatus)}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                          <option value="want_to_watch">Want to Watch</option>
                          <option value="watching">Watching</option>
                          <option value="watched">Watched</option>
                          <option value="paused">Paused</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                          <option value="must_watch">🔥 Must Watch</option>
                          <option value="high">⬆ High</option>
                          <option value="normal">− Normal</option>
                          <option value="low">⬇ Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Source</label>
                        <select value={sourceType} onChange={e => setSourceType(e.target.value as SourceType | '')}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                          <option value="">— Not specified</option>
                          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Recommended by</label>
                        <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. Amit"
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Recommendation note</label>
                      <input value={sourceNote} onChange={e => setSourceNote(e.target.value)}
                        placeholder='e.g. "He said this is one of the best crime series."'
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Personal notes</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                        placeholder="Watch with family. Need to see before S3."
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>My Rating (optional)</label>
                      <StarRating value={personalRating} onChange={setPersonalRating} />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setSelected(null); setMetadata(null); setStep('search'); clear() }}
                        className="flex-shrink-0 px-5 rounded-xl py-3 text-sm font-semibold transition-all hover:bg-white/5"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        Back
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        Save to Watchlist
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
