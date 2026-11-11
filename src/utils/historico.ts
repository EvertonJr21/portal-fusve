import type { AlteracaoHistorico } from '@/types'
import { fromInput } from './date'

const ROTULO: Record<string, string> = {
  sit: 'Situação',
  status: 'Status',
  previsao_forn_date: 'Previsão',
  previsao_forn2_date: '2ª previsão',
  data_entrega_real_date: 'Data de entrega',
  data_parcial_date: 'Data da 1ª entrega parcial',
  motivo_atraso: 'Motivo',
  solicitacao_id: 'Solicitação vinculada',
  titulo: 'Título',
  vigencia_inicio: 'Início da vigência',
  vigencia_fim: 'Fim da vigência',
  prazo_medio_dias: 'Prazo médio (dias)',
  condicao_pagamento: 'Condição de pagamento',
}

const valor = (v: string | null): string => {
  if (v === null || v === '') return 'vazio'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fromInput(v)
  return v
}

const preco = (v: string | null) => (v === null ? 'vazio' : `R$ ${Number(v).toFixed(2).replace('.', ',')}`)

/** Frase legível de uma linha de `historico_alteracoes` (ex.: "Previsão: 10/11/2026 → 14/11/2026"). */
export function descreverAlteracao(a: AlteracaoHistorico): string {
  if (a.campo === 'deleted_at') return a.para ? 'Excluído' : 'Exclusão desfeita'
  if (a.campo === 'produto_removido') return `Produto removido: ${a.de ?? ''}`
  if (a.campo.startsWith('preco_unitario: ')) return `Preço de ${a.campo.slice(16)}: ${preco(a.de)} → ${preco(a.para)}`
  return `${ROTULO[a.campo] ?? a.campo}: ${valor(a.de)} → ${valor(a.para)}`
}

/** "11/11/2026 14:32". */
export function dataHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
