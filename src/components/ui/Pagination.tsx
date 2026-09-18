import { Button } from './Button'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

/** Paginação client-side padrão — mesmo bloco "X–Y de Z + Anterior/Próxima" antes reescrito em cada tabela. */
export function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(totalItems / pageSize))
  const inicio = page * pageSize

  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>
        {totalItems === 0 ? '0 de 0' : `${inicio + 1}–${Math.min(inicio + pageSize, totalItems)} de ${totalItems}`}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          ← Anterior
        </Button>
        <Button variant="outline" disabled={page >= totalPaginas - 1} onClick={() => onPageChange(page + 1)}>
          Próxima →
        </Button>
      </div>
    </div>
  )
}
