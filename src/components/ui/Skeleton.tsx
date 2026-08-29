interface SkeletonProps {
  className?: string
}

/** Bloco com shimmer — placeholder de carregamento. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_37%,#f1f5f9_63%)] bg-[length:200%_100%] ${className}`}
    />
  )
}

/** Linhas de esqueleto pra tabela, no lugar de "Carregando..." em texto puro. */
export function SkeletonRows({ linhas = 6, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
      {Array.from({ length: linhas }).map((_, linha) => (
        <div key={linha} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: colunas }).map((_, coluna) => (
            <Skeleton key={coluna} className={`h-3.5 ${coluna === 0 ? 'w-16' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
