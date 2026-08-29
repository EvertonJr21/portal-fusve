import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { usePareceres } from '@/hooks/usePareceres'
import { useHistoricoConsultas } from '@/hooks/useHistoricoConsultas'
import type { BionexoItem } from '@/utils/bionexo'
import { parseBionexoText, parseItensManual } from '@/utils/bionexo'
import { statusBionexoDoParecer, type StatusBionexo } from '@/utils/marcas'

const STATUS_CFG: Record<StatusBionexo, { label: string; classe: string }> = {
  ok: { label: '🔵 Com Parecer', classe: 'bg-status-blue-bg text-status-blue' },
  tem_proibida: { label: '🔴 Tem Proibidas', classe: 'bg-status-red-bg text-status-red' },
  tem_restrita: { label: '🟡 Tem Restritas', classe: 'bg-status-amber-bg text-status-amber' },
  sem_parecer: { label: '🟣 Sem Parecer', classe: 'bg-status-purple-bg text-status-purple' },
}

interface ItemVerificado extends BionexoItem {
  status: StatusBionexo
}

export default function Bionexo() {
  const { data: pareceres = [] } = usePareceres()
  const { registrar } = useHistoricoConsultas()

  const [manual, setManual] = useState('')
  const [itens, setItens] = useState<ItemVerificado[] | null>(null)
  const [filtro, setFiltro] = useState<'all' | 'proibida' | 'atencao'>('all')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  const processar = (brutos: BionexoItem[], origem: string) => {
    if (!brutos.length) {
      setErro('Nenhum item encontrado. Verifique se é um relatório Bionexo válido.')
      return
    }
    const verificados: ItemVerificado[] = brutos.map((item) => {
      const parecer = pareceres.find((p) => p.cod === item.cod) ?? null
      return { ...item, status: statusBionexoDoParecer(parecer) }
    })
    setItens(verificados)
    setErro('')
    const bloqueados = verificados.filter((i) => i.status === 'tem_proibida').length
    registrar({ cod: '—', nome: `Cotação ${origem}: ${verificados.length} itens${bloqueados ? ` (${bloqueados} bloqueados)` : ''}`, tipo: 'cotacao' })
  }

  const handleArquivo = async (file: File | undefined) => {
    if (!file) return
    setProcessando(true)
    setErro('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'txt' || ext === 'csv') {
        const texto = await file.text()
        processar(parseBionexoText(texto).itens, file.name)
      } else {
        const { extractPdfLines } = await import('@/utils/pdf')
        const linhas = await extractPdfLines(file)
        processar(parseBionexoText(linhas.join('\n')).itens, file.name)
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao ler o arquivo')
    } finally {
      setProcessando(false)
    }
  }

  const verificarManual = () => {
    if (!manual.trim()) {
      setErro('Digite os itens antes de verificar.')
      return
    }
    processar(parseItensManual(manual), 'Entrada manual')
  }

  const limpar = () => {
    setItens(null)
    setManual('')
    setErro('')
    setFiltro('all')
  }

  const visiveis = itens
    ? itens.filter((i) => {
        if (filtro === 'proibida') return i.status === 'tem_proibida'
        if (filtro === 'atencao') return i.status === 'sem_parecer' || i.status === 'tem_restrita'
        return true
      })
    : []

  const contagem = { ok: 0, tem_proibida: 0, tem_restrita: 0, sem_parecer: 0 }
  itens?.forEach((i) => contagem[i.status]++)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Verificação Bionexo</h2>
        <p className="text-sm text-slate-500">Cole o PDF/texto de uma cotação e verifique as marcas automaticamente</p>
      </div>

      {!itens && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Arquivo (PDF, TXT ou CSV da Bionexo)</span>
            <input
              type="file"
              accept=".pdf,.txt,.csv"
              disabled={processando}
              onChange={(e) => handleArquivo(e.target.files?.[0])}
              className="text-xs"
            />
          </label>
          <div className="text-center text-xs text-slate-400">— ou —</div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Entrada manual (código, descrição, unidade, qtd)</span>
            <textarea
              className="h-32 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={'1995\tAGULHA 13 X 4,5MM\tUnidade\t100'}
            />
          </label>
          <Button variant="outline" className="self-start" onClick={verificarManual} disabled={processando}>
            Verificar entrada manual
          </Button>
          {erro && <p className="text-sm text-status-red">{erro}</p>}
        </div>
      )}

      {itens && (
        <>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-bold text-status-blue">{contagem.ok}</div>
                <div className="text-slate-400">Com Parecer OK</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-bold text-status-amber">{contagem.tem_restrita}</div>
                <div className="text-slate-400">C/ Restritas</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-bold text-status-red">{contagem.tem_proibida}</div>
                <div className="text-slate-400">C/ Proibidas</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-bold text-status-purple">{contagem.sem_parecer}</div>
                <div className="text-slate-400">Sem Parecer</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-bold text-slate-700">{itens.length}</div>
                <div className="text-slate-400">Total</div>
              </div>
            </div>
            <Button variant="outline" onClick={limpar}>
              Nova verificação
            </Button>
          </div>

          <div className="flex gap-2">
            {(['all', 'proibida', 'atencao'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  filtro === f ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-600 hover:border-blue-400'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'proibida' ? 'Proibidas' : 'Atenção'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-max text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Cód.</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Un.</th>
                  <th className="px-3 py-2 text-left">Qtd</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((item) => {
                  const cfg = STATUS_CFG[item.status]
                  return (
                    <tr key={item.num} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{item.num}</td>
                      <td className="px-3 py-1.5 font-mono">{item.cod}</td>
                      <td className="px-3 py-1.5">{item.desc}</td>
                      <td className="px-3 py-1.5 text-slate-400">{item.un}</td>
                      <td className="px-3 py-1.5">{item.qty > 0 ? item.qty.toLocaleString('pt-BR') : ''}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.classe}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
