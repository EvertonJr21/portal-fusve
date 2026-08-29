import { useState } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { FINAL_SIT, HOSPITAIS } from '@/constants'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useAtualizarOC, useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useRegistrarCobranca } from '@/hooks/useHistOC'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor, OC } from '@/types'
import { gerarMensagemCobrancaLote, linkOutlookCompose, linkWhatsApp } from '@/utils/cobranca'
import { fmt, getHoje } from '@/utils/date'
import { dataPrazo, diasRestantes, statusPrazo } from '@/utils/oc'

interface Grupo {
  forn: Fornecedor | undefined
  fornecedorId: number
  fornecedorNome: string
  ocs: OC[]
  minDiasRestantes: number
}

export default function PorFornecedor() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const registrar = useRegistrarCobranca()
  const atualizar = useAtualizarOC(hospitalId)
  const toast = useToast()

  const [prazoFiltro, setPrazoFiltro] = useState<'' | 'critico' | 'ok'>('')
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState<Set<number>>(new Set())
  const [enviandoTodos, setEnviandoTodos] = useState(false)

  const hospitalNome = HOSPITAIS[hospitalId].nome
  const pendentes = ocs.filter((o) => !(FINAL_SIT as readonly string[]).includes(o.sit))

  const porFornecedor = new Map<number, OC[]>()
  for (const o of pendentes) {
    if (!o.fornecedorId) continue
    const st = statusPrazo(dataPrazo(o, sols), o.sit)
    if (prazoFiltro === 'critico' && st !== 'vencida' && st !== 'urgente') continue
    if (prazoFiltro === 'ok' && (st === 'vencida' || st === 'urgente')) continue
    if (!porFornecedor.has(o.fornecedorId)) porFornecedor.set(o.fornecedorId, [])
    porFornecedor.get(o.fornecedorId)!.push(o)
  }

  let grupos: Grupo[] = [...porFornecedor.entries()].map(([fornecedorId, ocsForn]) => {
    const forn = forns.find((f) => f.id === fornecedorId)
    const min = Math.min(...ocsForn.map((o) => diasRestantes(dataPrazo(o, sols)) ?? 999))
    return {
      forn,
      fornecedorId,
      fornecedorNome: forn?.nome ?? ocsForn[0].fornecedorNome,
      ocs: ocsForn,
      minDiasRestantes: min,
    }
  })

  if (busca) {
    const q = busca.toLowerCase()
    grupos = grupos.filter((g) => g.fornecedorNome.toLowerCase().includes(q) || String(g.fornecedorId).includes(q))
  }

  grupos.sort((a, b) => a.minDiasRestantes - b.minDiasRestantes)

  const vencidasTotal = pendentes.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida').length

  const toggle = (id: number) => {
    setAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cobrarGrupo = async (grupo: Grupo, canal: 'mail' | 'wpp') => {
    const contato = canal === 'mail' ? grupo.forn?.email : grupo.forn?.wpp
    if (!contato) {
      toast.show(`Fornecedor sem ${canal === 'mail' ? 'e-mail' : 'WhatsApp'} cadastrado`, 'warn')
      return
    }
    const msg = gerarMensagemCobrancaLote(grupo.fornecedorNome, grupo.ocs, sols, hospitalNome)
    if (canal === 'mail') {
      await navigator.clipboard.writeText(msg).catch(() => {})
      window.open(linkOutlookCompose(contato, `[${hospitalNome}] Cobrança em lote — ${grupo.fornecedorNome}`), '_blank')
    } else {
      window.open(linkWhatsApp(contato, msg), '_blank')
    }
    for (const oc of grupo.ocs) {
      await registrar.mutateAsync({ ocId: oc.id, canal, resposta: 'Cobrança em lote', tipo: 'lote' })
      await atualizar.mutateAsync({ id: oc.id, patch: { cobrado: true, ultimaMovimentacao: fmt(getHoje()) } })
    }
    toast.show(`Cobrança enviada — ${grupo.fornecedorNome} (${grupo.ocs.length} OC(s))`)
  }

  const cobrarTodosVisiveis = async () => {
    const comContato = grupos.filter((g) => g.forn?.email || g.forn?.wpp)
    if (!comContato.length) {
      toast.show('Nenhum fornecedor visível com contato cadastrado', 'warn')
      return
    }
    if (!confirm(`Enviar cobrança em lote para ${comContato.length} fornecedor(es)?`)) return
    setEnviandoTodos(true)
    let enviados = 0
    for (const g of comContato) {
      try {
        await cobrarGrupo(g, g.forn?.email ? 'mail' : 'wpp')
        enviados++
        await new Promise((r) => setTimeout(r, 400))
      } catch {
        // segue para o próximo fornecedor mesmo se um falhar
      }
    }
    setEnviandoTodos(false)
    toast.show(`Cobrança em lote concluída — ${enviados}/${comContato.length} fornecedor(es)`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Por Fornecedor</h2>
          <p className="text-sm text-slate-500">OCs pendentes agrupadas por fornecedor</p>
        </div>
        <button
          type="button"
          onClick={cobrarTodosVisiveis}
          disabled={enviandoTodos}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {enviandoTodos ? 'Enviando…' : 'Cobrar todos visíveis'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Fornecedores" value={grupos.length} sub="com pendência" tone="blue" />
        <KpiCard label="OCs Vencidas" value={vencidasTotal} sub="no total" tone="red" />
        <KpiCard label="OCs Pendentes" value={pendentes.length} sub="no total" tone="amber" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={prazoFiltro}
          onChange={(e) => setPrazoFiltro(e.target.value as typeof prazoFiltro)}
        >
          <option value="">Todos os prazos</option>
          <option value="critico">Vencidas/Urgentes</option>
          <option value="ok">No prazo</option>
        </select>
        <input
          type="text"
          placeholder="Buscar fornecedor..."
          className="min-w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {grupos.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              Nenhum fornecedor com pendências nesse filtro.
            </p>
          )}
          {grupos.map((g) => {
            const vencidas = g.ocs.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida').length
            const urgentes = g.ocs.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'urgente').length
            const aberto = abertos.has(g.fornecedorId)
            return (
              <div key={g.fornecedorId} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                  <button type="button" className="flex items-center gap-2 text-left text-sm" onClick={() => toggle(g.fornecedorId)}>
                    <span className="text-slate-400">{aberto ? '▾' : '▸'}</span>
                    <span className="font-semibold text-slate-800">{g.fornecedorNome}</span>
                    <span className="text-xs text-slate-400">#{g.fornecedorId}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {vencidas > 0 && (
                      <span className="rounded-full bg-status-red-bg px-2 py-0.5 text-[11px] font-semibold text-status-red">
                        {vencidas} vencida(s)
                      </span>
                    )}
                    {urgentes > 0 && (
                      <span className="rounded-full bg-status-amber-bg px-2 py-0.5 text-[11px] font-semibold text-status-amber">
                        {urgentes} urgente(s)
                      </span>
                    )}
                    <span className="rounded-full bg-status-gray-bg px-2 py-0.5 text-[11px] font-semibold text-status-gray">
                      {g.ocs.length} OC(s)
                    </span>
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                      disabled={!g.forn?.email}
                      onClick={() => cobrarGrupo(g, 'mail')}
                    >
                      ✉
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                      disabled={!g.forn?.wpp}
                      onClick={() => cobrarGrupo(g, 'wpp')}
                    >
                      💬
                    </button>
                  </div>
                </div>
                {aberto && (
                  <div className="border-t border-slate-100">
                    {g.ocs.map((o) => (
                      <div key={o.id} className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-500">
                        <span className="font-mono">OC {o.id}</span>
                        <span>{o.sit}</span>
                        <span>{o.dataSolic}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
