'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Edit2, Trash2, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { StatusBadge, PriorityBadge, AvailabilityBadge, AvailTypeBadge, TypeBadge } from '@/components/ui/Badge'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Toast'
import type { WatchlistEntry, WatchStatus, Priority, SourceType } from '@/lib/types/watchlist'
import { SOURCE_LABELS, WATCH_STATUS_LABELS } from '@/lib/types/watchlist'

interface Props {
  entry: WatchlistEntry
  onClose: () => void
  onUpdate: (id: string, patch: Partial<WatchlistEntry>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function DetailModal({ entry, onClose, onUpdate, onDelete }: Props) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState<WatchStatus>(entry.watchStatus)
  const [priority, setPriority] = useState<Priority>(entry.priority)
  const [personalRating, setPersonalRating] = useState<number | null>(entry.personalRating)
  const [notes, setNotes] = useState(entry.personalNotes)
  const [sourceName, setSourceName] = useState(entry.source.name ?? '')
  const [sourceNote, setSourceNote] = useState(entry.source.note ?? '')
  const [sourceType, setSourceType] = useState<SourceType | ''>(entry.source.type ?? '')

  const imdbRating = entry.ratings.imdb ?? entry.ratings.tmdb

  async function save() {
    setSaving(true)
    try {
      await onUpdate(entry.id, {
        watchStatus: status,
        priority,
        personalRating,
        personalNotes: notes,
        source: { type: sourceType || null, name: sourceName || null, note: sourceNote || null },
      })
      toast('Updated successfully', 'success')
      setEditing(false)
    } catch { toast('Update failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(entry.id)
      toast(`"${entry.title}" removed`, 'info')
      onClose()
    } catch { toast('Delete failed', 'error'); setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>

        {/* Backdrop */}
        {entry.backdrop && (
          <div className="relative h-40 overflow-hidden rounded-t-3xl">
            <Image src={entry.backdrop} alt="" fill className="object-cover opacity-30" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, var(--surface))' }} />
          </div>
        )}

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 rounded-xl p-2 hover:bg-white/10 transition-all" style={{ color: 'var(--text)' }}>
          <X size={18} />
        </button>

        <div className="p-6 space-y-6">
          {/* Hero */}
          <div className="flex gap-5">
            <div className="flex-shrink-0">
              {entry.poster
                ? <Image src={entry.poster} alt={entry.title} width={100} height={150} className="rounded-2xl object-cover" style={{ width: 100, height: 150 }} />
                : <div className="w-24 h-36 rounded-2xl" style={{ background: 'var(--card)' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black leading-tight">{entry.title}</h2>
              {entry.originalTitle && entry.originalTitle !== entry.title && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{entry.originalTitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <TypeBadge type={entry.type} />
                {entry.releaseYear && <span className="text-sm" style={{ color: 'var(--muted)' }}>{entry.releaseYear}</span>}
                {imdbRating && <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>⭐ {imdbRating}</span>}
                {entry.runtimeMinutes && entry.type === 'movie' && <span className="text-sm" style={{ color: 'var(--muted)' }}>⏱ {entry.runtimeMinutes} min</span>}
              </div>
              {entry.seriesInfo && (
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {entry.seriesInfo.seasons} Season{entry.seriesInfo.seasons !== 1 ? 's' : ''} · {entry.seriesInfo.episodes} Episodes
                  {entry.seriesInfo.status && ` · ${entry.seriesInfo.status}`}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.genres.map(g => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--muted)' }}>{g}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <StatusBadge status={entry.watchStatus} />
                <PriorityBadge priority={entry.priority} />
                <AvailabilityBadge status={entry.availabilityStatus} />
              </div>
            </div>
          </div>

          {/* Description */}
          {entry.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{entry.description}</p>
          )}

          {/* OTT Availability */}
          {entry.availability.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Where to Watch</h3>
              <div className="grid gap-2">
                {entry.availability.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <span className="text-sm font-medium">{a.platform}</span>
                    <div className="flex items-center gap-3">
                      <AvailTypeBadge type={a.type} />
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold transition-all hover:opacity-80"
                          style={{ color: 'var(--teal)' }}>
                          Watch Now <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entry.availabilityStatus === 'unavailable' && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
              🔴 Not currently available for streaming in {entry.availability[0]?.region ?? 'IN'}
            </div>
          )}

          {/* Cast */}
          {entry.cast.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {entry.cast.slice(0, 10).map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--text)' }}>{c.name}</span>
                    {c.character && ` as ${c.character}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Directors / Creators */}
          {(entry.directors.length > 0 || entry.creators.length > 0) && (
            <div className="flex gap-8 text-sm">
              {entry.directors.length > 0 && (
                <div>
                  <span className="font-medium" style={{ color: 'var(--muted)' }}>Director: </span>
                  {entry.directors.join(', ')}
                </div>
              )}
              {entry.creators.length > 0 && (
                <div>
                  <span className="font-medium" style={{ color: 'var(--muted)' }}>Created by: </span>
                  {entry.creators.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Ratings row */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                {entry.ratings.imdb ? 'IMDb Rating' : 'TMDB Rating'}
              </p>
              <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>
                ⭐ {imdbRating ?? '—'}
              </p>
              {(entry.ratings.imdbVotes ?? entry.ratings.tmdbVotes) && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {((entry.ratings.imdbVotes ?? entry.ratings.tmdbVotes)! / 1000).toFixed(0)}K ratings
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>My Rating</p>
              {editing
                ? <StarRating value={personalRating} onChange={setPersonalRating} />
                : entry.personalRating
                  ? <StarRating value={entry.personalRating} readOnly />
                  : <p className="text-sm" style={{ color: 'var(--muted)' }}>Not rated yet</p>
              }
            </div>
          </div>

          {/* Source */}
          {(entry.source.type || entry.source.name || entry.source.note) && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-2">Why I Saved This</h3>
              {entry.source.type && <p className="text-sm"><span style={{ color: 'var(--muted)' }}>Source:</span> {SOURCE_LABELS[entry.source.type]}</p>}
              {entry.source.name && <p className="text-sm"><span style={{ color: 'var(--muted)' }}>From:</span> {entry.source.name}</p>}
              {entry.source.note && <p className="text-sm mt-1 italic" style={{ color: 'var(--muted)' }}>&ldquo;{entry.source.note}&rdquo;</p>}
            </div>
          )}

          {/* Personal notes */}
          {(entry.personalNotes || editing) && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Personal Notes</h3>
              {editing
                ? <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                : <p className="text-sm" style={{ color: 'var(--muted)' }}>{entry.personalNotes || '—'}</p>
              }
            </div>
          )}

          {/* Edit fields */}
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Status</label>
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
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Recommendation note</label>
                <input value={sourceNote} onChange={e => setSourceNote(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs flex gap-6" style={{ color: 'var(--muted)' }}>
            <span>Added {new Date(entry.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Save Changes
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
