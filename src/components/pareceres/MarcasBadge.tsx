import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import type { MarcaCategoria, ParecerAnexo } from '@/types'

const TONE_CLASS: Record<MarcaCategoria, string> = {
  padrao: 'bg-status-blue-bg text-status-blue',
  permitidas: 'bg-status-green-bg text-status-green',
  restritas: 'bg-status-amber-bg text-status-amber',
  proibidas: 'bg-status-red-bg text-status-red',
}

const ICONE: Partial<Record<MarcaCategoria, string>> = {
  restritas: '⚠ ',
  proibidas: '🚫 ',
}

interface MarcasBadgeProps {
  marcas: string[]
  categoria: MarcaCategoria
  /** Anexos deste parecer (todas as categorias) — usado só pra achar os desta marca/categoria e mostrar o 📎N. */
  anexos?: ParecerAnexo[]
  onAbrirAnexo?: (anexo: ParecerAnexo) => void
}

export function MarcasBadge({ marcas, categoria, anexos = [], onAbrirAnexo }: MarcasBadgeProps) {
  if (!marcas.length) return <span className="text-xs text-slate-300">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {marcas.map((m) => {
        const anexosDaMarca = anexos.filter((a) => a.categoria === categoria && a.marca === m)
        return (
          <span key={m} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CLASS[categoria]}`}>
            {ICONE[categoria] ?? ''}
            {m}
            {anexosDaMarca.length === 1 && (
              <button
                type="button"
                title={anexosDaMarca[0].nomeArquivo}
                onClick={() => onAbrirAnexo?.(anexosDaMarca[0])}
                className="rounded-full bg-white/60 px-1 text-[10px] font-bold hover:bg-white"
              >
                📎
              </button>
            )}
            {anexosDaMarca.length > 1 && (
              <Dropdown
                trigger={
                  <button type="button" className="rounded-full bg-white/60 px-1 text-[10px] font-bold hover:bg-white">
                    📎{anexosDaMarca.length}
                  </button>
                }
              >
                {anexosDaMarca.map((a) => (
                  <DropdownItem key={a.id} onClick={() => onAbrirAnexo?.(a)}>
                    📄 {a.nomeArquivo}
                  </DropdownItem>
                ))}
              </Dropdown>
            )}
          </span>
        )
      })}
    </div>
  )
}
