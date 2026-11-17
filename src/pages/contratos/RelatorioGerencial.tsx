import { ArrowDown, ArrowUp, ChevronsUpDown, FileDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useComodatosPorContrato, useContratos, useProdutosPorContrato } from '@/hooks/useContratos'
import { useToast } from '@/hooks/useToast'
import {
  dataCurta,
  eixoTempo,
  fraseCarteira,
  marcasDeMes,
  montarCarteira,
  ROTULO_FAIXA,
  ROTULO_UNIDADE,
  textoDias,
  unirContratos,
  type Contagem,
  type FaixaPrazo,
  type LinhaCarteira,
  type UnidadeFiltro,
} from '@/utils/carteiraContratos'
import { getHoje } from '@/utils/date'
import { abrirPdfGerado } from '@/utils/pdfDataUrl'

/**
 * Relatório gerencial de contratos (item 112): quais contratos ativos vencem,
 * quando, e onde estão — na tela e em PDF no padrão visual da FUSVE.
 */

const UNIDADES: { valor: UnidadeFiltro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'HUV e HMK' },
  { valor: 'huv', rotulo: 'HUV' },
  { valor: 'mkr', rotulo: 'HMK' },
]

const COR_FAIXA: Record<FaixaPrazo, { ponto: string; texto: string; fundo: string }> = {
  vencido: { ponto: 'bg-status-red', texto: 'text-status-red', fundo: 'bg-status-red-bg' },
  critico: { ponto: 'bg-status-red', texto: 'text-status-red', fundo: 'bg-status-red-bg' },
  atencao: { ponto: 'bg-status-amber', texto: 'text-status-amber', fundo: 'bg-status-amber-bg' },
  normal: { ponto: 'bg-blue-700', texto: 'text-slate-700', fundo: 'bg-slate-100' },
  sem_data: { ponto: 'bg-slate-400', texto: 'text-slate-500', fundo: 'bg-slate-100' },
}

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const dataLonga = (iso: string | null) => {
  if (!iso) return 'sem data'
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return dataCurta(new Date(a, m - 1, d))
}

/** Marcador de faixa: vencido é um losango, os outros são círculos — a faixa não depende só da cor. */
function Marcador({ faixa, className = 'h-2.5 w-2.5' }: { faixa: FaixaPrazo; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 ${className} ${COR_FAIXA[faixa].ponto} ${faixa === 'vencido' ? 'rotate-45 rounded-[1px]' : 'rounded-full'}`} />
}

function SeloFaixa({ faixa }: { faixa: FaixaPrazo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${COR_FAIXA[faixa].fundo} ${COR_FAIXA[faixa].texto}`}>
      <Marcador faixa={faixa} className="h-2 w-2" />
      {ROTULO_FAIXA[faixa]}
    </span>
  )
}

// ───────────── Linha do tempo de vencimentos ─────────────

interface Ponto {
  l: LinhaCarteira
  x: number
  linha: number
}

function TimelineVencimentos({ linhas }: { linhas: LinhaCarteira[] }) {
  const [ativo, setAtivo] = useState<string | null>(null)
  const [fixo, setFixo] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  const comData = useMemo(() => linhas.filter((l) => l.dias !== null), [linhas])
  const unidades = useMemo(() => (['huv', 'mkr', 'ambos'] as const).filter((u) => comData.some((l) => l.contrato.hospitalId === u)), [comData])
  const { min, max } = useMemo(() => eixoTempo(comData), [comData])
  const pct = (d: number) => ((d - min) / (max - min)) * 100
  const marcas = useMemo(() => marcasDeMes(getHoje(), min, max), [min, max])
  const maxItens = Math.max(1, ...comData.map((l) => l.itens ?? 0))
  const tam = (l: LinhaCarteira) => (l.itens === null ? 15 : Math.round(13 + 13 * Math.sqrt((l.itens || 0) / maxItens)))

  // Empilha pontos muito próximos na mesma faixa de unidade, para não se esconderem.
  const pontos = useMemo(() => {
    const out: Ponto[] = []
    for (const u of unidades) {
      const ultimos: number[] = []
      for (const l of comData.filter((x) => x.contrato.hospitalId === u)) {
        const x = ((l.dias! - min) / (max - min)) * 100
        let linha = ultimos.findIndex((ux) => x - ux > 2.2)
        if (linha === -1) linha = ultimos.length < 3 ? ultimos.length : 0
        ultimos[linha] = x
        out.push({ l, x, linha })
      }
    }
    return out
  }, [comData, unidades, min, max])

  useEffect(() => {
    if (!fixo) return
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) {
        setFixo(false)
        setAtivo(null)
      }
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [fixo])

  if (!unidades.length) return <p className="py-6 text-center text-sm text-slate-500">Nenhum contrato ativo com data de término.</p>

  const sel = pontos.find((p) => p.l.contrato.id === ativo)
  const ALTURA = 56
  const resumoAria = `Linha do tempo com ${comData.length} contratos ativos. ${pontos
    .filter((p) => p.l.faixa !== 'normal')
    .map((p) => `${p.l.contrato.titulo || p.l.contrato.fornecedorNome}: ${textoDias(p.l.dias)}`)
    .join('; ')}`

  return (
    <div ref={caixa} onKeyDown={(e) => e.key === 'Escape' && (setAtivo(null), setFixo(false))}>
      <div className="flex">
        <div className="w-16 shrink-0 sm:w-24">
          {unidades.map((u) => (
            <div key={u} style={{ height: ALTURA }} className="flex items-center text-xs font-semibold text-slate-600">
              {ROTULO_UNIDADE[u]}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" role="img" aria-label={resumoAria}>
          {/* Faixas de até 30 e de 31 a 90 dias */}
          <div className="absolute inset-y-0 bg-status-red-bg" style={{ left: `${pct(Math.max(min, 0))}%`, width: `${pct(30) - pct(Math.max(min, 0))}%` }} />
          <div className="absolute inset-y-0 bg-status-amber-bg" style={{ left: `${pct(30)}%`, width: `${pct(90) - pct(30)}%` }} />
          {unidades.map((u, i) => (
            <div key={u} className="absolute inset-x-0 border-t border-slate-200" style={{ top: i * ALTURA + ALTURA / 2 }} />
          ))}
          <div className="absolute inset-y-0 w-0.5 bg-slate-800" style={{ left: `${pct(0)}%` }} />
          <div style={{ height: unidades.length * ALTURA }} />
          {pontos.map((p) => {
            const i = unidades.indexOf(p.l.contrato.hospitalId as (typeof unidades)[number])
            const s = tam(p.l)
            const top = i * ALTURA + ALTURA / 2 + (p.linha === 0 ? 0 : p.linha === 1 ? -14 : 14)
            const nome = p.l.contrato.titulo || p.l.contrato.fornecedorNome
            return (
              <button
                key={p.l.contrato.id}
                type="button"
                aria-label={`${nome} — ${p.l.contrato.fornecedorNome}, término ${dataLonga(p.l.contrato.vigenciaFim)}, ${textoDias(p.l.dias)}`}
                aria-describedby={ativo === p.l.contrato.id ? 'tooltip-vencimento' : undefined}
                onMouseEnter={() => !fixo && setAtivo(p.l.contrato.id)}
                onMouseLeave={() => !fixo && setAtivo(null)}
                onFocus={() => setAtivo(p.l.contrato.id)}
                onBlur={() => !fixo && setAtivo(null)}
                onClick={() => {
                  setAtivo(p.l.contrato.id)
                  setFixo(true)
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-sm motion-safe:transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${COR_FAIXA[p.l.faixa].ponto} ${p.l.faixa === 'vencido' ? 'rotate-45 rounded-sm' : 'rounded-full'} ${ativo === p.l.contrato.id ? 'z-20 scale-125' : 'z-10'}`}
                style={{ left: `${p.x}%`, top, width: s, height: s }}
              />
            )
          })}
          {sel && (
            <div
              id="tooltip-vencimento"
              role="tooltip"
              className="absolute z-30 w-60 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-soft-lg"
              style={{
                left: `clamp(0px, calc(${sel.x}% - 120px), calc(100% - 240px))`,
                top: unidades.indexOf(sel.l.contrato.hospitalId as (typeof unidades)[number]) * ALTURA + ALTURA / 2 + 16,
              }}
            >
              <p className="font-semibold text-slate-800">{sel.l.contrato.titulo || sel.l.contrato.fornecedorNome}</p>
              {sel.l.contrato.titulo && <p className="text-slate-500">{sel.l.contrato.fornecedorNome}</p>}
              <p className="mt-1.5 text-slate-600">
                Término {dataLonga(sel.l.contrato.vigenciaFim)} · <span className={`font-semibold ${COR_FAIXA[sel.l.faixa].texto}`}>{textoDias(sel.l.dias)}</span>
              </p>
              <p className="text-slate-500">
                {ROTULO_UNIDADE[sel.l.contrato.hospitalId]}
                {sel.l.itens !== null && ` · ${sel.l.itens} produto${sel.l.itens === 1 ? '' : 's'}`}
                {sel.l.contrato.renovacaoAutomatica ? ' · renovação automática' : ' · renovação manual'}
              </p>
              <Link to={`/contratos/${sel.l.contrato.id}`} className="mt-2 inline-block font-medium text-blue-700 hover:underline">
                Abrir contrato →
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Eixo: meses e "hoje" */}
      <div className="flex">
        <div className="w-16 shrink-0 sm:w-24" />
        <div className="relative h-5 min-w-0 flex-1 text-[11px] text-slate-500" aria-hidden>
          {marcas.map((m, i) => (
            <span key={m.dias} className={`absolute -translate-x-1/2 ${i % 2 ? 'hidden sm:inline' : ''}`} style={{ left: `${pct(m.dias)}%` }}>
              {m.rotulo}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 bg-slate-800" /> hoje
        </span>
        {(['vencido', 'critico', 'atencao', 'normal'] as const).map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <Marcador faixa={f} /> {ROTULO_FAIXA[f]}
          </span>
        ))}
        {comData.some((l) => l.itens !== null) && <span>· tamanho = nº de produtos</span>}
      </div>
    </div>
  )
}

// ───────────── Barras ─────────────

function Barras({ titulo, itens }: { titulo: string; itens: Contagem[] }) {
  const max = Math.max(1, ...itens.map((i) => i.quantidade))
  return (
    <div role="img" aria-label={`${titulo}: ${itens.map((i) => `${i.nome} ${i.quantidade}`).join(', ')}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h3>
      {itens.length ? (
        <ul className="space-y-2.5">
          {itens.map((i) => (
            <li key={i.nome}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">{i.nome}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {i.quantidade} · {Math.round(i.pct * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-700 motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${(i.quantidade / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nenhum contrato ativo.</p>
      )}
    </div>
  )
}

// ───────────── Tabela ordenável ─────────────

type Coluna = 'nome' | 'fornecedor' | 'unidade' | 'classificacao' | 'dias' | 'renovacao' | 'itens' | 'comodatos'

const COLUNAS: { chave: Coluna; rotulo: string; direita?: boolean }[] = [
  { chave: 'nome', rotulo: 'Contrato / acordo' },
  { chave: 'fornecedor', rotulo: 'Fornecedor' },
  { chave: 'unidade', rotulo: 'Unidade' },
  { chave: 'classificacao', rotulo: 'Classificação' },
  { chave: 'dias', rotulo: 'Término' },
  { chave: 'renovacao', rotulo: 'Renovação' },
  { chave: 'itens', rotulo: 'Produtos', direita: true },
  { chave: 'comodatos', rotulo: 'Comodato', direita: true },
]

function valor(l: LinhaCarteira, c: Coluna): string | number {
  switch (c) {
    case 'nome':
      return (l.contrato.titulo || l.contrato.fornecedorNome).toLowerCase()
    case 'fornecedor':
      return l.contrato.fornecedorNome.toLowerCase()
    case 'unidade':
      return ROTULO_UNIDADE[l.contrato.hospitalId]
    case 'classificacao':
      return (l.contrato.classificacao || '').toLowerCase()
    case 'dias':
      return l.dias ?? Number.POSITIVE_INFINITY
    case 'renovacao':
      return l.contrato.renovacaoAutomatica ? 1 : 0
    case 'itens':
      return l.itens ?? -1
    case 'comodatos':
      return l.comodatos
  }
}

function TabelaCarteira({ linhas }: { linhas: LinhaCarteira[] }) {
  const [ordem, setOrdem] = useState<{ col: Coluna; asc: boolean }>({ col: 'dias', asc: true })
  const ordenadas = useMemo(() => {
    const r = [...linhas].sort((a, b) => {
      const va = valor(a, ordem.col)
      const vb = valor(b, ordem.col)
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR')
      return cmp || a.contrato.fornecedorNome.localeCompare(b.contrato.fornecedorNome)
    })
    return ordem.asc ? r : r.reverse()
  }, [linhas, ordem])

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <caption className="sr-only">Contratos e acordos ativos — clique no título de uma coluna para ordenar</caption>
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {COLUNAS.map((c) => {
              const atual = ordem.col === c.chave
              const Icone = !atual ? ChevronsUpDown : ordem.asc ? ArrowUp : ArrowDown
              return (
                <th key={c.chave} scope="col" aria-sort={atual ? (ordem.asc ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2.5 font-semibold ${c.direita ? 'text-right' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setOrdem((o) => ({ col: c.chave, asc: o.col === c.chave ? !o.asc : true }))}
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded uppercase hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700 ${atual ? 'text-slate-800' : ''}`}
                  >
                    {c.rotulo}
                    <Icone aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => (
            <tr key={l.contrato.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2.5">
                <Link to={`/contratos/${l.contrato.id}`} className="font-medium text-slate-800 hover:text-blue-700 hover:underline">
                  {l.contrato.titulo || l.contrato.fornecedorNome}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-slate-600">{l.contrato.fornecedorNome}</td>
              <td className="px-3 py-2.5 text-slate-600">{ROTULO_UNIDADE[l.contrato.hospitalId]}</td>
              <td className="px-3 py-2.5 text-slate-600">{l.contrato.classificacao || '—'}</td>
              <td className="px-3 py-2.5">
                <span className="block text-slate-700">{dataBR(l.contrato.vigenciaFim)}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${COR_FAIXA[l.faixa].texto}`}>
                  <Marcador faixa={l.faixa} className="h-2 w-2" />
                  {textoDias(l.dias)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-600">{l.contrato.renovacaoAutomatica ? 'Automática' : 'Manual'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{l.itens ?? '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{l.comodatos || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ───────────── Página ─────────────

export default function RelatorioGerencial() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const unidade = (UNIDADES.some((u) => u.valor === params.get('unidade')) ? params.get('unidade') : 'todas') as UnidadeFiltro
  const huv = useContratos('huv')
  const mkr = useContratos('mkr')
  const contratos = useMemo(() => unirContratos(huv.data ?? [], mkr.data ?? []), [huv.data, mkr.data])
  const ids = useMemo(() => contratos.map((c) => c.id), [contratos])
  const { data: itens } = useProdutosPorContrato(ids, true)
  const { data: comodatos } = useComodatosPorContrato(ids)
  const carteira = useMemo(() => montarCarteira(contratos, unidade, itens, comodatos), [contratos, unidade, itens, comodatos])
  const [gerando, setGerando] = useState(false)
  const erro = huv.error ?? mkr.error

  const exportar = async () => {
    setGerando(true)
    try {
      await abrirPdfGerado(async () => {
        const { gerarCarteiraContratosPDF } = await import('@/relatorios/contratos')
        return gerarCarteiraContratosPDF({ carteira, unidade })
      }, `Carteira de contratos — ${UNIDADES.find((u) => u.valor === unidade)?.rotulo}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar o PDF', 'error')
    } finally {
      setGerando(false)
    }
  }

  const t = carteira.totais
  const numeros: { rotulo: string; valor: number; detalhe: string; destaque?: string }[] = [
    { rotulo: 'Ativos', valor: t.ativos, detalhe: `${t.fornecedores} fornecedor${t.fornecedores === 1 ? '' : 'es'}` },
    { rotulo: 'Decidir em 90 dias', valor: t.decidir, detalhe: `${t.criticos} em até 30 dias`, destaque: t.decidir ? 'text-status-amber' : undefined },
    { rotulo: 'Vencidos ainda ativos', valor: t.vencidos, detalhe: t.vencidos ? 'renovar ou encerrar' : 'nenhum', destaque: t.vencidos ? 'text-status-red' : undefined },
    { rotulo: 'Em negociação', valor: t.emNegociacao, detalhe: 'fora da contagem de ativos' },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posição em {dataCurta(getHoje())}</p>
          <h1 className="mt-1 text-2xl font-light text-slate-900">Relatório gerencial de contratos</h1>
          {!huv.isLoading && !mkr.isLoading && !erro && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{fraseCarteira(carteira, unidade)}</p>}
        </div>
        <Button variant="outline" onClick={exportar} loading={gerando} disabled={huv.isLoading || mkr.isLoading || !!erro} className="shrink-0 self-start">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Unidade">
        {UNIDADES.map((u) => (
          <button
            key={u.valor}
            type="button"
            aria-pressed={unidade === u.valor}
            onClick={() => setParams(u.valor === 'todas' ? {} : { unidade: u.valor }, { replace: true })}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              unidade === u.valor ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {u.rotulo}
          </button>
        ))}
      </div>

      {erro && <p className="rounded-lg bg-status-red-bg p-3 text-sm text-status-red">Erro ao carregar contratos: {erro.message}</p>}

      {huv.isLoading || mkr.isLoading ? (
        <SkeletonRows colunas={5} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {numeros.map((n) => (
              <div key={n.rotulo} className="rounded-xl border border-slate-200 bg-white p-4">
                <dt className="text-xs text-slate-500">{n.rotulo}</dt>
                <dd className={`mt-1 text-2xl font-bold tabular-nums ${n.destaque ?? 'text-slate-900'}`}>{n.valor}</dd>
                <dd className="text-xs text-slate-500">{n.detalhe}</dd>
              </div>
            ))}
          </dl>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Linha do tempo de vencimentos</h2>
            <TimelineVencimentos linhas={carteira.linhas} />
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-3">
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                Precisam de decisão nos próximos 90 dias <span className="font-normal text-slate-500">({carteira.decidir.length})</span>
              </h2>
              {carteira.decidir.length ? (
                <ul className="divide-y divide-slate-100">
                  {carteira.decidir.map((l) => (
                    <li key={l.contrato.id}>
                      <Link to={`/contratos/${l.contrato.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-slate-50 sm:flex-nowrap">
                        <span className={`inline-flex w-full shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-bold sm:w-40 ${COR_FAIXA[l.faixa].texto}`}>
                          <Marcador faixa={l.faixa} className="h-2 w-2 sm:hidden" />
                          {textoDias(l.dias)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{l.contrato.titulo || l.contrato.fornecedorNome}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {l.contrato.titulo ? `${l.contrato.fornecedorNome} · ` : ''}
                            {ROTULO_UNIDADE[l.contrato.hospitalId]} · término {dataLonga(l.contrato.vigenciaFim)}
                          </span>
                        </span>
                        <span className="hidden sm:inline-flex">
                          <SeloFaixa faixa={l.faixa} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-slate-500">
                  {unidade === 'todas' ? 'Nenhum contrato vence nos próximos 90 dias.' : 'Nenhum contrato desta unidade vence nos próximos 90 dias.'}
                </p>
              )}
            </section>

            <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-2">
              <h2 className="text-base font-semibold text-slate-800">Onde estão os contratos</h2>
              <Barras titulo="Por classificação" itens={carteira.porClassificacao} />
              <Barras titulo="Por unidade" itens={carteira.porUnidade} />
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-800">
              Todos os contratos ativos <span className="font-normal text-slate-500">({carteira.linhas.length})</span>
            </h2>
            {carteira.linhas.length ? <TabelaCarteira linhas={carteira.linhas} /> : <p className="text-sm text-slate-500">Nenhum contrato ativo.</p>}
          </section>

          <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-800">Como os números são calculados</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Entram os contratos e acordos com status Ativo. Os cadastrados para "HUV e HMK" aparecem nas duas unidades.</li>
              <li>Dias restantes = data de término da vigência menos hoje, em dias corridos.</li>
              <li>Faixas: vencido; até 30 dias; de 31 a 90 dias; mais de 90 dias. "Precisam de decisão" = vencidos e os que vencem em até 90 dias.</li>
              <li>Produtos = itens cadastrados no contrato como referência de preço. O relatório não soma valores, porque os pedidos não são vinculados aos contratos.</li>
              <li>Em negociação não conta como ativo.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}
