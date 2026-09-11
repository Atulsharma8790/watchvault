'use client'

import { useState } from 'react'
import { Save, Download, Upload, Trash2, Check } from 'lucide-react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/components/ui/Toast'
import type { UserSettings } from '@/lib/types/watchlist'

const ALL_PLATFORMS = [
  'Netflix', 'Amazon Prime Video', 'Disney+ Hotstar', 'JioCinema', 'SonyLIV',
  'Zee5', 'Apple TV+', 'Mubi', 'Lionsgate Play', 'Hungama Play', 'Eros Now',
  'Voot', 'Alt Balaji', 'Discovery+', 'Paramount+', 'HBO Max',
]

const REGIONS = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
]

export default function SettingsPage() {
  const { settings, saveSettings, exportJson, importJson, clearAll } = useWatchlist()
  const { toast } = useToast()
  const [local, setLocal] = useState<UserSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [importing, setImporting] = useState(false)

  function togglePlatform(p: string) {
    setLocal(s => ({
      ...s,
      ottPlatforms: s.ottPlatforms.includes(p)
        ? s.ottPlatforms.filter(x => x !== p)
        : [...s.ottPlatforms, p],
    }))
    setSaved(false)
  }

  async function handleSave() {
    await saveSettings(local)
    setSaved(true)
    toast('Settings saved', 'success')
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExportJson() {
    const data = await exportJson()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `watchvault-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Exported successfully', 'success')
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const result = await importJson(ev.target?.result as string, 'merge')
        toast(`Imported ${result.added} title${result.added !== 1 ? 's' : ''} (${result.skipped} skipped)`, 'success')
      } catch {
        toast('Import failed — invalid file', 'error')
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleClear() {
    if (!clearConfirm) { setClearConfirm(true); return }
    await clearAll()
    setClearConfirm(false)
    toast('All data cleared', 'success')
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Customize your WatchVault experience</p>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: saved ? 'var(--green, #22C55E)' : 'var(--accent)', color: '#0A0D14' }}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Region */}
      <Section title="Region" subtitle="Determines which OTT platforms and pricing are shown">
        <select value={local.region} onChange={e => { setLocal(s => ({ ...s, region: e.target.value })); setSaved(false) }}
          className="rounded-xl px-4 py-2.5 text-sm outline-none w-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label} ({r.code})</option>)}
        </select>
      </Section>

      {/* OTT Platforms */}
      <Section title="My Streaming Platforms" subtitle={`${local.ottPlatforms.length} selected — used for availability filtering and Smart Pick`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_PLATFORMS.map(p => {
            const active = local.ottPlatforms.includes(p)
            return (
              <button key={p} onClick={() => togglePlatform(p)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
                style={{ background: active ? 'var(--teal-dim)' : 'var(--surface)', border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`, color: active ? 'var(--teal)' : 'var(--muted)' }}>
                <span className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-xs"
                  style={{ background: active ? 'var(--teal)' : 'transparent', border: active ? 'none' : '1px solid var(--border-strong)' }}>
                  {active && '✓'}
                </span>
                <span className="truncate">{p}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Data management */}
      <Section title="Data Management" subtitle="Export, import, or clear your local watchlist data">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-semibold">Export JSON</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Download all your watchlist data as a backup</p>
            </div>
            <button onClick={handleExportJson}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <Download size={14} /> Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-semibold">Import JSON</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Merge entries from a previously exported file</p>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: importing ? 'var(--muted)' : 'var(--text)' }}>
              <Upload size={14} /> {importing ? 'Importing…' : 'Import'}
              <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-semibold">Clear All Data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Permanently delete your entire watchlist</p>
            </div>
            <button onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: clearConfirm ? 'rgba(239,68,68,0.15)' : 'var(--card)', border: `1px solid ${clearConfirm ? 'var(--red, #EF4444)' : 'var(--border)'}`, color: clearConfirm ? 'var(--red, #EF4444)' : 'var(--text)' }}>
              <Trash2 size={14} /> {clearConfirm ? 'Confirm Delete' : 'Clear All'}
            </button>
          </div>
          {clearConfirm && (
            <p className="text-xs text-center" style={{ color: 'var(--red, #EF4444)' }}>
              Click "Confirm Delete" again to permanently erase all data. This cannot be undone.
              <button onClick={() => setClearConfirm(false)} className="ml-2 underline">Cancel</button>
            </p>
          )}
        </div>
      </Section>

      {/* About */}
      <Section title="About" subtitle="">
        <div className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
          <p><span style={{ color: 'var(--text)' }}>WatchVault</span> — Personal Watchlist Intelligence</p>
          <p>All data is stored locally in your browser. No account required.</p>
          <p>Movie & series data provided by <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>TMDB</a>. Streaming availability via JustWatch data.</p>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="font-bold mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}
