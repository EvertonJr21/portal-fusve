import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ParecerCard } from '@/components/pareceres/ParecerCard'
import { ParecerForm } from '@/components/pareceres/ParecerForm'
import { SearchProduto } from '@/components/pareceres/SearchProduto'
import { Button } from '@/components/ui/Button'
import type { Produto } from '@/data/produtos'
import { useMarcasSugeridas } from '@/hooks/useMarcasSugeridas'
import { usePareceres } from '@/hooks/usePareceres'
import { useHistoricoConsultas } from '@/hooks/useHistoricoConsultas'

export default function Consultar() {
  const { data: pareceres = [] } = usePareceres()
  const { data: marcasSugeridas = {} } = useMarcasSugeridas()
  const { registrar } = useHistoricoConsultas()
  const [searchParams] = useSearchParams()

  const [produto, setProduto] = useState<Produto | null>(null)
  const [editando, setEditando] = useState(false)

  const parecer = produto ? pareceres.find((p) => p.cod === produto.cod) ?? null : null

  const handleSelect = (p: Produto) => {
    setProduto(p)
    setEditando(false)
    registrar({ cod: p.cod, nome: p.nome, tipo: 'consulta' })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Consultar Parecer</h2>
        <p className="text-sm text-slate-500">Busque um produto pelo código ou nome</p>
      </div>

      <div className="max-w-xl">
        <SearchProduto onSelect={handleSelect} valorInicial={searchParams.get('produto') ?? ''} />
      </div>

      {produto && !editando && (
        <>
          <ParecerCard produto={produto} parecer={parecer} marcasSugeridas={marcasSugeridas[produto.cat] ?? []} />
          <Button variant="outline" className="self-start" onClick={() => setEditando(true)}>
            {parecer ? 'Editar Parecer' : 'Cadastrar Parecer'}
          </Button>
        </>
      )}

      {produto && editando && (
        <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ParecerForm produto={produto} parecerExistente={parecer} onSalvo={() => setEditando(false)} />
        </div>
      )}
    </div>
  )
}
