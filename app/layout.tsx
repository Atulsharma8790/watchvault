import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WatchVault — Your Personal Watchlist Intelligence',
  description: 'Save what you want to watch. Know where to watch it. Never lose a recommendation again.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
