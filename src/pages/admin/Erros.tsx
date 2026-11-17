import { CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CabecalhoAdmin } from '@/components/admin/AdminUi'
import { Button } from '@/components/ui/Button'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useExcluirErros } from '@/hooks/useAdmin'
import { useConfirm } from '@/hooks/useConfirm'
import { useErrosApp } from '@/hooks/useHistorico'
import { useToast } from '@/hooks/useToast'
import { agruparErros, tempoRelativo } from '@/utils/admin'
import { dataHora } from '@/utils/historico'

/** Erros de tela (item 113), agrupados por tipo — no estilo de ferramentas de monitoramento (Sentry). */
export default function Erros() {
  const { data: erros = [], isLoading, error } = useErrosApp(true)
  const excluir = useExcluirErros()
  const confirmar = useConfirm()
  const toast = useToast()
  const [aberto, setAberto] = useState<string | null>(null)
  const grupos = useMemo(() => agruparErros(erros), [erros])

  const resolver = async (ids: string[], texto: string) => {
    if (!(await confirmar({ message: `${texto} Os registros somem desta lista; se o erro voltar a acontecer, ele aparece de novo.`, confirmLabel: 'Marcar como resolvido' }))) return
    try {
      await excluir.mutateAsync(ids)
      toast.show('Marcado como resolvido')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao limpar', 'error')
    }
  }

  return (
    <>
      <CabecalhoAdmin
        titulo="Erros"
        descricao="Quando uma tela quebra para alguém, o erro é registrado aqui sozinho, sem depender de print. Erros iguais aparecem juntos."
        acoes={
          grupos.length > 0 && (
            <Button variant="outline" onClick={() => void resolver(erros.map((e) => e.id), 'Marcar todos os erros como resolvidos?')}>
              <CheckCircle2 className="h-4 w-4" /> Resolver todos
            </Button>
          )
        }
      />

      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <p className="text-sm text-slate-500">Registro de erros indisponível — rode a migration 202611110001 no Supabase.</p>
      ) : !grupos.length ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-status-green" />
          <p className="text-sm font-medium text-slate-800">Nenhum erro registrado</p>
          <p className="text-xs text-slate-500">As telas estão funcionando para todo mundo.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {grupos.map((g) => {
            const on = aberto === g.chave
            return (
              <li key={g.chave} className="rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <button type="button" aria-expanded={on} onClick={() => setAberto(on ? null : g.chave)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${g.versaoAntiga ? 'bg-status-amber-bg text-status-amber' : 'bg-status-red-bg text-status-red'}`}>
                      {g.versaoAntiga ? <RefreshCw className="h-4 w-4" /> : <span className="text-sm font-bold">!</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block break-words text-sm font-medium ${g.versaoAntiga ? 'text-slate-800' : 'text-status-red'}`}>{g.mensagem}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {g.ocorrencias} {g.ocorrencias === 1 ? 'vez' : 'vezes'} · {g.usuarios.length} {g.usuarios.length === 1 ? 'pessoa' : 'pessoas'} · última {tempoRelativo(g.ultima)}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 motion-safe:transition-transform ${on ? 'rotate-180' : ''}`} />
                  </button>
                  <Button variant="outline" size="sm" className="self-start" onClick={() => void resolver(g.ids, 'Marcar este erro como resolvido?')}>
                    Resolvido
                  </Button>
                </div>
                {on && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    {g.versaoAntiga && (
                      <p className="rounded-lg bg-status-amber-bg p-2.5 text-status-amber">
                        Acontece quando o portal é atualizado enquanto a pessoa está com ele aberto: o navegador procura um arquivo da versão anterior. Não é defeito de tela — e agora o portal recarrega sozinho nesse caso.
                      </p>
                    )}
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div><dt className="font-semibold text-slate-500">Primeira vez</dt><dd>{dataHora(g.primeira)}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Última vez</dt><dd>{dataHora(g.ultima)}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Pessoas</dt><dd className="break-all">{g.usuarios.join(', ') || '—'}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Telas</dt><dd className="break-all">{g.telas.join(', ') || '—'}</dd></div>
                    </dl>
                    {g.detalhe && <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">{g.detalhe}</pre>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
