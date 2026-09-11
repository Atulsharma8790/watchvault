'use client'

import Image from 'next/image'
import { Film, Tv, ExternalLink } from 'lucide-react'
import { StatusBadge, PriorityBadge, AvailabilityBadge, TypeBadge } from '@/components/ui/Badge'
import { StarRating } from '@/components/ui/StarRating'
import type { WatchlistEntry } from '@/lib/types/watchlist'

interface Props {
  entry: WatchlistEntry
  onClick: () => void
}

export function WatchCard({ entry, onClick }: Props) {
  const rating = entry.ratings.imdb ?? entry.ratings.tmdb
  const streamPlatforms = entry.availability.filter(a => a.type === 'stream' || a.type === 'free')

  return (
    <button onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
        {entry.poster
          ? <Image src={entry.poster} alt={entry.title} fill className="object-cover transition-transform group-hover:scale-105" />
          : <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--card)' }}>
              {entry.type === 'movie' ? <Film size={40} style={{ color: 'var(--border-strong)' }} /> : <Tv size={40} style={{ color: 'var(--border-strong)' }} />}
            </div>
        }
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <PriorityBadge priority={entry.priority} size="xs" />
          <StatusBadge status={entry.watchStatus} size="xs" />
        </div>
        {/* Rating */}
        {rating && (
          <div className="absolute bottom-2 left-2 text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--accent)' }}>
            ⭐ {rating}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm leading-tight truncate">{entry.title}</p>
        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          {entry.releaseYear && <span>{entry.releaseYear}</span>}
          {entry.releaseYear && (entry.type || entry.genres.length) && <span>·</span>}
          <span>{entry.type === 'movie' ? 'Movie' : 'Series'}</span>
        </p>
        {entry.genres.length > 0 && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{entry.genres.slice(0, 2).join(' · ')}</p>
        )}

        {/* Streaming platforms */}
        {streamPlatforms.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {streamPlatforms.slice(0, 2).map((a, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                {a.platform}
              </span>
            ))}
          </div>
        ) : (
          <AvailabilityBadge status={entry.availabilityStatus} />
        )}

        {entry.personalRating && (
          <div className="mt-2">
            <StarRating value={entry.personalRating} readOnly size="sm" />
          </div>
        )}

        {entry.source.name && (
          <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--muted)' }}>
            From: {entry.source.name}
          </p>
        )}
      </div>
    </button>
  )
}
