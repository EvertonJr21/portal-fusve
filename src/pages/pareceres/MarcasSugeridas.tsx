import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useExcluirMarcasSugeridas, useMarcasSugeridas, useSalvarMarcasSugeridas } from '@/hooks/useMarcasSugeridas'
import { useToast } from '@/hooks/useToast'

interface CategoriaCardProps {
  cat: string
  marcas: string[]
}

function CategoriaCard({ cat, marcas }: CategoriaCardProps) {
  const salvar = useSalvarMarcasSugeridas()
  const excluir = useExcluirMarcasSugeridas()
  const toast = useToast()
  const [input, setInput] = useState('')

  const adicionar = () => {
    const marca = input.trim()
    if (!marca || marcas.includes(marca)) return
    salvar.mutate({ cat, marcas: [...marcas, marca] })
    setInput('')
  }

  const remover = (m: string) => salvar.mutate({ cat, marcas: marcas.filter((x) => x !== m) })

  const handleExcluir = () => {
    if (!confirm(`Remover a categoria "${cat}" da lista de recomendações?`)) return
    excluir.mutate(cat, { onSuccess: () => toast.show('Categoria removida') })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{cat}</span>
        <button type="button" onClick={handleExcluir} className="text-xs text-status-red hover:underline">
          Remover
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {marcas.length === 0 && <span className="text-xs text-slate-300">Nenhuma marca recomendada</span>}
        {marcas.map((m) => (
          <span key={m} className="flex items-center gap-1 rounded bg-status-purple-bg px-1.5 py-0.5 text-xs text-status-purple">
            {m}
            <button
              type="button"
              onClick={() => remover(m)}
              className="text-status-purple/60 hover:text-status-red"
              aria-label={`Remover ${m}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Adicionar marca recomendada..."
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
        />
        <button type="button" onClick={adicionar} className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">
          +
        </button>
      </div>
    </div>
  )
}

export default function MarcasSugeridas() {
  const { data: mapa = {}, isLoading } = useMarcasSugeridas()
  const salvar = useSalvarMarcasSugeridas()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')

  const categorias = Object.keys(mapa).sort()
  const filtradas = categorias.filter((c) => c.toUpperCase().includes(busca.toUpperCase()))

  const adicionarCategoria = () => {
    const cat = novaCategoria.trim().toUpperCase()
    if (!cat) return
    if (mapa[cat]) {
      toast.show('Categoria já existe', 'warn')
      return
    }
    salvar.mutate({ cat, marcas: [] })
    setNovaCategoria('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Marcas Sugeridas</h2>
        <p className="text-sm text-slate-500">
          Recomendação de mercado por categoria, mostrada na Consulta quando um produto ainda não tem parecer técnico cadastrado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar categoria..."
          className="min-w-64 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <input
          type="text"
          placeholder="Nova categoria..."
          className="min-w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionarCategoria()
            }
          }}
        />
        <Button variant="outline" onClick={adicionarCategoria}>
          + Categoria
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows colunas={3} />
      ) : filtradas.length === 0 ? (
        <EmptyState icon="🏷️" title="Nenhuma categoria encontrada." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((cat) => (
            <CategoriaCard key={cat} cat={cat} marcas={mapa[cat]} />
          ))}
        </div>
      )}
    </div>
  )
}
