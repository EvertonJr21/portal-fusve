import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useObterUrlPdfParecer, useSalvarParecer, useUploadPdfParecer } from '@/hooks/usePareceres'
import { useToast } from '@/hooks/useToast'
import type { Produto } from '@/data/produtos'
import type { Parecer } from '@/types'
import { toInput, fromInput } from '@/utils/date'
import { abrirPdfDataUrl } from '@/utils/pdfDataUrl'
import { MarcasEditor, type MarcasPorCategoria } from './MarcasEditor'

interface ParecerFormProps {
  produto: Produto
  parecerExistente: Parecer | null
  onSalvo: () => void
}

const MARCAS_VAZIAS: MarcasPorCategoria = { padrao: [], permitidas: [], restritas: [], proibidas: [] }

export function ParecerForm({ produto, parecerExistente, onSalvo }: ParecerFormProps) {
  const salvar = useSalvarParecer()
  const uploadPdf = useUploadPdfParecer()
  const obterUrlPdf = useObterUrlPdfParecer()
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
  // PDF: `pdfPathExistente`/`pdfDataUrlExistente` só existem se o parecer já tinha um
  // arquivo salvo (Storage ou o base64 legado) — preservados até um arquivo NOVO ser
  // escolhido, pra editar outro campo não apagar o PDF já vinculado.
  const [nomeArquivo, setNomeArquivo] = useState(parecerExistente?.parecer ?? '')
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null)
  const [pdfPathExistente] = useState(parecerExistente?.pdfPath ?? null)
  const [pdfDataUrlExistente] = useState(parecerExistente?.pdfDataUrl ?? null)

  const handlePdf = (file: File | undefined) => {
    if (!file) return
    setArquivoNovo(file)
    setNomeArquivo(file.name)
    toast.show('PDF vinculado')
  }

  const handleAbrirPdf = async () => {
    if (arquivoNovo) {
      window.open(URL.createObjectURL(arquivoNovo), '_blank', 'noopener')
    } else if (pdfPathExistente) {
      const url = await obterUrlPdf.mutateAsync(pdfPathExistente)
      window.open(url, '_blank', 'noopener')
    } else if (pdfDataUrlExistente) {
      abrirPdfDataUrl(pdfDataUrlExistente)
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
      // Novo arquivo escolhido → sobe pro Storage e substitui o base64 legado, se houver.
      // Sem arquivo novo → mantém o que já estava salvo (path ou base64), não apaga nada.
      const pdfPath = arquivoNovo ? await uploadPdf.mutateAsync({ cod: produto.cod, file: arquivoNovo }) : pdfPathExistente
      const pdfDataUrl = arquivoNovo ? null : pdfDataUrlExistente

      await salvar.mutateAsync({
        cod: produto.cod,
        nome: produto.nome,
        cat: produto.cat,
        ...marcas,
        observacao,
        responsavel,
        dataParecer: data ? fromInput(data) : '',
        parecer: nomeArquivo,
        pdfPath,
        pdfDataUrl,
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

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700">PDF do parecer</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
            </svg>
            {nomeArquivo ? 'Trocar arquivo' : 'Escolher arquivo'}
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => handlePdf(e.target.files?.[0])}
            />
          </label>
          {nomeArquivo ? (
            <button type="button" onClick={handleAbrirPdf} className="text-xs text-blue-700 hover:underline">
              📄 {nomeArquivo}
            </button>
          ) : (
            <span className="text-xs text-slate-400">Nenhum arquivo selecionado</span>
          )}
        </div>
      </div>

      <Button type="submit" loading={salvar.isPending || uploadPdf.isPending} className="self-start">
        {parecerExistente ? 'Atualizar parecer' : 'Cadastrar parecer'}
      </Button>
    </form>
  )
}
