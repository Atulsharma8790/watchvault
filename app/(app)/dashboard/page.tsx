'use client'

import { useState, useMemo } from 'react'
import { Plus, Shuffle, Film, Tv, Clock, CheckCircle, Play, Pause, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useWatchlist } from '@/hooks/useWatchlist'
import { AddTitleModal } from '@/components/search/AddTitleModal'
import { DetailModal } from '@/components/watchlist/DetailModal'
import { WatchCard } from '@/components/watchlist/WatchCard'
import { PRIORITY_ORDER } from '@/lib/types/watchlist'
import type { WatchlistEntry } from '@/lib/types/watchlist'
import { useToast } from '@/components/ui/Toast'

export default function DashboardPage() {
  const { entries, loading, settings, addEntry, updateEntry, removeEntry, checkDuplicate, reload } = useWatchlist()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<WatchlistEntry | null>(null)
  const [smartPick, setSmartPick] = useState<WatchlistEntry | null>(null)

  const stats = useMemo(() => ({
    total: entries.length,
    movies: entries.filter(e => e.type === 'movie').length,
    series: entries.filter(e => e.type === 'series').length,
    unwatched: entries.filter(e => e.watchStatus === 'want_to_watch').length,
    watching: entries.filter(e => e.watchStatus === 'watching').length,
    watched: entries.filter(e => e.watchStatus === 'watched').length,
    paused: entries.filter(e => e.watchStatus === 'paused').length,
  }), [entries])

  const mustWatch = useMemo(() =>
    entries.filter(e => e.priority === 'must_watch' && e.watchStatus !== 'watched').slice(0, 6), [entries])

  const topRated = useMemo(() =>
    entries
      .filter(e => e.watchStatus === 'want_to_watch')
      .sort((a, b) => (b.ratings.imdb ?? b.ratings.tmdb ?? 0) - (a.ratings.imdb ?? a.ratings.tmdb ?? 0))
      .slice(0, 6), [entries])

  const availableNow = useMemo(() =>
    entries.filter(e =>
      e.watchStatus !== 'watched' &&
      e.availabilityStatus === 'streaming' &&
      e.availability.some(a => settings.ottPlatforms.includes(a.platform) && (a.type === 'stream' || a.type === 'free'))
    ).slice(0, 6), [entries, settings])

  function pickForMe() {
    const candidates = entries.filter(e =>
      e.watchStatus === 'want_to_watch' || e.watchStatus === 'paused'
    )
    if (!candidates.length) { toast('No unwatched titles to pick from!', 'info'); return }

    // Weighted score
    const scored = candidates.map(e => {
      const prio = PRIORITY_ORDER[e.priority] * 3
      const rating = (e.ratings.imdb ?? e.ratings.tmdb ?? 5) * 0.5
      const avail = e.availabilityStatus === 'streaming' ? 2 : e.availabilityStatus === 'free' ? 2 : 0
      const onMyOtt = e.availability.some(a => settings.ottPlatforms.includes(a.platform)) ? 3 : 0
      const jitter = Math.random() * 2
      return { entry: e, score: prio + rating + avail + onMyOtt + jitter }
    })
    scored.sort((a, b) => b.score - a.score)
    setSmartPick(scored[0].entry)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading your watchlist…</p>
      </div>
    </div>
  )

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Your personal watchlist intelligence</p>
        </div>
        <div className="flex gap-2">
          <button onClick={pickForMe}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <Shuffle size={15} /> Pick for me
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            <Plus size={15} /> Add Title
          </button>
        </div>
      </div>

      {/* Smart Pick Result */}
      {smartPick && (
        <div className="mb-8 rounded-3xl p-5 flex gap-5 items-center relative"
          style={{ background: 'var(--card)', border: '1px solid var(--accent)', boxShadow: '0 0 30px rgba(232,197,71,0.08)' }}>
          <button onClick={() => setSmartPick(null)} className="absolute top-3 right-3 rounded-lg p-1 hover:bg-white/5" style={{ color: 'var(--muted)' }}>✕</button>
          {smartPick.poster && (
            <Image src={smartPick.poster} alt={smartPick.title} width={70} height={105} className="rounded-xl object-cover flex-shrink-0" style={{ width: 70, height: 105 }} />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>🎲 Tonight&apos;s Pick</p>
            <h3 className="text-xl font-black truncate">{smartPick.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {(smartPick.ratings.imdb ?? smartPick.ratings.tmdb) && <span>⭐ {smartPick.ratings.imdb ?? smartPick.ratings.tmdb}</span>}
              {smartPick.genres.slice(0, 2).map(g => <span key={g}>{g}</span>)}
              {smartPick.runtimeMinutes && smartPick.type === 'movie' && <span>⏱ {smartPick.runtimeMinutes} min</span>}
            </div>
            {smartPick.availability.filter(a => settings.ottPlatforms.includes(a.platform)).length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--teal)' }}>
                📺 {smartPick.availability.filter(a => settings.ottPlatforms.includes(a.platform)).map(a => a.platform).join(', ')}
              </p>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              Why: {smartPick.priority === 'must_watch' ? '🔥 Must watch' : smartPick.priority === 'high' ? '⬆ High priority' : 'Unwatched'} · {smartPick.availabilityStatus === 'streaming' ? 'available to stream' : 'in your list'}
            </p>
          </div>
          <button onClick={() => setSelected(smartPick)}
            className="ml-auto flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            View
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: Film, color: 'var(--accent)' },
          { label: 'Unwatched', value: stats.unwatched, icon: Clock, color: 'var(--indigo, #818CF8)' },
          { label: 'Watching', value: stats.watching, icon: Play, color: 'var(--teal)' },
          { label: 'Watched', value: stats.watched, icon: CheckCircle, color: 'var(--green, #22C55E)' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{s.label}</span>
            </div>
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              {s.label === 'Total' && <><span>{stats.movies} movies</span><span>{stats.series} series</span></>}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="text-center py-24 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-xl font-bold mb-2">Your watchlist is empty</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
            Found something interesting? Search for a movie or series and we&apos;ll fetch the details for you.
          </p>
          <button onClick={() => setShowAdd(true)}
            className="px-6 py-3 rounded-2xl text-sm font-bold" style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            Add Your First Title
          </button>
        </div>
      )}

      {/* Must Watch section */}
      {mustWatch.length > 0 && (
        <Section title="🔥 Must Watch" onViewAll="/watchlist?priority=must_watch">
          {mustWatch.map(e => <WatchCard key={e.id} entry={e} onClick={() => setSelected(e)} />)}
        </Section>
      )}

      {/* Available Now */}
      {availableNow.length > 0 && (
        <Section title="📺 Available on My Platforms" onViewAll="/available">
          {availableNow.map(e => <WatchCard key={e.id} entry={e} onClick={() => setSelected(e)} />)}
        </Section>
      )}

      {/* Top Rated Unwatched */}
      {topRated.length > 0 && (
        <Section title="⭐ Highest Rated — Unwatched" onViewAll="/watchlist">
          {topRated.map(e => <WatchCard key={e.id} entry={e} onClick={() => setSelected(e)} />)}
        </Section>
      )}

      {/* Modals */}
      {showAdd && (
        <AddTitleModal onClose={() => setShowAdd(false)} onAdd={addEntry} checkDuplicate={checkDuplicate} region={settings.region} />
      )}
      {selected && (
        <DetailModal entry={selected} onClose={() => setSelected(null)} onUpdate={updateEntry} onDelete={async id => { await removeEntry(id); setSelected(null) }} />
      )}
    </div>
  )
}

function Section({ title, onViewAll, children }: { title: string; onViewAll: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base">{title}</h2>
        <a href={onViewAll} className="text-xs font-medium transition-all hover:opacity-80" style={{ color: 'var(--accent)' }}>View all →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {children}
      </div>
    </section>
  )
}
