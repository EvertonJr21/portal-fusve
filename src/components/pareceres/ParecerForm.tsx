import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/hooks/useConfirm'
import { useAnexosParecer, useExcluirAnexo, useSalvarAnexo, useAbrirAnexo } from '@/hooks/useParecerAnexos'
import { useSalvarParecer } from '@/hooks/usePareceres'
import { useToast } from '@/hooks/useToast'
import type { Produto } from '@/data/produtos'
import type { MarcaCategoria, Parecer } from '@/types'
import { toInput, fromInput } from '@/utils/date'
import { MarcasEditor, type AnexosPendentes, type MarcasPorCategoria } from './MarcasEditor'

interface ParecerFormProps {
  produto: Produto
  parecerExistente: Parecer | null
  onSalvo: () => void
}

const MARCAS_VAZIAS: MarcasPorCategoria = { padrao: [], permitidas: [], restritas: [], proibidas: [] }
const ANEXOS_PENDENTES_VAZIO: AnexosPendentes = { padrao: {}, permitidas: {}, restritas: {}, proibidas: {} }

export function ParecerForm({ produto, parecerExistente, onSalvo }: ParecerFormProps) {
  const salvar = useSalvarParecer()
  const toast = useToast()
  const confirmar = useConfirm()

  const { data: anexosExistentes = [] } = useAnexosParecer(produto.cod)
  const salvarAnexo = useSalvarAnexo()
  const excluirAnexo = useExcluirAnexo(produto.cod)
  const abrirAnexo = useAbrirAnexo()
  const [anexosPendentes, setAnexosPendentes] = useState<AnexosPendentes>(ANEXOS_PENDENTES_VAZIO)

  const [marcas, setMarcas] = useState<MarcasPorCategoria>(
    parecerExistente
      ? {
          padrao: parecerExistente.padrao,
          permitidas: parecerExistente.permitidas,
          restritas: parecerExistente.restritas,
          proibidas: parecerExistente.proibidas,
        }
      : MARCAS_VAZIAS,
  )
  const [observacao, setObservacao] = useState(parecerExistente?.observacao ?? '')
  const [responsavel, setResponsavel] = useState(parecerExistente?.responsavel ?? '')
  const [data, setData] = useState(toInput(parecerExistente?.dataParecer))
  // "PDF geral do parecer" foi retirado do formulário (22/09/2026, pedido do Everton —
  // só PDF por marca daqui pra frente). Parecer antigo que já tinha um PDF geral
  // preserva o campo intacto (nunca apagado por aqui), só não tem mais como editar.

  const handleAnexarPendente = (categoria: MarcaCategoria, marca: string, file: File) => {
    setAnexosPendentes((prev) => ({
      ...prev,
      [categoria]: { ...prev[categoria], [marca]: [...(prev[categoria][marca] ?? []), file] },
    }))
  }

  const handleRemoverPendente = (categoria: MarcaCategoria, marca: string, index: number) => {
    setAnexosPendentes((prev) => ({
      ...prev,
      [categoria]: { ...prev[categoria], [marca]: prev[categoria][marca].filter((_, i) => i !== index) },
    }))
  }

  const handleExcluirExistente = async (anexo: (typeof anexosExistentes)[number]) => {
    if (!(await confirmar({ message: `Remover o PDF "${anexo.nomeArquivo}" da marca ${anexo.marca}?`, tone: 'danger', confirmLabel: 'Remover' })))
      return
    try {
      await excluirAnexo.mutateAsync(anexo.id)
      toast.show('PDF removido')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao remover PDF', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const algumaMarca = Object.values(marcas).some((arr) => arr.length > 0)
    if (!algumaMarca) {
      toast.show('Adicione ao menos uma marca', 'warn')
      return
    }
    try {
      await salvar.mutateAsync({
        cod: produto.cod,
        nome: produto.nome,
        cat: produto.cat,
        ...marcas,
        observacao,
        responsavel,
        dataParecer: data ? fromInput(data) : '',
        // PDF geral não é mais editável por aqui — preserva o que já estava salvo
        // (parecer antigo que ainda tem um), nunca apaga.
        parecer: parecerExistente?.parecer ?? '',
        pdfPath: parecerExistente?.pdfPath ?? null,
        pdfDataUrl: parecerExistente?.pdfDataUrl ?? null,
      })

      // Parecer já existe (upsert acima garante isso) — agora sobe os PDFs pendentes por marca.
      for (const categoria of Object.keys(anexosPendentes) as MarcaCategoria[]) {
        for (const [marca, arquivos] of Object.entries(anexosPendentes[categoria])) {
          for (const arquivo of arquivos) {
            await salvarAnexo.mutateAsync({ parecerCod: produto.cod, categoria, marca, file: arquivo })
          }
        }
      }
      setAnexosPendentes(ANEXOS_PENDENTES_VAZIO)

      toast.show(parecerExistente ? 'Parecer atualizado!' : 'Produto cadastrado!')
      onSalvo()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar parecer', 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
        <span className="rounded bg-status-blue-bg px-2 py-1 font-mono text-xs font-bold text-status-blue">
          {produto.cod}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-800">{produto.nome}</div>
          <div className="text-xs text-slate-400">{produto.cat}</div>
        </div>
      </div>

      <MarcasEditor
        value={marcas}
        onChange={setMarcas}
        anexosExistentes={anexosExistentes}
        anexosPendentes={anexosPendentes}
        onAnexarPendente={handleAnexarPendente}
        onRemoverPendente={handleRemoverPendente}
        onExcluirExistente={handleExcluirExistente}
        onAbrirExistente={(a) => abrirAnexo.abrir(a.pdfPath)}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Observação</span>
        <textarea
          className="h-20 rounded-md border border-slate-300 px-2 py-1.5"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Responsável</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Data do parecer</span>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
      </div>

      <Button type="submit" loading={salvar.isPending} className="self-start">
        {parecerExistente ? 'Atualizar parecer' : 'Cadastrar parecer'}
      </Button>
    </form>
  )
}
