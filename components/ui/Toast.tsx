'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

interface ToastCtx { toast: (message: string, type?: Toast['type']) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const remove = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  const STYLES = {
    success: 'bg-green-900/80 border-green-700/50 text-green-200',
    error: 'bg-red-900/80 border-red-700/50 text-red-200',
    info: 'bg-gray-900/90 border-white/10 text-gray-100',
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur pointer-events-auto ${STYLES[t.type]}`}>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><X size={13} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() { return useContext(Ctx) }
