import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useScoreReset } from '@/hooks/useScoreReset'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import { fmt, parseDMY } from '@/utils/date'
import { exportarExcel } from '@/utils/exportar'
import { exportarPDF } from '@/utils/exportarPdf'
import { isPrevisaoDescumprida, ocsSemPrevisao, ocsVencidas } from '@/utils/oc'
import { gerarRelatorioMensalPDF } from '@/utils/relatorioMensal'
import { calcularScoresTodos, filtrarDesdeReset } from '@/utils/scoreFornecedor'
import { slaFornecedor, slaInterno } from '@/utils/sla'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface Categoria {
  titulo: string
  descricao: string
  arquivo: string
  linhas: () => Record<string, unknown>[]
}

export default function Exportar() {
  const { hospitalId } = useHospital()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const { data: cobrancas = [] } = useHistoricoTodos()
  const { resetAt } = useScoreReset()
  const toast = useToast()

  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth())
  const [ano, setAno] = useState(agora.getFullYear())

  const ocIdsHospital = new Set(ocs.map((o) => o.id))
  const cobrancasDoHospital = cobrancas.filter((h) => ocIdsHospital.has(h.ocId))

  const linhaOC = (o: (typeof ocs)[number]) => ({
    OC: o.id,
    'Data Solicitação': o.dataSolic ? fmt(parseDMY(o.dataSolic)) : '',
    Fornecedor: o.fornecedorNome,
    Situação: o.sit,
    Estoque: o.estoque ?? '',
    'Previsão Fornecedor': o.previsaoForn ?? '',
    'Data Entrega Real': o.dataEntregaReal ?? '',
    'Dias de Atraso': o.diasAtraso,
    'Última Movimentação': o.ultimaMovimentacao ?? '',
    'Motivo do Atraso': o.motivoAtraso ?? '',
  })

  const categorias: Categoria[] = [
    {
      titulo: 'OCs em atraso',
      descricao: 'Todas as OCs pendentes com prazo institucional vencido',
      arquivo: 'ocs-em-atraso',
      linhas: () => ocsVencidas(ocs, sols).map(linhaOC),
    },
    {
      titulo: 'OCs sem previsão',
      descricao: 'OCs pendentes sem previsão de entrega do fornecedor',
      arquivo: 'ocs-sem-previsao',
      linhas: () => ocsSemPrevisao(ocs).map(linhaOC),
    },
    {
      titulo: 'OCs por fornecedor',
      descricao: 'Todas as OCs do hospital ativo, agrupadas por fornecedor',
      arquivo: 'ocs-por-fornecedor',
      linhas: () => [...ocs].sort((a, b) => a.fornecedorNome.localeCompare(b.fornecedorNome) || a.id - b.id).map(linhaOC),
    },
    {
      titulo: 'Cobranças',
      descricao: 'Histórico completo de cobranças registradas nas OCs do hospital ativo',
      arquivo: 'cobrancas',
      linhas: () =>
        cobrancasDoHospital.map((h) => ({
          OC: h.ocId,
          Data: new Date(h.ts).toLocaleString('pt-BR'),
          Canal: h.canal,
          Tipo: h.tipo,
          Resposta: h.resposta,
          Respondida: h.respondidoEm ? new Date(h.respondidoEm).toLocaleString('pt-BR') : 'Não',
        })),
    },
    {
      titulo: 'SLA',
      descricao: 'Resumo do SLA interno (Solicitação → OC) e do fornecedor (OC → Entrega)',
      arquivo: 'sla',
      linhas: () => {
        const interno = slaInterno(ocs, sols)
        const fornecedor = slaFornecedor(ocs, sols)
        return [
          { Indicador: 'SLA Interno', Total: interno.total, 'Dentro do Prazo': interno.dentro, 'Fora do Prazo': interno.fora, '% Cumprimento': interno.pct !== null ? `${(interno.pct * 100).toFixed(0)}%` : '—' },
          { Indicador: 'SLA Fornecedor', Total: fornecedor.total, 'Dentro do Prazo': fornecedor.dentro, 'Fora do Prazo': fornecedor.fora, '% Cumprimento': fornecedor.pct !== null ? `${(fornecedor.pct * 100).toFixed(0)}%` : '—' },
        ]
      },
    },
    {
      titulo: 'Fornecedores / Ranking',
      descricao: 'Score, taxa de atraso e indicadores de todos os fornecedores com OCs',
      arquivo: 'ranking-fornecedores',
      linhas: () =>
        calcularScoresTodos(forns, filtrarDesdeReset(ocs, resetAt), sols, cobrancas).map((s) => ({
          Fornecedor: s.fornecedorNome,
          Score: s.score,
          'Total OCs': s.totalOCs,
          'OCs Abertas': s.ocsAbertas,
          'OCs Atrasadas': s.ocsAtrasadas,
          'Taxa de Atraso': s.taxaAtraso !== null ? `${(s.taxaAtraso * 100).toFixed(0)}%` : '—',
          'Cumprimento de Prazo': s.cumprimentoPrazoPct !== null ? `${(s.cumprimentoPrazoPct * 100).toFixed(0)}%` : '—',
          'Cumprimento de Previsão': s.cumprimentoPrevisaoPct !== null ? `${(s.cumprimentoPrevisaoPct * 100).toFixed(0)}%` : '—',
          Responsividade: s.responsividadePct !== null ? `${(s.responsividadePct * 100).toFixed(0)}%` : '—',
        })),
    },
    {
      titulo: 'Ocorrências',
      descricao: 'OCs com motivo de atraso registrado, agrupadas por motivo',
      arquivo: 'ocorrencias',
      linhas: () =>
        ocs
          .filter((o) => o.motivoAtraso)
          .map((o) => ({
            OC: o.id,
            Fornecedor: o.fornecedorNome,
            Motivo: o.motivoAtraso,
            'Previsão Descumprida': isPrevisaoDescumprida(o) ? 'Sim' : 'Não',
            Situação: o.sit,
          })),
    },
  ]

  const handleExportar = (c: Categoria, formato: 'excel' | 'pdf') => {
    const linhas = c.linhas()
    if (!linhas.length) {
      toast.show('Nenhum registro para exportar', 'warn')
      return
    }
    if (formato === 'excel') {
      exportarExcel(c.arquivo, [{ nome: c.titulo.slice(0, 31), linhas }])
    } else {
      exportarPDF(c.arquivo, c.titulo, linhas)
    }
    toast.show(`${linhas.length} registro(s) exportado(s)`)
  }

  const handleRelatorioMensal = () => {
    gerarRelatorioMensalPDF(mes, ano, ocs, sols, forns, cobrancas)
    toast.show('Relatório mensal gerado')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Exportar</h2>
        <p className="text-sm text-slate-500">Exportações segmentadas em Excel e relatório gerencial mensal em PDF</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categorias.map((c) => (
          <div key={c.titulo} className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
            <div className="text-sm font-semibold text-slate-800">{c.titulo}</div>
            <div className="flex-1 text-xs text-slate-500">{c.descricao}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExportar(c, 'excel')}>
                📊 Excel
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExportar(c, 'pdf')}>
                📄 PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
        <div className="mb-3 text-sm font-semibold text-slate-800">Relatório Gerencial Mensal</div>
        <div className="mb-3 text-xs text-slate-500">
          Resumo do mês (OCs processadas, cumprimento de SLA, atrasos e previsões descumpridas), fornecedores críticos e
          principais ocorrências.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {[ano - 1, ano, ano + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Button onClick={handleRelatorioMensal}>📑 Gerar Relatório Mensal (PDF)</Button>
        </div>
      </div>
    </div>
  )
}
