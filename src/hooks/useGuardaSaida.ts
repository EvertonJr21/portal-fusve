import { useCallback, useState } from 'react'
import { useConfirm } from '@/hooks/useConfirm'

/**
 * Protege um formulário em modal contra perda de dados: `marcar` vai no `onInput`
 * do `Modal` (dispara ao digitar, escolher numa lista ou marcar checkbox) e
 * `fechar` substitui o `onClose` no ✕ e no "Cancelar" — se algo foi alterado,
 * pede confirmação antes de descartar. Depois de salvar, chame o `onClose` original.
 */
export function useGuardaSaida(onClose: () => void) {
  const confirmar = useConfirm()
  const [alterado, setAlterado] = useState(false)
  const marcar = useCallback(() => setAlterado(true), [])

  const fechar = async () => {
    if (
      alterado &&
      !(await confirmar({
        message: 'Você tem alterações não salvas. Sair sem salvar?',
        tone: 'danger',
        confirmLabel: 'Descartar alterações',
      }))
    )
      return
    onClose()
  }

  /** Depois de salvar sem fechar (ex.: painel lateral que continua aberto). */
  const limpar = useCallback(() => setAlterado(false), [])

  return { alterado, marcar, fechar, limpar }
}
