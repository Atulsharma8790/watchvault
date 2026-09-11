'use client'

import { useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface Props {
  query: string
  onChange: (q: string) => void
  onClear: () => void
  searching: boolean
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({ query, onChange, onClear, searching, placeholder = 'Search movies & series…', autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        {searching
          ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
          : <Search size={18} style={{ color: 'var(--muted)' }} />
        }
      </div>
      <input
        ref={ref}
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl py-4 pl-12 pr-12 text-base outline-none transition-all"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-strong)')}
      />
      {query && (
        <button
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 transition-all hover:bg-white/10"
          style={{ color: 'var(--muted)' }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
