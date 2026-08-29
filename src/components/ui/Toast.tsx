import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastKind } from '@/hooks/useToast'

const KIND_CLASS: Record<ToastKind, string> = {
  info: 'bg-slate-900',
  warn: 'bg-amber-600',
  error: 'bg-red-600',
}

const DURACAO_MS = 2800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ message, kind })
    timeoutRef.current = setTimeout(() => setToast(null), DURACAO_MS)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-lg ${KIND_CLASS[toast.kind]}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
