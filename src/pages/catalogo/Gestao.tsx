import { useMemo, useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useConfirm } from '@/hooks/useConfirm'
import { useHospital } from '@/hooks/useHospital'
import { useToast } from '@/hooks/useToast'
import {
  useAreas,
  useAreasDoItem,
  useDefinirAreaItem,
  useDefinirGruposDoItem,
  useExcluirArea,
  useExcluirGrupo,
  useExcluirItem,
  useGrupos,
  useGruposDoItem,
  useItens,
  useRemoverAreaItem,
  useSalvarArea,
  useSalvarGrupo,
  useSalvarItem,
} from '@/hooks/useCatalogo'
import type { Area, Grupo, ItemCatalogo } from '@/types'

const PAGE_SIZE = 20

function novoId() {
  return crypto.randomUUID()
}

// ---- Aba Áreas ----

function AbaAreas() {
  const { hospitalId } = useHospital()
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: areas = [], isLoading } = useAreas(hospitalId)
  const salvar = useSalvarArea(hospitalId)
  const excluir = useExcluirArea(hospitalId)
  const [nomeNovo, setNomeNovo] = useState('')

  const adicionar = async () => {
    if (!nomeNovo.trim()) return
    try {
      await salvar.mutateAsync({ id: novoId(), hospitalId, nome: nomeNovo.trim(), ordem: areas.length, ativo: true })
      setNomeNovo('')
      toast.show('Área cadastrada')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao cadastrar área', 'error')
    }
  }

  const handleExcluir = async (area: Area) => {
    if (!(await confirmar({ message: `Excluir a área "${area.nome}"? Itens vinculados a ela perdem o vínculo.`, tone: 'danger', confirmLabel: 'Excluir' })))
      return
    try {
      await excluir.mutateAsync(area.id)
      toast.show('Área excluída')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir área', 'error')
    }
  }

  if (isLoading) return <SkeletonRows linhas={5} colunas={2} />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome da nova área (ex: Centro Cirúrgico)"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        />
        <Button onClick={adicionar} disabled={!nomeNovo.trim() || salvar.isPending}>
          + Adicionar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Área</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhuma área cadastrada ainda.
                </td>
              </tr>
            )}
            {areas.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">{a.nome}</td>
                <td className="px-3 py-2">
                  <IconButton title="Excluir área" tone="danger" onClick={() => handleExcluir(a)}>
                    ✕
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---- Aba Grupos ----

function ModalGrupo({ grupo, onClose }: { grupo: Grupo; onClose: () => void }) {
  const toast = useToast()
  const salvar = useSalvarGrupo()
  const [descricaoUso, setDescricaoUso] = useState(grupo.descricaoUso)

  const salvarEFechar = async () => {
    try {
      await salvar.mutateAsync({ ...grupo, descricaoUso: descricaoUso.trim() })
      toast.show('Grupo salvo')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar grupo', 'error')
    }
  }

  return (
    <Modal
      title={grupo.nome}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={salvarEFechar} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Descrição de uso típico deste grupo (aparece em "Como é usado" nos itens que não tiverem resumo próprio)
        <textarea
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          rows={3}
          placeholder="Ex: usadas para fixação de curativos, imobilização e compressão em grandes áreas do corpo..."
          value={descricaoUso}
          onChange={(e) => setDescricaoUso(e.target.value)}
        />
      </label>
    </Modal>
  )
}

function AbaGrupos() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: grupos = [], isLoading } = useGrupos()
  const salvar = useSalvarGrupo()
  const excluir = useExcluirGrupo()
  const [nomeNovo, setNomeNovo] = useState('')
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null)

  const adicionar = async () => {
    if (!nomeNovo.trim()) return
    try {
      await salvar.mutateAsync({ id: novoId(), nome: nomeNovo.trim(), ordem: grupos.length, descricaoUso: '' })
      setNomeNovo('')
      toast.show('Grupo cadastrado')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao cadastrar grupo', 'error')
    }
  }

  const handleExcluir = async (grupo: Grupo) => {
    if (!(await confirmar({ message: `Excluir o grupo "${grupo.nome}"? Itens vinculados a ele perdem o vínculo.`, tone: 'danger', confirmLabel: 'Excluir' })))
      return
    try {
      await excluir.mutateAsync(grupo.id)
      toast.show('Grupo excluído')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir grupo', 'error')
    }
  }

  if (isLoading) return <SkeletonRows linhas={5} colunas={2} />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome do novo grupo (ex: Cateteres)"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        />
        <Button onClick={adicionar} disabled={!nomeNovo.trim() || salvar.isPending}>
          + Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {grupos.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <button type="button" className="truncate text-left text-slate-700 hover:underline" onClick={() => setGrupoEditando(g)}>
              {g.nome}
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton title="Editar descrição de uso" onClick={() => setGrupoEditando(g)}>
                ✏
              </IconButton>
              <IconButton title="Excluir grupo" tone="danger" onClick={() => handleExcluir(g)}>
                ✕
              </IconButton>
            </div>
          </div>
        ))}
        {grupos.length === 0 && <p className="col-span-full text-sm text-slate-400">Nenhum grupo cadastrado ainda.</p>}
      </div>

      {grupoEditando && <ModalGrupo grupo={grupoEditando} onClose={() => setGrupoEditando(null)} />}
    </div>
  )
}

// ---- Modal de edição de item (dados + vínculos) ----

function ModalItem({ item, onClose }: { item: ItemCatalogo; onClose: () => void }) {
  const { hospitalId } = useHospital()
  const toast = useToast()
  const salvarItem = useSalvarItem()
  const { data: todosGrupos = [] } = useGrupos()
  const { data: gruposDoItem = [] } = useGruposDoItem(item.id)
  const definirGrupos = useDefinirGruposDoItem()
  const { data: areasHospital = [] } = useAreas(hospitalId)
  const { data: areasDoItem = [] } = useAreasDoItem(item.id)
  const definirArea = useDefinirAreaItem()
  const removerArea = useRemoverAreaItem()

  const [nome, setNome] = useState(item.nome)
  const [unidade, setUnidade] = useState(item.unidadePadrao)
  const [codSoulmv, setCodSoulmv] = useState(item.codSoulmv ?? '')
  const [sinonimos, setSinonimos] = useState(item.sinonimos.join(', '))
  const [observacao, setObservacao] = useState(item.observacao)
  const [resumoUso, setResumoUso] = useState(item.resumoUso)
  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>(gruposDoItem)

  const salvar = async () => {
    try {
      await salvarItem.mutateAsync({
        id: item.id,
        nome: nome.trim(),
        unidadePadrao: unidade.trim(),
        codSoulmv: codSoulmv.trim() || null,
        sinonimos: sinonimos
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        observacao: observacao.trim(),
        resumoUso: resumoUso.trim(),
      })
      await definirGrupos.mutateAsync({ itemId: item.id, grupoIds: gruposSelecionados })
      toast.show('Item salvo')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar item', 'error')
    }
  }

  const alternarGrupo = (grupoId: string) => {
    setGruposSelecionados((atual) => (atual.includes(grupoId) ? atual.filter((g) => g !== grupoId) : [...atual, grupoId]))
  }

  const areaVinculada = (areaId: string) => areasDoItem.find((v) => v.areaId === areaId)

  const alternarArea = async (areaId: string) => {
    const vinculo = areaVinculada(areaId)
    try {
      if (vinculo) {
        await removerArea.mutateAsync({ itemId: item.id, areaId })
      } else {
        await definirArea.mutateAsync({ itemId: item.id, areaId, principal: false })
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao alterar vínculo de área', 'error')
    }
  }

  const definirPrincipal = async (areaId: string) => {
    try {
      await definirArea.mutateAsync({ itemId: item.id, areaId, principal: true })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao definir área principal', 'error')
    }
  }

  return (
    <Modal
      title={item.nome}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim() || salvarItem.isPending}>
            {salvarItem.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Nome
            <input className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Unidade padrão de compra
            <input className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Código no SoulMV
            <input className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={codSoulmv} onChange={(e) => setCodSoulmv(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Sinônimos (separados por vírgula)
            <input className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={sinonimos} onChange={(e) => setSinonimos(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Observação
          <textarea
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Resumo de uso (como esse item é usado — deixe em branco pra usar a descrição geral do grupo)
          <textarea
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Ex: usada para fixação de curativos, imobilizações e terapias compressivas em grandes áreas do corpo..."
            value={resumoUso}
            onChange={(e) => setResumoUso(e.target.value)}
          />
        </label>

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Grupos</p>
          <div className="flex flex-wrap gap-1.5">
            {todosGrupos.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => alternarGrupo(g.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  gruposSelecionados.includes(g.id)
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {g.nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Áreas onde é usado (hospital ativo)
          </p>
          <div className="flex flex-col gap-1">
            {areasHospital.length === 0 && <p className="text-xs text-slate-400">Nenhuma área cadastrada pra este hospital ainda.</p>}
            {areasHospital.map((a) => {
              const vinculo = areaVinculada(a.id)
              return (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <label className="flex flex-1 items-center gap-2">
                    <input type="checkbox" checked={!!vinculo} onChange={() => alternarArea(a.id)} />
                    {a.nome}
                  </label>
                  {vinculo && (
                    <button
                      type="button"
                      onClick={() => definirPrincipal(a.id)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        vinculo.principal ? 'bg-status-amber-bg text-status-amber' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title="Marcar como área principal"
                    >
                      {vinculo.principal ? '★ Principal' : 'Tornar principal'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ---- Aba Itens ----

function AbaItens() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: itens = [], isLoading } = useItens()
  const excluir = useExcluirItem()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)
  const [itemEditando, setItemEditando] = useState<ItemCatalogo | null>(null)

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens
    return itens.filter((i) => i.nome.toLowerCase().includes(termo) || i.codSoulmv?.toLowerCase().includes(termo))
  }, [itens, busca])

  const pagina0 = Math.min(pagina, Math.max(0, Math.ceil(filtrados.length / PAGE_SIZE) - 1))
  const visiveis = filtrados.slice(pagina0 * PAGE_SIZE, pagina0 * PAGE_SIZE + PAGE_SIZE)

  const handleExcluir = async (item: ItemCatalogo) => {
    if (!(await confirmar({ message: `Excluir o item "${item.nome}"?`, tone: 'danger', confirmLabel: 'Excluir' }))) return
    try {
      await excluir.mutateAsync(item.id)
      toast.show('Item excluído')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir item', 'error')
    }
  }

  if (isLoading) return <SkeletonRows linhas={8} colunas={4} />

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Buscar por nome ou código SoulMV..."
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          setPagina(0)
        }}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Item</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Cód. SoulMV</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Unidade</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
            {visiveis.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">{item.nome}</td>
                <td className="px-3 py-2 text-slate-500">{item.codSoulmv ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{item.unidadePadrao || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <IconButton title="Editar" onClick={() => setItemEditando(item)}>
                      ✏
                    </IconButton>
                    <IconButton title="Excluir" tone="danger" onClick={() => handleExcluir(item)}>
                      ✕
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={pagina0} pageSize={PAGE_SIZE} totalItems={filtrados.length} onPageChange={setPagina} />

      {itemEditando && <ModalItem item={itemEditando} onClose={() => setItemEditando(null)} />}
    </div>
  )
}

// ---- Página ----

const ABAS = [
  { key: 'areas', label: 'Áreas' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'itens', label: 'Itens' },
] as const

export default function Gestao() {
  const [aba, setAba] = useState<(typeof ABAS)[number]['key']>('areas')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Gestão do Catálogo</h1>
        <p className="text-sm text-slate-500">Cadastre áreas, grupos e itens, e vincule cada item às áreas onde é usado.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAba(a.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              aba === a.key ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'areas' && <AbaAreas />}
      {aba === 'grupos' && <AbaGrupos />}
      {aba === 'itens' && <AbaItens />}
    </div>
  )
}
