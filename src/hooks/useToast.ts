import { createContext, useContext } from 'react'

export type ToastKind = 'info' | 'warn' | 'error'

export interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
