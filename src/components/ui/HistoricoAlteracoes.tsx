import { useHistoricoAlteracoes } from '@/hooks/useHistorico'
import { dataHora, descreverAlteracao } from '@/utils/historico'

interface Props {
  tabela: 'ocs' | 'contratos'
  registroId: string | number
  /** Quantas mostrar antes do "ver todas". */
  limite?: number
}

/**
 * Quem mudou o quê e quando (item 93). Some sozinho se a tabela de histórico
 * ainda não existe no banco (migration 202611110001 não rodada).
 */
export function HistoricoAlteracoes({ tabela, registroId, limite = 30 }: Props) {
  const { data, error, isLoading } = useHistoricoAlteracoes(tabela, registroId)
  if (error || isLoading) return null
  const itens = data ?? []
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Histórico de alterações</h4>
      {itens.length === 0 ? (
        <p className="text-xs text-slate-400">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {itens.slice(0, limite).map((a) => (
            <li key={a.id} className="rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-1.5 text-xs">
              <div className="text-slate-700">{descreverAlteracao(a)}</div>
              <div className="text-[11px] text-slate-400">
                {dataHora(a.em)}
                {a.userEmail && ` · ${a.userEmail}`}
              </div>
            </li>
          ))}
          {itens.length > limite && <li className="text-[11px] text-slate-400">+ {itens.length - limite} alterações mais antigas</li>}
        </ul>
      )}
    </div>
  )
}
