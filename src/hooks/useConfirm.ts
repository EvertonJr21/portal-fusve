import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  tone?: 'default' | 'danger'
}

export type ConfirmContextValue = (options: ConfirmOptions | string) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

/** Substitui `window.confirm()` por um modal consistente com o resto do app — mesmo uso: `if (!(await confirm('Excluir X?'))) return`. */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx
}
