'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, Tv, Settings, Clapperboard, LogIn, LogOut, Upload, User } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/hooks/useAuth'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/watchlist', icon: List, label: 'My Watchlist' },
  { href: '/available', icon: Tv, label: 'Available for Me' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { user, signOut } = useAuth()
  const { migrationPending, migrateLocalData } = useWatchlist()
  const [showAuth, setShowAuth] = useState(false)
  const [migrating, setMigrating] = useState(false)

  async function handleMigrate() {
    setMigrating(true)
    await migrateLocalData()
    setMigrating(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col fixed top-0 left-0 h-screen"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#0A0D14' }}>
              <Clapperboard size={15} />
            </div>
            <span className="font-black text-base tracking-tight" style={{ color: 'var(--text)' }}>WatchVault</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(item => {
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)' }}>
                <item.icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Auth footer */}
        <div className="px-4 py-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {user ? (
            <>
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
                  <User size={12} style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-xs truncate flex-1" style={{ color: 'var(--text)' }}>{user.email}</p>
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Syncing in real-time</p>
              </div>
              <button onClick={signOut}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium hover:bg-white/5 transition-all"
                style={{ color: 'var(--muted)' }}>
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <>
              <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>Data stored locally</p>
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(232,197,71,0.2)' }}>
                <LogIn size={13} /> Sign in to sync
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>
        {/* Migration banner */}
        {user && migrationPending && (
          <div className="flex items-center justify-between px-5 py-3 text-sm" style={{ background: 'rgba(232,197,71,0.08)', borderBottom: '1px solid rgba(232,197,71,0.2)' }}>
            <div>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>You have local data</span>
              <span style={{ color: 'var(--muted)' }}> — upload it to your cloud account to sync across devices</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button onClick={() => migrateLocalData()} disabled={migrating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#0A0D14' }}>
                <Upload size={11} /> {migrating ? 'Uploading…' : 'Upload now'}
              </button>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {NAV.map(item => {
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>
              <item.icon size={18} />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
        {/* Sign in icon on mobile */}
        {!user && (
          <button onClick={() => setShowAuth(true)} className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium"
            style={{ color: 'var(--accent)' }}>
            <LogIn size={18} />
            <span>Sync</span>
          </button>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  )
}
