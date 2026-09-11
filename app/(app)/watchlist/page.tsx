'use client'

import { useState, useEffect } from 'react'
import { Plus, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { WatchCard } from '@/components/watchlist/WatchCard'
import { DetailModal } from '@/components/watchlist/DetailModal'
import { AddTitleModal } from '@/components/search/AddTitleModal'
import { SearchBar } from '@/components/search/SearchBar'
import type { WatchlistEntry, SortField } from '@/lib/types/watchlist'
import { DEFAULT_FILTERS } from '@/lib/types/watchlist'

const GENRES = ['Action', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller']

export default function WatchlistPage() {
  const { entries, loading, filters, sort, settings, setFilters, setSort, addEntry, updateEntry, removeEntry, checkDuplicate } = useWatchlist()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<WatchlistEntry | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [localQuery, setLocalQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, query: localQuery })), 200)
    return () => clearTimeout(t)
  }, [localQuery, setFilters])

  const activeFilterCount = [
    filters.type !== 'all', filters.status !== 'all', filters.priority !== 'all',
    filters.genre, filters.platform, filters.minRating !== null,
    filters.availabilityStatus !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
    setLocalQuery('')
  }

  return (
    <div className="p-5 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">My Watchlist</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {loading ? '…' : `${entries.length} title${entries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
            className="p-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            {view === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative"
            style={{ background: showFilters ? 'var(--accent-dim)' : 'var(--card)', border: `1px solid ${showFilters ? 'var(--accent)' : 'var(--border)'}`, color: showFilters ? 'var(--accent)' : 'var(--muted)' }}>
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchBar query={localQuery} onChange={setLocalQuery} onClear={() => setLocalQuery('')} searching={false} placeholder="Search titles, cast, genre, platform, notes…" />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-5 rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Type</label>
              <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value as typeof filters.type }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="all">All</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Status</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as typeof filters.status }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="all">All</option>
                <option value="want_to_watch">Want to Watch</option>
                <option value="watching">Watching</option>
                <option value="watched">Watched</option>
                <option value="paused">Paused</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Priority</label>
              <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value as typeof filters.priority }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="all">All</option>
                <option value="must_watch">🔥 Must Watch</option>
                <option value="high">⬆ High</option>
                <option value="normal">− Normal</option>
                <option value="low">⬇ Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Genre</label>
              <select value={filters.genre} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="">All Genres</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Platform</label>
              <input value={filters.platform} onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
                placeholder="Netflix, Prime…"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Min Rating</label>
              <select value={filters.minRating ?? ''} onChange={e => setFilters(f => ({ ...f, minRating: e.target.value ? parseFloat(e.target.value) : null }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="">Any Rating</option>
                {[9, 8.5, 8, 7.5, 7, 6.5].map(r => <option key={r} value={r}>⭐ {r}+</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Availability</label>
              <select value={filters.availabilityStatus} onChange={e => setFilters(f => ({ ...f, availabilityStatus: e.target.value as typeof filters.availabilityStatus }))}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="all">All</option>
                <option value="streaming">🟢 Streaming</option>
                <option value="rent_buy">🟡 Rent / Buy</option>
                <option value="free">🔵 Free</option>
                <option value="unavailable">🔴 Not Available</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Sort by</label>
              <select value={`${sort.field}-${sort.direction}`}
                onChange={e => {
                  const [field, dir] = e.target.value.split('-')
                  setSort({ field: field as SortField, direction: dir as 'asc' | 'desc' })
                }}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="createdAt-desc">Recently Added</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="ratingImdb-desc">Rating (High → Low)</option>
                <option value="ratingImdb-asc">Rating (Low → High)</option>
                <option value="title-asc">Title A → Z</option>
                <option value="title-desc">Title Z → A</option>
                <option value="releaseYear-desc">Year (Newest)</option>
                <option value="releaseYear-asc">Year (Oldest)</option>
                <option value="priority-desc">Priority</option>
                <option value="runtime-asc">Runtime (Short)</option>
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-all" style={{ color: 'var(--accent)' }}>
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl aspect-[2/3] animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🎬</div>
          <p className="font-semibold mb-1">{activeFilterCount > 0 ? 'No titles match your filters' : 'Nothing saved yet'}</p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            {activeFilterCount > 0 ? 'Try adjusting or clearing your filters.' : 'Start building your watchlist!'}
          </p>
          {activeFilterCount > 0
            ? <button onClick={clearFilters} className="text-sm px-4 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>Clear Filters</button>
            : <button onClick={() => setShowAdd(true)} className="text-sm px-5 py-2.5 rounded-xl font-bold" style={{ background: 'var(--accent)', color: '#0A0D14' }}>Add First Title</button>
          }
        </div>
      )}

      {/* Grid view */}
      {!loading && entries.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {entries.map(e => <WatchCard key={e.id} entry={e} onClick={() => setSelected(e)} />)}
        </div>
      )}

      {/* List view */}
      {!loading && entries.length > 0 && view === 'list' && (
        <div className="space-y-2">
          {entries.map(e => (
            <button key={e.id} onClick={() => setSelected(e)}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all hover:bg-white/3"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              {e.poster
                ? <img src={e.poster} alt={e.title} className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-10 h-14 rounded-lg flex-shrink-0" style={{ background: 'var(--border)' }} />
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{e.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {e.releaseYear} · {e.type === 'movie' ? 'Movie' : 'Series'} · {e.genres.slice(0, 2).join(', ')}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                {(e.ratings.imdb ?? e.ratings.tmdb) && <span style={{ color: 'var(--accent)' }}>⭐ {e.ratings.imdb ?? e.ratings.tmdb}</span>}
                {e.availability.slice(0, 1).map((a, i) => <span key={i} style={{ color: 'var(--teal)' }}>{a.platform}</span>)}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  e.watchStatus === 'watched' ? 'bg-green-500/15 text-green-400' :
                  e.watchStatus === 'watching' ? 'bg-teal-500/15 text-teal-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {e.watchStatus === 'want_to_watch' ? 'Want' : e.watchStatus === 'watching' ? 'Watching' : e.watchStatus === 'watched' ? 'Watched' : e.watchStatus}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddTitleModal onClose={() => setShowAdd(false)} onAdd={addEntry} checkDuplicate={checkDuplicate} region={settings.region} />}
      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} onUpdate={updateEntry} onDelete={async id => { await removeEntry(id); setSelected(null) }} />}
    </div>
  )
}
