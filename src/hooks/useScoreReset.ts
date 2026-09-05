import { useCallback, useState } from 'react'

const KEY = 'fusve:scoreResetAt'

/**
 * Data a partir da qual o score/ranking de fornecedores passa a contar — permite
 * "zerar" o histórico sem apagar OCs. Guardado em localStorage (mesmo padrão do
 * `fusve:sidebarColapsada`): só o Everton opera o sistema hoje, não precisa de
 * tabela nova no banco pra isso.
 */
export function useScoreReset() {
  const [resetAt, setResetAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  })

  const resetar = useCallback(() => {
    const agora = new Date().toISOString()
    try {
      localStorage.setItem(KEY, agora)
    } catch {
      /* localStorage indisponível — segue só em memória */
    }
    setResetAt(agora)
  }, [])

  const limpar = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* localStorage indisponível */
    }
    setResetAt(null)
  }, [])

  return { resetAt, resetar, limpar }
}
