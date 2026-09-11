'use client'

interface StarRatingProps {
  value: number | null
  onChange?: (v: number) => void
  max?: number
  readOnly?: boolean
  size?: 'sm' | 'md'
}

export function StarRating({ value, onChange, max = 5, readOnly = false, size = 'md' }: StarRatingProps) {
  const sz = size === 'sm' ? 'text-sm' : 'text-xl'
  return (
    <div className={`flex gap-0.5 ${sz}`}>
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(i + 1)}
          className={`transition-transform ${readOnly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
          style={{ color: i < (value ?? 0) ? '#E8C547' : 'rgba(255,255,255,0.15)' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}
