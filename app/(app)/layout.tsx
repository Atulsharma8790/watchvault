'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, Tv, Settings, Clapperboard } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/watchlist', icon: List, label: 'My Watchlist' },
  { href: '/available', icon: Tv, label: 'Available for Me' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex w-56 flex-shrink-0 flex-col fixed top-0 left-0 h-screen"
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
          {/* Logo */}
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
                  style={{
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--muted)',
                  }}>
                  <item.icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Region: India (IN)</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Data stored locally</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:ml-56 pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>
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
        </nav>
      </div>
    </ToastProvider>
  )
}
