import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useHospital } from '@/hooks/useHospital'
import { useAreas, useBuscaItens, useGruposDoItem, useGrupos, useItensDaArea } from '@/hooks/useCatalogo'
import type { ItemCatalogo } from '@/types'

function destacar(texto: string, termo: string) {
  if (!termo) return texto
  const idx = texto.toUpperCase().indexOf(termo.toUpperCase())
  if (idx < 0) return texto
  return (
    <>
      {texto.slice(0, idx)}
      <mark className="rounded-sm bg-blue-200 text-blue-800">{texto.slice(idx, idx + termo.length)}</mark>
      {texto.slice(idx + termo.length)}
    </>
  )
}

function PainelDetalheItem({ item }: { item: ItemCatalogo }) {
  const { data: gruposIds = [] } = useGruposDoItem(item.id)
  const { data: todosGrupos = [] } = useGrupos()
  const nomesGrupos = gruposIds.map((id) => todosGrupos.find((g) => g.id === id)?.nome).filter(Boolean)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{item.nome}</h3>
        {item.codSoulmv && <p className="text-xs text-slate-400">Código SoulMV: {item.codSoulmv}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Unidade padrão</p>
          <p className="text-slate-700">{item.unidadePadrao || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Grupos</p>
          <p className="text-slate-700">{nomesGrupos.length > 0 ? nomesGrupos.join(', ') : 'Uso geral (sem grupo)'}</p>
        </div>
      </div>

      {item.sinonimos.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Também conhecido como</p>
          <p className="text-sm text-slate-700">{item.sinonimos.join(', ')}</p>
        </div>
      )}

      {item.observacao && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Observação</p>
          <p className="text-sm text-slate-700">{item.observacao}</p>
        </div>
      )}

      {item.codSoulmv && (
        <Link
          to={`/pareceres?produto=${encodeURIComponent(item.nome)}`}
          className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          🩺 Ver parecer técnico
        </Link>
      )}
    </div>
  )
}

export default function Navegar() {
  const { hospitalId } = useHospital()
  const { data: areas = [], isLoading: carregandoAreas, error: erroAreas } = useAreas(hospitalId)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [itemSelecionado, setItemSelecionado] = useState<ItemCatalogo | null>(null)

  const { data: itensDaArea = [], isLoading: carregandoItens } = useItensDaArea(areaId)
  const { data: itensBusca = [], isLoading: carregandoBusca } = useBuscaItens(busca)

  const emBusca = busca.trim().length > 0
  const itens = emBusca ? itensBusca : itensDaArea
  const carregandoLista = emBusca ? carregandoBusca : carregandoItens

  const areaSelecionada = useMemo(() => areas.find((a) => a.id === areaId) ?? null, [areas, areaId])

  if (erroAreas) {
    return <p className="text-sm text-status-red">Erro ao carregar áreas: {erroAreas.message}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Catálogo de Materiais por Área Hospitalar</h1>
        <p className="text-sm text-slate-500">Onde cada material é usado no hospital — sem controle de estoque ou quantidade.</p>
      </div>

      <input
        type="text"
        placeholder="Buscar item por nome ou sinônimo (em todas as áreas)..."
        className="w-full max-w-lg rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_360px]">
        <nav className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-2 shadow-soft-sm lg:max-h-[70vh] lg:overflow-y-auto">
          {carregandoAreas ? (
            <p className="p-2 text-xs text-slate-400">Carregando...</p>
          ) : areas.length === 0 ? (
            <p className="p-2 text-xs text-slate-400">
              Nenhuma área cadastrada pra este hospital ainda — cadastre em "Gestão".
            </p>
          ) : (
            areas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAreaId(a.id)
                  setItemSelecionado(null)
                }}
                className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  areaId === a.id && !emBusca ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {a.nome}
              </button>
            ))
          )}
        </nav>

        <div className="rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
          {carregandoLista ? (
            <div className="p-2">
              <SkeletonRows linhas={8} colunas={1} />
            </div>
          ) : !emBusca && !areaSelecionada ? (
            <EmptyState icon="🗂️" title="Escolha uma área" description="Selecione uma área à esquerda pra ver os itens vinculados a ela." />
          ) : itens.length === 0 ? (
            <EmptyState
              icon="📭"
              title={emBusca ? 'Nenhum item encontrado' : 'Nenhum item vinculado a esta área ainda'}
              description={emBusca ? undefined : 'Vincule itens a esta área pela tela de Gestão.'}
            />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {itens.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setItemSelecionado(item)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                      itemSelecionado?.id === item.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-800">{emBusca ? destacar(item.nome, busca) : item.nome}</span>
                    {item.codSoulmv && <span className="text-[11px] text-slate-400">Cód. {item.codSoulmv}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {itemSelecionado ? (
            <PainelDetalheItem item={itemSelecionado} />
          ) : (
            <EmptyState icon="🔍" title="Selecione um item" description="Os detalhes aparecem aqui." />
          )}
        </div>
      </div>
    </div>
  )
}
