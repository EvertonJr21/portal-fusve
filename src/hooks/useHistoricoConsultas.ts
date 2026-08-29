import { createContext, useContext } from 'react'

export interface EntradaHistorico {
  ts: string
  cod: string
  nome: string
  tipo: 'consulta' | 'cotacao'
}

export interface HistoricoContextValue {
  entradas: EntradaHistorico[]
  registrar: (entrada: Omit<EntradaHistorico, 'ts'>) => void
}

export const HistoricoContext = createContext<HistoricoContextValue | null>(null)

/** Histórico de consultas do módulo Pareceres — só de sessão, nunca persiste (mesmo comportamento do legado). */
export function useHistoricoConsultas(): HistoricoContextValue {
  const ctx = useContext(HistoricoContext)
  if (!ctx) throw new Error('useHistoricoConsultas deve ser usado dentro de <HistoricoConsultasProvider>')
  return ctx
}
