'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Star, Film, Tv } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { useToast } from '@/components/ui/Toast'
import { SearchBar } from './SearchBar'
import { StarRating } from '@/components/ui/StarRating'
import type { SearchResult, TitleMetadata, WatchlistEntry, WatchStatus, Priority, SourceType, RecommendationSource } from '@/lib/types/watchlist'
import { SOURCE_LABELS } from '@/lib/types/watchlist'
import Image from 'next/image'

interface Props {
  onClose: () => void
  onAdd: (entry: WatchlistEntry) => Promise<void>
  checkDuplicate: (tmdbId: number) => Promise<WatchlistEntry | null>
  region?: string
}

function generateId() {
  return `wv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function AddTitleModal({ onClose, onAdd, checkDuplicate, region = 'IN' }: Props) {
  const { query, results, searching, fetchingMeta, error, search, fetchMetadata, clear } = useSearch()
  const { toast } = useToast()
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [metadata, setMetadata] = useState<TitleMetadata | null>(null)
  const [duplicate, setDuplicate] = useState<WatchlistEntry | null>(null)
  const [saving, setSaving] = useState(false)

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
      const source: RecommendationSource = {
        type: sourceType || null,
        name: sourceName || null,
        note: sourceNote || null,
      }
      const now = new Date().toISOString()
      const entry: WatchlistEntry = {
        id: generateId(),
        ...metadata,
        watchStatus: status,
        priority,
        personalRating,
        personalNotes: notes,
        source,
        createdAt: now,
        updatedAt: now,
      }
      await onAdd(entry)
      toast(`"${metadata.title}" added to your watchlist!`, 'success')
      onClose()
    } catch (err) {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rating = metadata?.ratings.imdb ?? metadata?.ratings.tmdb ?? selected?.rating

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
