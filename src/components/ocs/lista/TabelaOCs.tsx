import { useState, type ReactNode } from 'react'
import { SortableTh, Table, TableHead } from '@/components/ui/Table'
import { SITUACOES_OC } from '@/constants'
import type { ColunaOpcional } from '@/hooks/useEstadoListaOCs'
import type { OC } from '@/types'
import { fmt, fromInput, toInput } from '@/utils/date'
import { type ChaveOrdem, type DirOrdem, type GrupoFornecedor, type LinhaOC } from '@/utils/ocLista'
import { BadgePrazo, BadgePrioridade } from '../ocVisual'

export interface AcoesLinha {
  onAbrir: (l: LinhaOC) => void
  onSituacao: (oc: OC, sit: string) => void
  onPrevisao: (oc: OC, previsao: string | null) => void
  onVincular: (oc: OC) => void
  onCobrarGrupo?: (g: GrupoFornecedor) => void
}

interface TabelaOCsProps extends AcoesLinha {
  linhas: LinhaOC[]
  /** Quando agrupado por fornecedor, os grupos da página (as linhas vêm de dentro deles). */
  grupos: GrupoFornecedor[] | null
  colunas: ColunaOpcional[]
  ordem: { chave: ChaveOrdem; dir: DirOrdem }
  onOrdenar: (c: ChaveOrdem) => void
  selecionadas: Set<number>
  onSelecionar: (ids: number[], marcar: boolean) => void
  abertaId: number | null
}

const TH = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500'

/** Não deixa o clique num controle da linha abrir o painel. */
const parar = (e: { stopPropagation: () => void }) => e.stopPropagation()

export function TabelaOCs(props: TabelaOCsProps) {
  const { linhas, grupos, colunas, ordem, onOrdenar, selecionadas, onSelecionar } = props
  const tem = (c: ColunaOpcional) => colunas.includes(c)
  const idsPagina = linhas.map((l) => l.oc.id)
  const todasMarcadas = idsPagina.length > 0 && idsPagina.every((id) => selecionadas.has(id))
  const totalColunas = 6 + colunas.length

  if (linhas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-12 text-center shadow-soft-sm">
        <span className="mb-1 block text-2xl opacity-60">✅</span>
        <span className="text-sm font-medium text-slate-500">Nenhuma OC nesta visão com os filtros atuais.</span>
      </div>
    )
  }

  const blocos: { grupo: GrupoFornecedor | null; linhas: LinhaOC[] }[] = grupos
    ? grupos.map((g) => ({ grupo: g, linhas: g.linhas }))
    : [{ grupo: null, linhas }]

  return (
    <>
      {/* Desktop/tablet: tabela */}
      <div className="hidden md:block">
        <Table>
          <TableHead>
            <tr>
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas desta página"
                  checked={todasMarcadas}
                  onChange={(e) => onSelecionar(idsPagina, e.target.checked)}
                />
              </th>
              <SortableTh sortKey="id" activeKey={ordem.chave} sortDir={ordem.dir} onSort={onOrdenar}>
                OC
              </SortableTh>
              <SortableTh sortKey="fornecedor" activeKey={ordem.chave} sortDir={ordem.dir} onSort={onOrdenar}>
                Fornecedor
              </SortableTh>
              {tem('produto') && <th className={TH}>Produto</th>}
              <SortableTh sortKey="situacao" activeKey={ordem.chave} sortDir={ordem.dir} onSort={onOrdenar}>
                Situação
              </SortableTh>
              <SortableTh sortKey="prazo" activeKey={ordem.chave} sortDir={ordem.dir} onSort={onOrdenar}>
                Prazo
              </SortableTh>
              <th className={TH}>Previsão</th>
              {tem('motivo') && <th className={TH}>Motivo</th>}
              {tem('acao') && (
                <SortableTh sortKey="prioridade" activeKey={ordem.chave} sortDir={ordem.dir} onSort={onOrdenar}>
                  Prioridade
                </SortableTh>
              )}
            </tr>
          </TableHead>
          <tbody>
            {blocos.map((b) => (
              <BlocoTabela key={b.grupo?.chave ?? 'todas'} {...props} bloco={b} totalColunas={totalColunas} tem={tem} />
            ))}
          </tbody>
        </Table>
      </div>

      {/* Celular: cartões */}
      <div className="flex flex-col gap-2 md:hidden">
        <label className="flex items-center gap-2 px-1 text-xs text-slate-500">
          <input type="checkbox" checked={todasMarcadas} onChange={(e) => onSelecionar(idsPagina, e.target.checked)} />
          Selecionar todas desta página
        </label>
        {blocos.map((b) => (
          <div key={b.grupo?.chave ?? 'todas'} className="flex flex-col gap-2">
            {b.grupo && <CabecalhoGrupo grupo={b.grupo} {...props} />}
            {b.linhas.map((l) => (
              <CartaoOC key={l.oc.id} linha={l} {...props} />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function BlocoTabela(
  props: TabelaOCsProps & {
    bloco: { grupo: GrupoFornecedor | null; linhas: LinhaOC[] }
    totalColunas: number
    tem: (c: ColunaOpcional) => boolean
  },
) {
  const { bloco, totalColunas, tem, selecionadas, onSelecionar, abertaId, onAbrir } = props
  return (
    <>
      {bloco.grupo && (
        <tr className="border-t border-slate-200 bg-slate-50">
          <td colSpan={totalColunas} className="px-3 py-2">
            <CabecalhoGrupo grupo={bloco.grupo} {...props} />
          </td>
        </tr>
      )}
      {bloco.linhas.map((l) => {
        const o = l.oc
        const marcada = selecionadas.has(o.id)
        return (
          <tr
            key={o.id}
            onClick={() => onAbrir(l)}
            className={`cursor-pointer border-t border-slate-100 transition-colors ${
              abertaId === o.id ? 'bg-blue-50' : marcada ? 'bg-blue-50/50' : 'hover:bg-slate-50'
            }`}
          >
            <td className="px-3 py-2" onClick={parar}>
              <input type="checkbox" aria-label={`Selecionar OC ${o.id}`} checked={marcada} onChange={(e) => onSelecionar([o.id], e.target.checked)} />
            </td>
            <td className="px-3 py-2 text-xs">
              <div className="font-mono font-semibold text-slate-800">{o.id}</div>
              <div className="text-[11px] text-slate-400">{fmt(l.avaliacao.dataOC)}</div>
            </td>
            <td className="max-w-[16rem] px-3 py-2 text-xs">
              <div className="truncate font-medium text-slate-800" title={o.fornecedorNome}>
                {o.fornecedorNome}
              </div>
              {o.estoque && <div className="truncate text-[11px] text-slate-400">{o.estoque}</div>}
            </td>
            {tem('produto') && (
              <td className="max-w-[18rem] px-3 py-2 text-xs">
                <Produto linha={l} onVincular={props.onVincular} />
              </td>
            )}
            <td className="px-3 py-2 text-xs" onClick={parar}>
              <SelectSituacao oc={o} onSituacao={props.onSituacao} />
            </td>
            <td className="px-3 py-2 text-xs">
              <BadgePrazo linha={l} />
            </td>
            <td className="px-3 py-2 text-xs" onClick={parar}>
              <CelulaPrevisao linha={l} onPrevisao={props.onPrevisao} />
            </td>
            {tem('motivo') && (
              <td className="max-w-[10rem] px-3 py-2 text-xs">
                <Motivo oc={o} />
              </td>
            )}
            {tem('acao') && (
              <td className="max-w-[16rem] px-3 py-2 text-xs">
                {l.prioridade ? (
                  <>
                    <BadgePrioridade prioridade={l.prioridade} />
                    <div className="truncate text-[11px] text-slate-500" title={l.acao}>
                      {l.acao}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            )}
          </tr>
        )
      })}
    </>
  )
}

function CabecalhoGrupo({ grupo, selecionadas, onSelecionar, onCobrarGrupo }: TabelaOCsProps & { grupo: GrupoFornecedor }) {
  const ids = grupo.linhas.map((l) => l.oc.id)
  const todas = ids.every((id) => selecionadas.has(id))
  const abertas = grupo.linhas.filter((l) => l.aberta).length
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="flex min-w-0 items-center gap-2 text-sm">
        <input type="checkbox" checked={todas} onChange={(e) => onSelecionar(ids, e.target.checked)} />
        <span className="truncate font-semibold text-slate-800">{grupo.fornecedorNome}</span>
        <span className="whitespace-nowrap text-xs text-slate-500">
          {grupo.linhas.length} OC(s)
          {grupo.vencidas ? <span className="text-status-red"> · {grupo.vencidas} vencida(s)</span> : null}
        </span>
      </label>
      {onCobrarGrupo && abertas > 0 && (
        <button type="button" onClick={() => onCobrarGrupo(grupo)} className="text-xs font-medium text-blue-700 hover:underline">
          Cobrar este fornecedor ({abertas})
        </button>
      )}
    </div>
  )
}

function CartaoOC({ linha: l, selecionadas, onSelecionar, onAbrir, abertaId, ...props }: TabelaOCsProps & { linha: LinhaOC }) {
  const o = l.oc
  return (
    <div
      onClick={() => onAbrir(l)}
      className={`rounded-xl border bg-white p-3 shadow-soft-sm ${abertaId === o.id ? 'border-blue-300' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2" onClick={parar}>
          <input type="checkbox" checked={selecionadas.has(o.id)} onChange={(e) => onSelecionar([o.id], e.target.checked)} />
          <span className="font-mono text-sm font-bold text-slate-800">OC {o.id}</span>
        </label>
        <BadgePrazo linha={l} />
      </div>
      <p className="mt-1 truncate text-sm font-medium text-slate-700">{o.fornecedorNome}</p>
      {l.sol && <p className="truncate text-xs text-slate-500">{l.sol.produto}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{o.sit}</span>
        <span onClick={parar}>
          <CelulaPrevisao linha={l} onPrevisao={props.onPrevisao} />
        </span>
        {l.prioridade && <BadgePrioridade prioridade={l.prioridade} />}
      </div>
      {l.acao && <p className="mt-1 text-[11px] text-slate-500">➜ {l.acao}</p>}
    </div>
  )
}

function Produto({ linha: l, onVincular }: { linha: LinhaOC; onVincular: (oc: OC) => void }) {
  if (l.sol)
    return (
      <>
        <div className="truncate text-slate-700" title={l.sol.produto}>
          {l.sol.produto || '—'}
        </div>
        <div className="text-[11px] text-slate-400">Sol. #{l.sol.id}</div>
      </>
    )
  if (l.oc.solicitacaoId) return <span className="text-[11px] text-slate-400">Sol. #{l.oc.solicitacaoId}</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onVincular(l.oc)
      }}
      className="text-[11px] text-slate-400 hover:text-blue-700 hover:underline"
    >
      + vincular solicitação
    </button>
  )
}

function SelectSituacao({ oc, onSituacao }: { oc: OC; onSituacao: (oc: OC, sit: string) => void }) {
  return (
    <select
      aria-label={`Situação da OC ${oc.id}`}
      className="max-w-[10rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
      value={oc.sit}
      onChange={(e) => onSituacao(oc, e.target.value)}
    >
      {SITUACOES_OC.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}

function CelulaPrevisao({ linha: l, onPrevisao }: { linha: LinhaOC; onPrevisao: (oc: OC, previsao: string | null) => void }) {
  const [editando, setEditando] = useState(false)
  const o = l.oc
  if (editando)
    return (
      <input
        type="date"
        autoFocus
        className="rounded border border-slate-300 px-1 py-0.5 text-[11px]"
        defaultValue={toInput(o.previsaoForn)}
        onBlur={(e) => {
          setEditando(false)
          const nova = e.target.value ? fromInput(e.target.value) : null
          if (nova !== o.previsaoForn) onPrevisao(o, nova)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditando(false)
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    )
  if (!l.aberta) return <span className="text-slate-300">{o.previsaoForn ?? '—'}</span>
  const prev2 = o.sit === 'Parcialmente Atendida' && o.previsaoForn2 ? o.previsaoForn2 : null
  if (!o.previsaoForn && !prev2)
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        title="Registrar a previsão do fornecedor"
        className="whitespace-nowrap rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-400 hover:border-status-purple hover:text-status-purple"
      >
        + previsão
      </button>
    )
  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title={l.previsaoDescumprida ? 'Previsão já passou sem entrega — clique pra atualizar' : 'Clique pra editar a previsão'}
      className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold hover:ring-1 hover:ring-offset-1 ${
        l.previsaoDescumprida ? 'bg-status-red-bg text-status-red' : prev2 ? 'bg-status-amber-bg text-status-amber' : 'bg-status-purple-bg text-status-purple'
      }`}
    >
      {prev2 ? `2ª ${prev2}` : o.previsaoForn}
      {l.previsaoDescumprida && ' ⚠'}
    </button>
  )
}

function Motivo({ oc }: { oc: OC }): ReactNode {
  if (!oc.motivoAtraso) return <span className="text-slate-300">—</span>
  return (
    <span className="inline-block max-w-full truncate rounded-full bg-status-amber-bg px-2 py-0.5 text-[11px] font-medium text-status-amber" title={oc.motivoAtraso}>
      {oc.motivoAtraso}
    </span>
  )
}
