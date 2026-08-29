import { useMemo, useState, type ReactNode } from 'react'
import { HistoricoContext, type EntradaHistorico } from '@/hooks/useHistoricoConsultas'

const LIMITE = 50

export function HistoricoConsultasProvider({ children }: { children: ReactNode }) {
  const [entradas, setEntradas] = useState<EntradaHistorico[]>([])

  const registrar = (entrada: Omit<EntradaHistorico, 'ts'>) => {
    const ts = new Date().toLocaleTimeString('pt-BR')
    setEntradas((prev) => [{ ts, ...entrada }, ...prev].slice(0, LIMITE))
  }

  const value = useMemo(() => ({ entradas, registrar }), [entradas])

  return <HistoricoContext.Provider value={value}>{children}</HistoricoContext.Provider>
}
