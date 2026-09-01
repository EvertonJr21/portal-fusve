import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useSalvarParecer } from '@/hooks/usePareceres'
import { useToast } from '@/hooks/useToast'
import type { Produto } from '@/data/produtos'
import type { Parecer } from '@/types'
import { toInput, fromInput } from '@/utils/date'
import { MarcasEditor, type MarcasPorCategoria } from './MarcasEditor'

interface ParecerFormProps {
  produto: Produto
  parecerExistente: Parecer | null
  onSalvo: () => void
}

const MARCAS_VAZIAS: MarcasPorCategoria = { padrao: [], permitidas: [], restritas: [], proibidas: [] }

export function ParecerForm({ produto, parecerExistente, onSalvo }: ParecerFormProps) {
  const salvar = useSalvarParecer()
  const toast = useToast()

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
  const [pdf, setPdf] = useState<{ nome: string; dataUrl: string } | null>(
    parecerExistente?.pdfDataUrl ? { nome: parecerExistente.parecer, dataUrl: parecerExistente.pdfDataUrl } : null,
  )

  const handlePdf = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPdf({ nome: file.name, dataUrl: e.target?.result as string })
      toast.show('PDF vinculado')
    }
    reader.readAsDataURL(file)
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
        parecer: pdf?.nome ?? '',
        pdfDataUrl: pdf?.dataUrl ?? null,
      })
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

      <MarcasEditor value={marcas} onChange={setMarcas} />

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

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">PDF do parecer</span>
        <input
          type="file"
          accept="application/pdf"
          className="text-xs"
          onChange={(e) => handlePdf(e.target.files?.[0])}
        />
        {pdf && (
          <a href={pdf.dataUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline">
            📄 {pdf.nome}
          </a>
        )}
      </label>

      <Button type="submit" loading={salvar.isPending} className="self-start">
        {parecerExistente ? 'Atualizar parecer' : 'Cadastrar parecer'}
      </Button>
    </form>
  )
}
