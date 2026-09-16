'use client'

import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await signIn(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="WatchVault" width={28} height={28} />
            <span className="font-black text-base">WatchVault</span>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/5" style={{ color: 'var(--muted)' }}><X size={16} /></button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {!sent ? (
            <>
              <h2 className="text-xl font-black mb-1">Sign in</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
                Enter your email — we'll send a magic link. No password needed.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <Mail size={16} style={{ color: 'var(--muted)' }} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com" autoFocus required
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                {error && <p className="text-xs" style={{ color: 'var(--red, #EF4444)' }}>{error}</p>}
                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  {loading ? 'Sending…' : 'Send Magic Link'}
                </button>
              </form>
              <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>
                Signing in syncs your watchlist across all devices in real-time.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--teal)' }} />
              <h2 className="text-lg font-black mb-2">Check your email</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                Click the link to sign in — it works on any device.
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>Didn't get it? Check your spam folder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
