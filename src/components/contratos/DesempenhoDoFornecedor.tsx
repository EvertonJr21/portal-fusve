import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import type { ContratoHeader } from '@/types'
import { desempenhoPorFornecedor, formatarDias, formatarPct, ligarContratosFornecedores } from '@/utils/kpis'

/**
 * Como o fornecedor do contrato vem entregando as OCs do hospital ativo (item 92)
 * — mesma nota A–D e OTIF do Desempenho de Entrega. O contrato não guarda o código
 * do fornecedor no SoulMV; o casamento é por CNPJ ou nome idêntico.
 */
export function DesempenhoDoFornecedor({ contrato }: { contrato: ContratoHeader }) {
  const { avaliacoes, forns, isLoading } = useAvaliacoesEntrega()

  const dados = useMemo(() => {
    const fornId = ligarContratosFornecedores([contrato], forns).fornecedorDoContrato.get(contrato.id)
    if (fornId === undefined) return null
    const d = desempenhoPorFornecedor(avaliacoes.filter((a) => a.oc.fornecedorId === fornId), forns)[0] ?? null
    return { fornId, d }
  }, [contrato, avaliacoes, forns])

  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Entregas deste fornecedor</h4>
      {isLoading ? (
        <p className="text-xs text-slate-400">Carregando…</p>
      ) : !dados ? (
        <p className="text-xs text-slate-400">
          Fornecedor não encontrado no cadastro do SoulMV pelo CNPJ nem pelo nome — sem OCs para comparar.
        </p>
      ) : !dados.d ? (
        <p className="text-xs text-slate-400">Nenhuma OC deste fornecedor no hospital ativo.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
          <ClasseBadge classe={dados.d.classe} avaliadas={dados.d.resumo.avaliadas} />
          <span>
            OTIF <strong className="text-slate-800">{formatarPct(dados.d.resumo.otif)}</strong>
          </span>
          <span>
            Lead time <strong className="text-slate-800">{formatarDias(dados.d.resumo.leadTimeMediana)}</strong>
          </span>
          <span>{dados.d.resumo.avaliadas} OC(s) avaliadas</span>
          {dados.d.resumo.abertasVencidas > 0 && <span className="text-status-red">{dados.d.resumo.abertasVencidas} aberta(s) vencida(s)</span>}
          <Link to={`/ocs/ranking/${dados.fornId}`} className="font-medium text-blue-700 hover:underline">
            Ver ficha →
          </Link>
        </div>
      )}
    </div>
  )
}
