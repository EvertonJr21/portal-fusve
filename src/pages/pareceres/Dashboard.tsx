import { KpiCard } from '@/components/ui/KpiCard'
import { useHistoricoConsultas } from '@/hooks/useHistoricoConsultas'
import { usePareceres } from '@/hooks/usePareceres'
import { useProdutos } from '@/hooks/useProdutos'

const CORES = ['#3182CE', '#38A169', '#DD6B20', '#E53E3E', '#805AD5', '#00B5D8', '#D69E2E']

export default function Dashboard() {
  const { data: pareceres = [] } = usePareceres()
  const { data: produtos = [] } = useProdutos()
  const { entradas } = useHistoricoConsultas()

  const totalProdutos = produtos.length
  const comParecer = pareceres.length
  const semParecer = totalProdutos ? totalProdutos - comParecer : 0
  const comProibida = pareceres.filter((p) => p.proibidas.length > 0).length

  const porCategoria = new Map<string, number>()
  for (const p of pareceres) {
    const cat = p.cat || 'OUTRO'
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1)
  }
  const top7 = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
  const max = top7[0]?.[1] ?? 1

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Dashboard de Pareceres</h2>
        <p className="text-sm text-slate-500">Visão geral da base técnica</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total de Produtos" value={totalProdutos.toLocaleString('pt-BR')} tone="blue" />
        <KpiCard label="Com Parecer" value={comParecer} tone="green" />
        <KpiCard label="Sem Parecer" value={semParecer.toLocaleString('pt-BR')} tone="gray" />
        <KpiCard label="Com Proibida" value={comProibida} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Top categorias</h3>
          {top7.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum dado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {top7.map(([cat, n], i) => (
                <div key={cat} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 truncate text-slate-600">{cat}</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(n / max) * 100}%`, backgroundColor: CORES[i % CORES.length] }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right font-semibold text-slate-700">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Consultas recentes (sessão)</h3>
          {entradas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sem consultas ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {entradas.slice(0, 6).map((h, i) => (
                <li key={i} className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-xs last:border-b-0">
                  <span className="font-mono text-slate-400">{h.ts}</span>
                  <span className="flex-1 truncate text-slate-700">{h.nome}</span>
                  <span className="rounded bg-status-blue-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-blue">
                    {h.tipo === 'cotacao' ? 'Cotação' : 'Consulta'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
