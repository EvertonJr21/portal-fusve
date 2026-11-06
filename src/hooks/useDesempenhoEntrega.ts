import { useCallback, useMemo, useState } from 'react'
import { PRAZO_PADRAO_ENTREGA_DIAS } from '@/constants'
import { useContratos } from '@/hooks/useContratos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { getHoje } from '@/utils/date'
import { avaliarOCs, prazosContratuais } from '@/utils/kpis'

const KEY = 'fusve:prazoPadraoEntrega'

function lerPrazo(): number {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isInteger(v) && v > 0 ? v : PRAZO_PADRAO_ENTREGA_DIAS
  } catch {
    return PRAZO_PADRAO_ENTREGA_DIAS
  }
}

/** Prazo padrão de entrega (sem contrato) — preferência por navegador, mesmo padrão de `fusve:sidebarColapsada`. */
export function usePrazoPadraoEntrega() {
  const [prazo, setPrazoState] = useState<number>(lerPrazo)
  const setPrazo = useCallback((dias: number) => {
    const v = Number.isInteger(dias) && dias > 0 ? dias : PRAZO_PADRAO_ENTREGA_DIAS
    try {
      localStorage.setItem(KEY, String(v))
    } catch {
      /* localStorage indisponível — fica só em memória */
    }
    setPrazoState(v)
  }, [])
  return { prazo, setPrazo }
}

/**
 * Carrega OCs, fornecedores e contratos do hospital ativo e avalia cada OC pelo
 * motor único de `kpis.ts`. Usado por todas as telas de desempenho de entrega.
 */
export function useAvaliacoesEntrega() {
  const { hospitalId } = useHospital()
  const ocsQ = useOCs(hospitalId)
  const fornsQ = useFornecedores()
  const contratosQ = useContratos(hospitalId)
  const { prazo, setPrazo } = usePrazoPadraoEntrega()

  const ocs = ocsQ.data
  const forns = fornsQ.data
  const contratos = contratosQ.data

  const prazos = useMemo(() => prazosContratuais(contratos ?? [], forns ?? []), [contratos, forns])
  const avaliacoes = useMemo(() => avaliarOCs(ocs ?? [], prazos, prazo, getHoje()), [ocs, prazos, prazo])

  return {
    avaliacoes,
    ocs: ocs ?? [],
    forns: forns ?? [],
    prazos,
    prazoPadrao: prazo,
    setPrazoPadrao: setPrazo,
    isLoading: ocsQ.isLoading || fornsQ.isLoading || contratosQ.isLoading,
    error: ocsQ.error ?? fornsQ.error ?? contratosQ.error,
  }
}
