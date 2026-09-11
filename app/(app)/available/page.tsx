'use client'

import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { useWatchlist } from '@/hooks/useWatchlist'
import { WatchCard } from '@/components/watchlist/WatchCard'
import { DetailModal } from '@/components/watchlist/DetailModal'
import { AddTitleModal } from '@/components/search/AddTitleModal'
import type { WatchlistEntry } from '@/lib/types/watchlist'

export default function AvailablePage() {
  const { entries, loading, settings, addEntry, updateEntry, removeEntry, checkDuplicate } = useWatchlist()
  const [selected, setSelected] = useState<WatchlistEntry | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const available = entries.filter(e =>
    e.watchStatus !== 'watched' &&
    e.availability.some(a =>
      settings.ottPlatforms.includes(a.platform) &&
      (a.type === 'stream' || a.type === 'free')
    )
  )

  const byPlatform = settings.ottPlatforms.reduce<Record<string, WatchlistEntry[]>>((acc, platform) => {
    const titles = entries.filter(e =>
      e.watchStatus !== 'watched' &&
      e.availability.some(a => a.platform === platform && (a.type === 'stream' || a.type === 'free'))
    )
    if (titles.length) acc[platform] = titles
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="p-5 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Available for Me</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {available.length} title{available.length !== 1 ? 's' : ''} on your platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <Settings size={14} /> Manage Platforms
          </Link>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Configured platforms summary */}
      {settings.ottPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {settings.ottPlatforms.map(p => (
            <span key={p} className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: byPlatform[p] ? 'var(--teal-dim)' : 'var(--card)', color: byPlatform[p] ? 'var(--teal)' : 'var(--muted)', border: '1px solid var(--border)' }}>
              {p} {byPlatform[p] ? `(${byPlatform[p].length})` : '(0)'}
            </span>
          ))}
        </div>
      )}

      {/* Empty: no platforms configured */}
      {settings.ottPlatforms.length === 0 && (
        <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">📺</div>
          <p className="font-semibold mb-1">No platforms configured</p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Set up your OTT subscriptions in Settings to see what you can watch right now.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            <Settings size={14} /> Go to Settings
          </Link>
        </div>
      )}

      {/* Empty: platforms set but nothing available */}
      {settings.ottPlatforms.length > 0 && available.length === 0 && (
        <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold mb-1">Nothing available on your platforms yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Add more titles and their streaming availability will show up here.
          </p>
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#0A0D14' }}>
            Add a Title
          </button>
        </div>
      )}

      {/* By platform */}
      {Object.entries(byPlatform).map(([platform, titles]) => (
        <section key={platform} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">{platform}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
              {titles.length} available
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {titles.map(e => <WatchCard key={e.id} entry={e} onClick={() => setSelected(e)} />)}
          </div>
        </section>
      ))}

      {showAdd && <AddTitleModal onClose={() => setShowAdd(false)} onAdd={addEntry} checkDuplicate={checkDuplicate} region={settings.region} />}
      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} onUpdate={updateEntry} onDelete={async id => { await removeEntry(id); setSelected(null) }} />}
    </div>
  )
}
