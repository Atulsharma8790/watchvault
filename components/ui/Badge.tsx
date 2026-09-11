import type { WatchStatus, Priority, AvailabilityStatus, AvailabilityType } from '@/lib/types/watchlist'

const STATUS_STYLES: Record<WatchStatus, string> = {
  want_to_watch: 'bg-blue-500/15 text-blue-400',
  watching: 'bg-teal-500/15 text-teal-400',
  watched: 'bg-green-500/15 text-green-400',
  paused: 'bg-amber-500/15 text-amber-400',
  dropped: 'bg-red-500/15 text-red-400',
}
const STATUS_ICONS: Record<WatchStatus, string> = {
  want_to_watch: '🕐', watching: '▶', watched: '✓', paused: '⏸', dropped: '✗',
}

const PRIORITY_STYLES: Record<Priority, string> = {
  must_watch: 'bg-red-500/15 text-red-400',
  high: 'bg-orange-500/15 text-orange-400',
  normal: 'bg-gray-500/15 text-gray-400',
  low: 'bg-gray-600/10 text-gray-500',
}
const PRIORITY_ICONS: Record<Priority, string> = {
  must_watch: '🔥', high: '⬆', normal: '−', low: '⬇',
}

const AVAIL_STYLES: Record<AvailabilityStatus, string> = {
  streaming: 'bg-green-500/15 text-green-400',
  rent_buy: 'bg-amber-500/15 text-amber-400',
  free: 'bg-teal-500/15 text-teal-400',
  unavailable: 'bg-red-500/15 text-red-400',
  unknown: 'bg-gray-500/10 text-gray-500',
}
const AVAIL_ICONS: Record<AvailabilityStatus, string> = {
  streaming: '🟢', rent_buy: '🟡', free: '🔵', unavailable: '🔴', unknown: '⚪',
}
const AVAIL_LABELS: Record<AvailabilityStatus, string> = {
  streaming: 'Streaming', rent_buy: 'Rent / Buy', free: 'Free', unavailable: 'Not Available', unknown: 'Unknown',
}

const AVAIL_TYPE_LABELS: Record<AvailabilityType, string> = {
  stream: '▶ Stream', rent: '₹ Rent', buy: '₹ Buy', free: '★ Free',
}
const AVAIL_TYPE_STYLES: Record<AvailabilityType, string> = {
  stream: 'bg-green-500/15 text-green-400',
  rent: 'bg-amber-500/15 text-amber-400',
  buy: 'bg-orange-500/15 text-orange-400',
  free: 'bg-teal-500/15 text-teal-400',
}

interface BadgeProps { className?: string; size?: 'sm' | 'xs' }

export function StatusBadge({ status, size = 'sm' }: { status: WatchStatus } & BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} ${STATUS_STYLES[status]}`}>
      <span>{STATUS_ICONS[status]}</span>
      {status === 'want_to_watch' ? 'Want to Watch' : status === 'watching' ? 'Watching' : status === 'watched' ? 'Watched' : status === 'paused' ? 'Paused' : 'Dropped'}
    </span>
  )
}

export function PriorityBadge({ priority, size = 'sm' }: { priority: Priority } & BadgeProps) {
  const label = priority === 'must_watch' ? 'Must Watch' : priority === 'high' ? 'High' : priority === 'normal' ? 'Normal' : 'Low'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} ${PRIORITY_STYLES[priority]}`}>
      <span>{PRIORITY_ICONS[priority]}</span>{label}
    </span>
  )
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${AVAIL_STYLES[status]}`}>
      {AVAIL_ICONS[status]} {AVAIL_LABELS[status]}
    </span>
  )
}

export function AvailTypeBadge({ type }: { type: AvailabilityType }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AVAIL_TYPE_STYLES[type]}`}>
      {AVAIL_TYPE_LABELS[type]}
    </span>
  )
}

export function TypeBadge({ type }: { type: 'movie' | 'series' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400">
      {type === 'movie' ? '🎬 Movie' : '📺 Series'}
    </span>
  )
}
