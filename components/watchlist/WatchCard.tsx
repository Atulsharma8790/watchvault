'use client'

import Image from 'next/image'
import { Film, Tv } from 'lucide-react'
import { StarRating } from '@/components/ui/StarRating'
import type { WatchlistEntry } from '@/lib/types/watchlist'

interface Props {
  entry: WatchlistEntry
  onClick: () => void
}

const STATUS_ACTIVE: Record<string, { label: string; color: string; bg: string }> = {
  watching: { label: '▶ Watching',  color: '#2DD4BF', bg: 'rgba(45,212,191,0.85)' },
  paused:   { label: '⏸ Paused',   color: '#F59E0B', bg: 'rgba(245,158,11,0.85)' },
  watched:  { label: '✓ Watched',   color: '#22C55E', bg: 'rgba(34,197,94,0.85)'  },
  dropped:  { label: '✗ Dropped',   color: '#EF4444', bg: 'rgba(239,68,68,0.85)'  },
}

const PRIORITY_NOTABLE: Record<string, { label: string; color: string }> = {
  must_watch: { label: '🔥', color: '#EF4444' },
  high:       { label: '⬆',  color: '#F97316' },
}

export function WatchCard({ entry, onClick }: Props) {
  const rating = entry.ratings.imdb ?? entry.ratings.tmdb
  const streamPlatforms = entry.availability.filter(a => a.type === 'stream' || a.type === 'free')
  const statusInfo = STATUS_ACTIVE[entry.watchStatus]
  const priorityInfo = PRIORITY_NOTABLE[entry.priority]

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden" style={{ background: '#0d1117' }}>
        {entry.poster
          ? <Image src={entry.poster} alt={entry.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="absolute inset-0 flex items-center justify-center">
              {entry.type === 'movie'
                ? <Film size={36} style={{ color: 'var(--border-strong)' }} />
                : <Tv size={36} style={{ color: 'var(--border-strong)' }} />}
            </div>
        }

        {/* Priority dot — top-left, only for must_watch / high */}
        {priorityInfo && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-lg"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            {priorityInfo.label}
          </div>
        )}

        {/* Rating — top-right */}
        {rating && (
          <div className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.75)', color: 'var(--accent)', backdropFilter: 'blur(4px)' }}>
            ⭐ {rating}
          </div>
        )}

        {/* Status strip — bottom of poster, only for active states */}
        {statusInfo && (
          <div className="absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-bold tracking-wide"
            style={{ background: statusInfo.bg, color: '#fff', backdropFilter: 'blur(2px)' }}>
            {statusInfo.label}
          </div>
        )}
      </div>

      {/* Info below poster */}
      <div className="p-3">
        <p className="font-semibold text-sm leading-snug line-clamp-2">{entry.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          {[entry.releaseYear, entry.type === 'movie' ? 'Movie' : 'Series'].filter(Boolean).join(' · ')}
        </p>

        {/* Streaming platforms */}
        {streamPlatforms.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {streamPlatforms.slice(0, 2).map((a, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                {a.platform}
              </span>
            ))}
          </div>
        ) : entry.availabilityStatus === 'rent_buy' ? (
          <p className="text-xs mt-1.5" style={{ color: '#F59E0B' }}>🟡 Rent / Buy</p>
        ) : entry.availabilityStatus === 'unavailable' ? (
          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>🔴 Not available</p>
        ) : null}

        {/* Personal rating */}
        {entry.personalRating && (
          <div className="mt-2">
            <StarRating value={entry.personalRating} readOnly size="sm" />
          </div>
        )}

        {/* Cast */}
        {entry.cast.length > 0 && (
          <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--muted)' }}>
            {entry.cast.slice(0, 3).map(c => c.name).join(', ')}
          </p>
        )}

        {/* Source */}
        {entry.source.name && (
          <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--muted)' }}>
            From {entry.source.name}
          </p>
        )}
      </div>
    </button>
  )
}
