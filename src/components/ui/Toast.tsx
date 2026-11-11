import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastAcao, type ToastKind } from '@/hooks/useToast'

const KIND_CLASS: Record<ToastKind, string> = {
  info: 'bg-slate-900',
  warn: 'bg-amber-600',
  error: 'bg-red-600',
}

const DURACAO_MS = 2800
const DURACAO_COM_ACAO_MS = 7000
const SAIDA_MS = 200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; acao?: ToastAcao } | null>(null)
  const [saindo, setSaindo] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saidaRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, kind: ToastKind = 'info', acao?: ToastAcao) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (saidaRef.current) clearTimeout(saidaRef.current)
    setSaindo(false)
    setToast({ message, kind, acao })
    timeoutRef.current = setTimeout(() => {
      setSaindo(true)
      saidaRef.current = setTimeout(() => setToast(null), SAIDA_MS)
    }, acao ? DURACAO_COM_ACAO_MS : DURACAO_MS)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 z-[60] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-soft-lg transition-all duration-200 ease-out ${
            saindo ? 'translate-y-1 opacity-0' : 'animate-slide-up opacity-100'
          } ${KIND_CLASS[toast.kind]}`}
        >
          {toast.message}
          {toast.acao && (
            <button
              type="button"
              onClick={() => {
                toast.acao?.onClick()
                setToast(null)
              }}
              className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-white/25"
            >
              {toast.acao.rotulo}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}
