import { useMemo } from 'react'
import { FINAL_SIT } from '@/constants'
import { useContratos } from '@/hooks/useContratos'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useHistoricoRecentePorOC } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOpmes } from '@/hooks/useOpmes'
import { usePermissaoModulo } from '@/hooks/usePermissoes'
import type { HistOC } from '@/types'
import { getHoje } from '@/utils/date'
import { montarLinhas } from '@/utils/ocLista'
import { montarAlertas, resumoContratos, resumoOCs, resumoOpmes } from '@/utils/resumoDia'

/**
 * Resumo do dia do hospital ativo (tela inicial + sino do topo). Reaproveita as
 * mesmas consultas das telas (mesmas chaves do TanStack Query, então não busca
 * de novo ao entrar no módulo). Módulo sem permissão de ver fica `null`.
 */
export function useResumoDia() {
  const { hospitalId } = useHospital()
  const pOcs = usePermissaoModulo('ocs')
  const pContratos = usePermissaoModulo('contratos')
  const pOpmes = usePermissaoModulo('opmes')

  const entrega = useAvaliacoesEntrega()
  const contratosQ = useContratos(hospitalId)
  const opmesQ = useOpmes(hospitalId)

  const idsAbertas = useMemo(
    () => entrega.avaliacoes.filter((a) => !(FINAL_SIT as readonly string[]).includes(a.oc.sit)).map((a) => a.oc.id),
    [entrega.avaliacoes],
  )
  const { data: ultimas } = useHistoricoRecentePorOC(idsAbertas)

  const ocs = useMemo(() => {
    if (!pOcs.podeVer) return null
    const hoje = getHoje()
    return resumoOCs(montarLinhas(entrega.avaliacoes, [], ultimas ?? new Map<number, HistOC>(), hoje), hoje)
  }, [pOcs.podeVer, entrega.avaliacoes, ultimas])

  const contratos = useMemo(
    () => (pContratos.podeVer ? resumoContratos(contratosQ.data ?? []) : null),
    [pContratos.podeVer, contratosQ.data],
  )
  const opmes = useMemo(
    () => (pOpmes.podeVer ? resumoOpmes(opmesQ.data ?? [], getHoje()) : null),
    [pOpmes.podeVer, opmesQ.data],
  )
  const alertas = useMemo(() => montarAlertas(ocs, contratos, opmes), [ocs, contratos, opmes])

  return {
    ocs,
    contratos,
    opmes,
    alertas,
    forns: entrega.forns,
    carregando: pOcs.carregando || entrega.isLoading || contratosQ.isLoading || opmesQ.isLoading,
    erro: entrega.error ?? contratosQ.error ?? opmesQ.error,
  }
}
