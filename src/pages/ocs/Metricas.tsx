import { KpiCard } from '@/components/ui/KpiCard'
import { PRAZO } from '@/constants'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import type { OC, Solicitacao } from '@/types'
import { addDias, fmt, parseDMY } from '@/utils/date'
import { dataPrazo } from '@/utils/oc'

interface LinhaMetrica {
  oc: OC
  dOC: Date
  dEntrega: Date
  leadTime: number
  dPrazoInst: Date
  dPrazoForn: Date
  noPrazoInst: boolean
  noPrazoForn: boolean
}

function calcularLinha(oc: OC, sols: Solicitacao[]): LinhaMetrica | null {
  const dOC = parseDMY(oc.dataSolic)
  const dEntrega = parseDMY(oc.dataEntregaReal)
  if (!dOC || !dEntrega) return null

  const dSolic = dataPrazo(oc, sols) ?? dOC
  const dPrazoInst = addDias(dSolic, PRAZO)
  // Prazo do fornecedor: contado a partir da data da própria OC, não da Solicitação.
  const dPrazoForn = addDias(dOC, PRAZO)

  return {
    oc,
    dOC,
    dEntrega,
    leadTime: Math.round((dEntrega.getTime() - dOC.getTime()) / 86_400_000),
    dPrazoInst,
    dPrazoForn,
    noPrazoInst: dEntrega <= dPrazoInst,
    noPrazoForn: dEntrega <= dPrazoForn,
  }
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        ok ? 'bg-status-green-bg text-status-green' : 'bg-status-red-bg text-status-red'
      }`}
    >
      {ok ? '✓ No prazo' : '✗ Fora'}
    </span>
  )
}

export default function Metricas() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()

  const linhas = ocs
    .map((o) => calcularLinha(o, sols))
    .filter((l): l is LinhaMetrica => l !== null)

  const totalEntregas = linhas.length
  const totalNoPrazo = linhas.filter((l) => l.noPrazoInst).length
  const pctNoPrazo = totalEntregas ? Math.round((totalNoPrazo / totalEntregas) * 100) : 0
  const leadTimeMedio = totalEntregas ? Math.round(linhas.reduce((s, l) => s + l.leadTime, 0) / totalEntregas) : 0

  const porFornecedor = new Map<number, LinhaMetrica[]>()
  for (const l of linhas) {
    const fid = l.oc.fornecedorId ?? 0
    if (!porFornecedor.has(fid)) porFornecedor.set(fid, [])
    porFornecedor.get(fid)!.push(l)
  }

  const grupos = [...porFornecedor.entries()]
    .map(([fornecedorId, ls]) => {
      const forn = forns.find((f) => f.id === fornecedorId)
      const foraPrazo = ls.filter((l) => !l.noPrazoInst).length
      const pct = Math.round(((ls.length - foraPrazo) / ls.length) * 100)
      const leadMedio = Math.round(ls.reduce((s, l) => s + l.leadTime, 0) / ls.length)
      return {
        fornecedorId,
        nome: forn?.nome ?? ls[0].oc.fornecedorNome,
        linhas: ls,
        foraPrazo,
        pct,
        leadMedio,
      }
    })
    .sort((a, b) => b.foraPrazo / b.linhas.length - a.foraPrazo / a.linhas.length)

  if (isLoading) return <p className="text-sm text-slate-400">Carregando...</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Métricas de Lead Time</h2>
        <p className="text-sm text-slate-500">Desempenho por fornecedor — só OCs com entrega registrada</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Entregas registradas" value={totalEntregas} tone="blue" />
        <KpiCard
          label="% No prazo (institucional)"
          value={`${pctNoPrazo}%`}
          tone={pctNoPrazo >= 80 ? 'green' : 'red'}
        />
        <KpiCard label="Lead time médio" value={`${leadTimeMedio}d`} tone="gray" />
      </div>

      {grupos.length === 0 && (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
          Nenhuma OC com entrega registrada ainda.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {grupos.map((g) => (
          <div key={g.fornecedorId} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="font-semibold text-slate-800">{g.nome}</span>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{g.linhas.length} entrega(s)</span>
                <span
                  className={
                    g.pct >= 80 ? 'font-semibold text-status-green' : g.pct >= 50 ? 'font-semibold text-status-amber' : 'font-semibold text-status-red'
                  }
                >
                  {g.pct}% no prazo
                </span>
                <span>Lead time médio: {g.leadMedio}d</span>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full min-w-max text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-1.5 text-left">OC</th>
                    <th className="px-3 py-1.5 text-left">Data OC</th>
                    <th className="px-3 py-1.5 text-left">Entrega Real</th>
                    <th className="px-3 py-1.5 text-left">Prazo Inst.</th>
                    <th className="px-3 py-1.5 text-left">Prazo Forn.</th>
                    <th className="px-3 py-1.5 text-left">Lead Time</th>
                    <th className="px-3 py-1.5 text-left">Institucional</th>
                    <th className="px-3 py-1.5 text-left">Fornecedor</th>
                  </tr>
                </thead>
                <tbody>
                  {g.linhas.map((l) => (
                    <tr key={l.oc.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono">{l.oc.id}</td>
                      <td className="px-3 py-1.5">{fmt(l.dOC)}</td>
                      <td className="px-3 py-1.5">{fmt(l.dEntrega)}</td>
                      <td className="px-3 py-1.5">{fmt(l.dPrazoInst)}</td>
                      <td className="px-3 py-1.5">{fmt(l.dPrazoForn)}</td>
                      <td className="px-3 py-1.5">{l.leadTime}d</td>
                      <td className="px-3 py-1.5">
                        <StatusBadge ok={l.noPrazoInst} />
                      </td>
                      <td className="px-3 py-1.5">
                        <StatusBadge ok={l.noPrazoForn} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
