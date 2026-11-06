import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import { fmt, parseDMY } from '@/utils/date'
import { exportarExcel } from '@/utils/exportar'
import { exportarPDF } from '@/utils/exportarPdf'
import { isPrevisaoDescumprida, ocsSemPrevisao, ocsVencidas } from '@/utils/oc'
import { gerarRelatorioMensalPDF } from '@/utils/relatorioMensal'
import { cicloInterno, desempenhoPorFornecedor, formatarDias, formatarPct, resumir } from '@/utils/kpis'

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
  const { avaliacoes } = useAvaliacoesEntrega()
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
      titulo: 'Desempenho de entrega (OTIF)',
      descricao: 'Uma linha por OC: data prometida, entrada, origem da data, no prazo/completo e dias de atraso',
      arquivo: 'otif-por-oc',
      linhas: () =>
        avaliacoes
          .filter((a) => a.status !== 'cancelada')
          .map((a) => ({
            OC: a.oc.id,
            Fornecedor: a.oc.fornecedorNome,
            'Data da OC': fmt(a.dataOC),
            'Prazo (dias)': a.prazoDias,
            'Fonte do prazo': a.prazoFonte === 'contrato' ? 'Contrato' : 'Padrão',
            'Data prometida': fmt(a.dataPrometida),
            'Data de entrada': a.dataEntrega ? fmt(a.dataEntrega) : '',
            'Origem da data': a.oc.dataEntregaOrigem ?? (a.dataEntrega ? 'estimada' : ''),
            'Nº entrada MV': a.oc.entradaMv,
            Status: a.status,
            'On Time': a.status === 'no_prazo' ? 'Sim' : a.status === 'atrasada' || a.status === 'aberta_vencida' ? 'Não' : '',
            'In Full': a.inFull === null ? '' : a.inFull ? 'Sim' : 'Não',
            'Dias de atraso': a.diasAtraso,
            'Lead time (dias)': a.leadTimeDias ?? '',
          })),
    },
    {
      titulo: 'Fornecedores / Ranking',
      descricao: 'OTIF, On Time, In Full, nota A–D e lead time por fornecedor',
      arquivo: 'ranking-fornecedores',
      linhas: () => {
        const geral = resumir(avaliacoes)
        const ciclo = cicloInterno(ocs, sols)
        return [
          ...desempenhoPorFornecedor(avaliacoes, forns).map((d) => ({
            Fornecedor: d.fornecedorNome,
            Nota: d.classe?.classe ?? 'sem nota',
            OTIF: formatarPct(d.resumo.otif),
            'On Time': formatarPct(d.resumo.onTime),
            'In Full': formatarPct(d.resumo.inFull),
            'OCs avaliadas': d.resumo.avaliadas,
            Atrasadas: d.resumo.atrasadas,
            'Abertas vencidas': d.resumo.abertasVencidas,
            'Lead time mediana': formatarDias(d.resumo.leadTimeMediana),
            'Lead time P90': formatarDias(d.resumo.leadTimeP90),
          })),
          {
            Fornecedor: 'TOTAL DO HOSPITAL',
            Nota: '',
            OTIF: formatarPct(geral.otif),
            'On Time': formatarPct(geral.onTime),
            'In Full': formatarPct(geral.inFull),
            'OCs avaliadas': geral.avaliadas,
            Atrasadas: geral.atrasadas,
            'Abertas vencidas': geral.abertasVencidas,
            'Lead time mediana': formatarDias(geral.leadTimeMediana),
            'Lead time P90': `${formatarDias(geral.leadTimeP90)} · ciclo interno Sol→OC (mediana): ${formatarDias(ciclo.mediana)}`,
          },
        ]
      },
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
    gerarRelatorioMensalPDF(mes, ano, ocs, sols, forns, avaliacoes)
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
          Resumo do mês (OCs processadas, OTIF, lead time, ciclo interno, atrasos e previsões descumpridas), fornecedores críticos e
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
