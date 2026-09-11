'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Film, Tv, ChevronRight, Check } from 'lucide-react'
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
}

interface Props {
  onClose: () => void
  onAdd: (entry: WatchlistEntry) => Promise<void>
  checkDuplicate: (tmdbId: number) => Promise<WatchlistEntry | null>
  region?: string
}

function generateId() {
  return `wv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildEntry(metadata: TitleMetadata, overrides: {
  status: WatchStatus, priority: Priority, personalRating: number | null,
  notes: string, sourceType: SourceType | '', sourceName: string, sourceNote: string
}): WatchlistEntry {
  const now = new Date().toISOString()
  const source: RecommendationSource = {
    type: overrides.sourceType || null,
    name: overrides.sourceName || null,
    note: overrides.sourceNote || null,
  }
  return { id: generateId(), ...metadata, watchStatus: overrides.status, priority: overrides.priority, personalRating: overrides.personalRating, personalNotes: overrides.notes, source, createdAt: now, updatedAt: now }
}

export function AddTitleModal({ onClose, onAdd, checkDuplicate, region = 'IN' }: Props) {
  const { query, results, searching, fetchingMeta, error, search, fetchMetadata, clear } = useSearch()
  const { toast } = useToast()
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [metadata, setMetadata] = useState<TitleMetadata | null>(null)
  const [duplicate, setDuplicate] = useState<WatchlistEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Sequel flow
  const [showSequelPrompt, setShowSequelPrompt] = useState(false)
  const [collectionParts, setCollectionParts] = useState<CollectionPart[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set())
  const [addingSequels, setAddingSequels] = useState(false)
  const [savedEntry, setSavedEntry] = useState<WatchlistEntry | null>(null)

  // User fields
  const [status, setStatus] = useState<WatchStatus>('want_to_watch')
  const [priority, setPriority] = useState<Priority>('normal')
  const [personalRating, setPersonalRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState<SourceType | ''>('')
  const [sourceName, setSourceName] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  async function handleSelectResult(result: SearchResult) {
    setSelected(result)
    const dup = await checkDuplicate(result.tmdbId)
    if (dup) { setDuplicate(dup); return }
    setDuplicate(null)
    const meta = await fetchMetadata(result.tmdbId, result.type, region)
    setMetadata(meta)
  }

  async function handleSave() {
    if (!metadata) return
    setSaving(true)
    try {
      const entry = buildEntry(metadata, { status, priority, personalRating, notes, sourceType, sourceName, sourceNote })
      await onAdd(entry)
      setSavedEntry(entry)
      toast(`"${metadata.title}" added!`, 'success')

      // Check for collection (movies only)
      if (metadata.collectionId && metadata.type === 'movie') {
        const res = await fetch(`/api/collection/${metadata.collectionId}`)
        if (res.ok) {
          const data = await res.json()
          // Filter out already-saved parts
          const otherParts: CollectionPart[] = []
          for (const part of (data.parts ?? []) as CollectionPart[]) {
            if (part.tmdbId === metadata.externalIds.tmdb) continue
            const dup = await checkDuplicate(part.tmdbId)
            if (!dup) otherParts.push(part)
          }
          if (otherParts.length > 0) {
            setCollectionParts(otherParts)
            setCollectionName(data.name ?? metadata.collectionName ?? 'this collection')
            setSelectedParts(new Set(otherParts.map(p => p.tmdbId)))
            setShowSequelPrompt(true)
            return
          }
        }
      }
      onClose()
    } catch {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSequels() {
    if (!savedEntry) return
    setAddingSequels(true)
    let added = 0
    for (const part of collectionParts) {
      if (!selectedParts.has(part.tmdbId)) continue
      try {
        const meta = await fetchMetadata(part.tmdbId, 'movie', region)
        if (!meta) continue
        const entry = buildEntry(meta, { status, priority, personalRating: null, notes: '', sourceType, sourceName, sourceNote })
        await onAdd(entry)
        added++
      } catch { /* skip failed parts */ }
    }
    toast(`Added ${added} more title${added !== 1 ? 's' : ''} from the collection!`, 'success')
    setAddingSequels(false)
    onClose()
  }

  const rating = metadata?.ratings.imdb ?? metadata?.ratings.tmdb ?? selected?.rating

  // ── Sequel prompt screen ─────────────────────────────────────────────────────
  if (showSequelPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
        <div className="relative w-full max-w-lg rounded-3xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
          <div className="p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'var(--accent-dim)' }}>🎬</div>
              <div>
                <h2 className="font-bold text-base">Add the full collection?</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--accent)' }}>{metadata?.title}</span> is part of <strong style={{ color: 'var(--text)' }}>{collectionName}</strong>. Add the rest too?
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
              {collectionParts.map(part => {
                const checked = selectedParts.has(part.tmdbId)
                return (
                  <button key={part.tmdbId}
                    onClick={() => setSelectedParts(prev => {
                      const next = new Set(prev)
                      if (checked) next.delete(part.tmdbId); else next.add(part.tmdbId)
                      return next
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                    style={{ background: checked ? 'var(--accent-dim)' : 'var(--card)', border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}` }}>
                    {part.poster
                      ? <Image src={part.poster} alt={part.title} width={36} height={52} className="rounded-lg object-cover flex-shrink-0" style={{ width: 36, height: 52 }} />
                      : <div className="w-9 h-13 rounded-lg flex-shrink-0" style={{ background: 'var(--border)', width: 36, height: 52 }} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{part.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {part.releaseYear ?? '—'}{part.rating ? ` · ⭐ ${part.rating}` : ''}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: checked ? 'var(--accent)' : 'transparent', border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}` }}>
                      {checked && <Check size={12} color="#0A0D14" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                Skip
              </button>
              <button onClick={handleAddSequels} disabled={addingSequels || selectedParts.size === 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                {addingSequels
                  ? <><Loader2 size={14} className="animate-spin" /> Adding…</>
                  : <><Plus size={14} /> Add {selectedParts.size} title{selectedParts.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main modal ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-bold">Add to Watchlist</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/5 transition-all" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Search */}
          {!selected && (
            <>
              <SearchBar query={query} onChange={search} onClear={clear} searching={searching} autoFocus placeholder="Enter movie or series name…" />
              {error && <p className="text-sm text-red-400">{error}</p>}

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map(r => (
                    <button key={r.tmdbId} onClick={() => handleSelectResult(r)}
                      className="w-full flex items-center gap-4 rounded-2xl p-3 text-left transition-all hover:bg-white/5"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      {r.poster
                        ? <Image src={r.poster} alt={r.title} width={44} height={64} className="rounded-lg object-cover flex-shrink-0" style={{ width: 44, height: 64 }} />
                        : <div className="w-11 h-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--border)' }}>
                            {r.type === 'movie' ? <Film size={18} style={{ color: 'var(--muted)' }} /> : <Tv size={18} style={{ color: 'var(--muted)' }} />}
                          </div>
                      }
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.title}</div>
                        <div className="text-sm flex items-center gap-2 mt-0.5" style={{ color: 'var(--muted)' }}>
                          <span>{r.type === 'movie' ? '🎬 Movie' : '📺 Series'}</span>
                          {r.releaseYear && <span>· {r.releaseYear}</span>}
                          {r.rating && <span>· ⭐ {r.rating}</span>}
                        </div>
                        {r.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{r.description}</p>}
                      </div>
                      <ChevronRight size={16} className="flex-shrink-0 ml-auto" style={{ color: 'var(--muted)' }} />
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>
                  No results found for &ldquo;{query}&rdquo;
                </div>
              )}
            </>
          )}

          {/* Duplicate warning */}
          {selected && duplicate && (
            <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-amber-400 font-semibold mb-1">⚠️ Already in your watchlist</p>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>&ldquo;{selected.title}&rdquo; is already saved.</p>
              <button onClick={() => { setSelected(null); clear() }}
                className="text-sm px-4 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                Search again
              </button>
            </div>
          )}

          {/* Fetching metadata */}
          {selected && !duplicate && fetchingMeta && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Fetching details…</p>
            </div>
          )}

          {/* Metadata preview + user fields */}
          {selected && !duplicate && metadata && !fetchingMeta && (
            <>
              {/* Title card */}
              <div className="flex gap-4 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {metadata.poster
                  ? <Image src={metadata.poster} alt={metadata.title} width={72} height={108} className="rounded-xl object-cover flex-shrink-0" style={{ width: 72, height: 108 }} />
                  : <div className="w-18 h-28 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--border)' }}>
                      <Film size={24} style={{ color: 'var(--muted)' }} />
                    </div>
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
                  {metadata.collectionName && (
                    <p className="text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      Part of {metadata.collectionName}
                    </p>
                  )}
                  {metadata.seriesInfo && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {metadata.seriesInfo.seasons} Season{metadata.seriesInfo.seasons !== 1 ? 's' : ''} · {metadata.seriesInfo.episodes} Episodes
                    </p>
                  )}
                  {metadata.runtimeMinutes && metadata.type === 'movie' && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>⏱ {metadata.runtimeMinutes} min</p>
                  )}
                  {metadata.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>{metadata.description}</p>}
                  {metadata.availability.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {metadata.availability.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(45,212,191,0.1)', color: 'var(--teal)' }}>
                          {a.platform}
                        </span>
                      ))}
                    </div>
                  )}
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
                  <input value={sourceName} onChange={e => setSourceName(e.target.value)}
                    placeholder="e.g. Amit" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
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

              {metadata.collectionId && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  🎬 Part of <strong>{metadata.collectionName}</strong> — you&apos;ll be asked to add the rest after saving.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setSelected(null); setMetadata(null); clear() }}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all hover:bg-white/5"
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
        </div>
      </div>
    </div>
  )
}
