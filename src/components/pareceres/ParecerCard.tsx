import type { Produto } from '@/data/produtos'
import type { Parecer } from '@/types'
import { CATEGORIAS_MARCA, temAlgumaMarca } from '@/utils/marcas'
import { abrirPdfDataUrl } from '@/utils/pdfDataUrl'
import { MarcasBadge } from './MarcasBadge'

interface ParecerCardProps {
  produto: Produto
  parecer: Parecer | null
  marcasSugeridas: string[]
}

export function ParecerCard({ produto, parecer, marcasSugeridas }: ParecerCardProps) {
  const semParecer = !parecer || !temAlgumaMarca(parecer)

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="rounded bg-status-blue-bg px-2 py-1 font-mono text-xs font-bold text-status-blue">
          {produto.cod}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-800">{produto.nome}</div>
          <div className="text-xs text-slate-400">{produto.cat}</div>
        </div>
        {parecer?.pdfDataUrl && (
          <button
            type="button"
            onClick={() => abrirPdfDataUrl(parecer.pdfDataUrl!)}
            className="ml-auto rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          >
            📄 Ver Parecer
          </button>
        )}
      </div>

      <div className="p-4">
        {semParecer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">⚠️ Produto sem parecer técnico cadastrado.</p>
            {marcasSugeridas.length > 0 && (
              <div className="rounded-md border border-status-purple-bg bg-status-purple-bg/40 p-3">
                <p className="mb-2 text-xs font-semibold text-status-purple">
                  🟣 Marcas reconhecidas para {produto.cat} — sem parecer cadastrado
                </p>
                <div className="flex flex-wrap gap-1">
                  {marcasSugeridas.map((m) => (
                    <span key={m} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-status-purple">
                      {m}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-status-purple">
                  ⚠ Sugestão de mercado — não substitui avaliação técnica formal.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {CATEGORIAS_MARCA.map(({ key, label, descricao }) => (
                <div key={key}>
                  <div className="mb-1 text-xs font-semibold text-slate-600">
                    {label} <span className="font-normal text-slate-400">— {descricao}</span>
                  </div>
                  <MarcasBadge marcas={parecer![key]} categoria={key} />
                </div>
              ))}
            </div>
            {parecer!.observacao && (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                📌 {parecer!.observacao}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
