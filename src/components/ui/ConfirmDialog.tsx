import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmOptions } from '@/hooks/useConfirm'
import { Button } from './Button'
import { Modal } from './Modal'

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setPending(typeof options === 'string' ? { message: options, resolve } : { ...options, resolve })
    })
  }, [])

  const responder = (value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setPending(null)
  }

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <Modal title={pending.title ?? 'Confirmar ação'} onClose={() => responder(false)}>
          <p className="text-sm text-slate-600">{pending.message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => responder(false)}>
              Cancelar
            </Button>
            <Button
              className={pending.tone === 'danger' ? 'bg-status-red hover:bg-status-red/90' : ''}
              onClick={() => responder(true)}
            >
              {pending.confirmLabel ?? 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}
