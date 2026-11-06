import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FILTROS_VAZIOS, visaoDeParametro, type ChaveOrdem, type DirOrdem, type FiltrosOC, type VisaoOC } from '@/utils/ocLista'

export type ColunaOpcional = 'produto' | 'motivo' | 'acao'

export const COLUNAS_OPCIONAIS: { id: ColunaOpcional; label: string }[] = [
  { id: 'produto', label: 'Produto / solicitação' },
  { id: 'motivo', label: 'Motivo do atraso' },
  { id: 'acao', label: 'Prioridade e ação recomendada' },
]

interface EstadoSalvo {
  visao: VisaoOC
  filtros: FiltrosOC
  colunas: ColunaOpcional[]
  agrupar: boolean
  ordem: { chave: ChaveOrdem; dir: DirOrdem }
}

const KEY = 'fusve:ocsLista'

const PADRAO: EstadoSalvo = {
  visao: 'acao',
  filtros: FILTROS_VAZIOS,
  colunas: ['produto', 'motivo', 'acao'],
  agrupar: false,
  ordem: { chave: 'prioridade', dir: 1 },
}

function ler(): EstadoSalvo {
  try {
    const bruto = localStorage.getItem(KEY)
    if (!bruto) return PADRAO
    const salvo = JSON.parse(bruto) as Partial<EstadoSalvo>
    return {
      ...PADRAO,
      ...salvo,
      filtros: { ...FILTROS_VAZIOS, ...(salvo.filtros ?? {}), busca: '' },
      // Coluna que deixou de existir (ex.: "Última cobrança", removida a pedido) some do estado salvo.
      colunas: (salvo.colunas ?? PADRAO.colunas).filter((c) => COLUNAS_OPCIONAIS.some((o) => o.id === c)),
    }
  } catch {
    return PADRAO
  }
}

/**
 * Estado da tela de OCs (item 82): visão, filtros, colunas, agrupamento e ordem
 * ficam salvos no navegador (preferência por usuário/máquina, mesmo padrão de
 * `fusve:sidebarColapsada`). Visão e busca também vão pro endereço (`?visao=`,
 * `?q=`), pra o "voltar" do navegador e links da Busca Global funcionarem.
 */
export function useEstadoListaOCs() {
  const [params, setParams] = useSearchParams()
  const [estado, setEstado] = useState<EstadoSalvo>(() => {
    const base = ler()
    const visaoUrl = visaoDeParametro(params.get('rapido'), params.get('visao'))
    const q = params.get('q')
    return {
      ...base,
      visao: q ? 'todas' : (visaoUrl ?? base.visao),
      filtros: q ? { ...FILTROS_VAZIOS, busca: q } : base.filtros,
    }
  })

  // Link novo chegando com a tela já aberta (ex.: Busca Global com outro ?q=) —
  // ajuste de estado durante o render quando a URL muda, padrão recomendado pelo
  // React no lugar de um efeito.
  const qUrl = params.get('q')
  const visaoUrl = visaoDeParametro(params.get('rapido'), params.get('visao'))
  const chaveUrl = `${qUrl ?? ''}|${visaoUrl ?? ''}`
  const [urlVista, setUrlVista] = useState(chaveUrl)
  if (urlVista !== chaveUrl) {
    setUrlVista(chaveUrl)
    if (qUrl !== null && qUrl !== estado.filtros.busca) setEstado({ ...estado, visao: 'todas', filtros: { ...FILTROS_VAZIOS, busca: qUrl } })
    else if (qUrl === null && visaoUrl && visaoUrl !== estado.visao) setEstado({ ...estado, visao: visaoUrl })
  }

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(estado))
    } catch {
      /* sem localStorage — fica só nesta sessão */
    }
  }, [estado])

  const sincronizarUrl = useCallback(
    (visao: VisaoOC, busca: string) => {
      const p = new URLSearchParams()
      p.set('visao', visao)
      if (busca) p.set('q', busca)
      setParams(p, { replace: true })
    },
    [setParams],
  )

  const setVisao = (visao: VisaoOC) => {
    setEstado((e) => ({ ...e, visao }))
    sincronizarUrl(visao, estado.filtros.busca)
  }
  const setFiltros = (filtros: FiltrosOC) => {
    setEstado((e) => ({ ...e, filtros }))
    if (filtros.busca !== estado.filtros.busca) sincronizarUrl(estado.visao, filtros.busca)
  }
  const alternarColuna = (c: ColunaOpcional) =>
    setEstado((e) => ({ ...e, colunas: e.colunas.includes(c) ? e.colunas.filter((x) => x !== c) : [...e.colunas, c] }))
  const setAgrupar = (agrupar: boolean) => setEstado((e) => ({ ...e, agrupar }))
  const ordenarPor = (chave: ChaveOrdem) =>
    setEstado((e) => ({
      ...e,
      ordem: e.ordem.chave === chave ? { chave, dir: (e.ordem.dir === 1 ? -1 : 1) as DirOrdem } : { chave, dir: chave === 'prioridade' || chave === 'prazo' ? 1 : -1 },
    }))

  return { ...estado, setVisao, setFiltros, alternarColuna, setAgrupar, ordenarPor }
}
