import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'

const CORES = ['#3182CE', '#DD6B20', '#E53E3E', '#805AD5', '#00B5D8', '#D69E2E', '#38A169', '#DD2C6C', '#4A5568']

const PERIODOS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'tudo', label: 'Todo o período' },
] as const

export default function AnaliseCausas() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading } = useOCs(hospitalId)
  const { data: forns = [] } = useFornecedores()

  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]['value']>('90')
  const [fornecedorId, setFornecedorId] = useState('')

  if (isLoading) return <SkeletonRows linhas={4} colunas={2} />

  const limite = periodo === 'tudo' ? null : (() => {
    const d = new Date()
    d.setDate(d.getDate() - Number(periodo))
    return d
  })()

  const comMotivo = ocs.filter((o) => {
    if (!o.motivoAtraso) return false
    if (fornecedorId && String(o.fornecedorId) !== fornecedorId) return false
    if (limite) {
      const [dd, mm, yyyy] = (o.dataSolic ?? '').split('/')
      if (!dd) return false
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
      if (d < limite) return false
    }
    return true
  })

  const contagem = new Map<string, number>()
  for (const o of comMotivo) {
    contagem.set(o.motivoAtraso as string, (contagem.get(o.motivoAtraso as string) ?? 0) + 1)
  }
  const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1])
  const max = ordenado[0]?.[1] ?? 1
  const total = comMotivo.length

  const fornecedoresComOC = forns.filter((f) => ocs.some((o) => o.fornecedorId === f.id))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Análise de Causas</h2>
        <p className="text-sm text-slate-500">Principais motivos de ocorrência registrados nas OCs</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={periodo} onChange={(e) => setPeriodo(e.target.value as typeof periodo)}>
          {PERIODOS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
          <option value="">Todos os fornecedores</option>
          {fornecedoresComOC.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
      </div>

      <KpiCard label="Ocorrências com motivo registrado" value={total} tone="blue" />

      {ordenado.length === 0 ? (
        <EmptyState icon="📊" title="Nenhuma ocorrência com motivo registrado nesse filtro." description="Motivos são registrados no Histórico de cada OC, na Central de Pendências." />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft-sm">
          <div className="flex flex-col gap-3">
            {ordenado.map(([motivo, n], i) => (
              <div key={motivo} className="flex items-center gap-3 text-sm">
                <span className="w-48 shrink-0 truncate text-slate-600">{motivo}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${(n / max) * 100}%`, backgroundColor: CORES[i % CORES.length] }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">
                  {n} ({((n / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
