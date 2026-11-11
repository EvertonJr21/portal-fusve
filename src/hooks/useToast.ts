import { createContext, useContext } from 'react'

export type ToastKind = 'info' | 'warn' | 'error'

/** Botão dentro do aviso (ex.: "Desfazer") — com ação, o aviso fica mais tempo na tela. */
export interface ToastAcao {
  rotulo: string
  onClick: () => void
}

export interface ToastContextValue {
  show: (message: string, kind?: ToastKind, acao?: ToastAcao) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
