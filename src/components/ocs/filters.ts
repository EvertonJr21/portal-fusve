import { SITUACOES_OC } from '@/constants'
import type { OC, Solicitacao } from '@/types'
import { dataPrazo, diasSemMovimentacao, previsaoAtiva, statusPrazo } from '@/utils/oc'

export type FiltroPrazo = '' | 'vencida' | 'urgente' | 'ok'
export type FiltroVinculo = '' | 'linked' | 'unlinked'
export type FiltroRapido = 'all' | 'vencidas' | 'urgentes' | 'sem_previsao' | 'sem_movimentacao' | 'parciais'

export interface OCFiltroState {
  busca: string
  situacao: string
  prazo: FiltroPrazo
  estoque: string
  vinculo: FiltroVinculo
  previsaoData: string // yyyy-mm-dd, vazio = sem filtro
  rapido: FiltroRapido
}

export const FILTRO_INICIAL: OCFiltroState = {
  busca: '',
  situacao: '',
  prazo: '',
  estoque: '',
  vinculo: '',
  previsaoData: '',
  rapido: 'all',
}

export const SITUACOES_FILTRO = SITUACOES_OC

export function estoquesDisponiveis(ocs: OC[]): string[] {
  return [...new Set(ocs.map((o) => o.estoque).filter((e): e is string => !!e))].sort()
}

export function filtrarOCs(ocs: OC[], sols: Solicitacao[], f: OCFiltroState): OC[] {
  return ocs.filter((o) => {
    if (f.situacao && o.sit !== f.situacao) return false

    if (f.prazo) {
      const st = statusPrazo(dataPrazo(o, sols), o.sit)
      const bate = f.prazo === 'ok' ? st === 'ok' || st === 'atendida' : st === f.prazo
      if (!bate) return false
    }

    if (f.estoque && o.estoque !== f.estoque) return false

    if (f.vinculo === 'linked' && !o.solicitacaoId) return false
    if (f.vinculo === 'unlinked' && o.solicitacaoId) return false

    if (f.busca) {
      const q = f.busca.toLowerCase()
      const bate = o.fornecedorNome.toLowerCase().includes(q) || String(o.id).includes(q)
      if (!bate) return false
    }

    if (f.previsaoData) {
      const prev = previsaoAtiva(o)
      if (!prev) return false
      const [d, m, y] = prev.split('/')
      const iso = `${y}-${m}-${d}`
      if (iso !== f.previsaoData) return false
    }

    if (f.rapido === 'vencidas' && statusPrazo(dataPrazo(o, sols), o.sit) !== 'vencida') return false
    if (f.rapido === 'urgentes' && statusPrazo(dataPrazo(o, sols), o.sit) !== 'urgente') return false
    if (f.rapido === 'sem_previsao' && o.previsaoForn) return false
    if (f.rapido === 'sem_movimentacao') {
      const dsm = diasSemMovimentacao(o)
      if (dsm === null || dsm < 7) return false
    }
    if (f.rapido === 'parciais' && o.sit !== 'Parcialmente Atendida') return false

    return true
  })
}

export function temFiltroAtivo(f: OCFiltroState): boolean {
  return (
    !!f.busca ||
    !!f.situacao ||
    !!f.prazo ||
    !!f.estoque ||
    !!f.vinculo ||
    !!f.previsaoData ||
    f.rapido !== 'all'
  )
}
