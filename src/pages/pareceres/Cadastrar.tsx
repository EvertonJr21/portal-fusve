import { useState } from 'react'
import { ParecerForm } from '@/components/pareceres/ParecerForm'
import { SearchProduto } from '@/components/pareceres/SearchProduto'
import type { Produto } from '@/data/produtos'
import { usePareceres } from '@/hooks/usePareceres'

export default function Cadastrar() {
  const { data: pareceres = [] } = usePareceres()
  const [produto, setProduto] = useState<Produto | null>(null)

  const parecer = produto ? pareceres.find((p) => p.cod === produto.cod) ?? null : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Cadastrar Parecer</h2>
        <p className="text-sm text-slate-500">Busque o produto e vincule as marcas por categoria</p>
      </div>

      <div className="max-w-xl">
        <SearchProduto onSelect={setProduto} placeholder="Buscar produto para cadastrar parecer..." />
      </div>

      {produto && (
        <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ParecerForm produto={produto} parecerExistente={parecer} onSalvo={() => setProduto(null)} />
        </div>
      )}
    </div>
  )
}
