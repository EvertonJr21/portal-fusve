import { ClipboardList, FileSignature, CalendarDays, Stethoscope, type LucideIcon } from 'lucide-react'
import type { ModuloChave } from '@/constants'

/**
 * Mapa único da navegação (item 101): cada módulo é um espaço próprio, com as
 * suas páginas. Usado pela barra de módulos, pelo menu do módulo, pelo caminho
 * no topo da página e pela tela inicial — mexer aqui muda os quatro juntos.
 */

export interface PaginaModulo {
  to: string
  rotulo: string
  /** Só casa o caminho exato (página inicial do módulo). */
  exato?: boolean
  /** Mostra o número de pendências do módulo ao lado. */
  contador?: boolean
}

export interface GrupoPaginas {
  titulo?: string
  paginas: PaginaModulo[]
}

export interface ModuloNav {
  chave: ModuloChave
  /** Nome curto da barra de módulos. */
  rotulo: string
  titulo: string
  descricao: string
  base: string
  inicio: string
  icone: LucideIcon
  /** Cor do ícone na tela inicial (classes fixas, pro Tailwind enxergar). */
  cor: string
  /** As telas do módulo dependem do hospital ativo (mostra o seletor HUV/HMK no menu). */
  porHospital: boolean
  grupos: GrupoPaginas[]
}

export const NAV_MODULOS: ModuloNav[] = [
  {
    chave: 'ocs',
    rotulo: 'Compras',
    titulo: 'Compras',
    descricao: 'Ordens de compra, solicitações, fornecedores e entregas',
    base: '/ocs',
    inicio: '/ocs/ordens',
    icone: ClipboardList,
    cor: 'bg-status-blue-bg text-status-blue',
    porHospital: true,
    grupos: [
      {
        paginas: [
          { to: '/ocs/ordens', rotulo: 'Ordens de Compra', contador: true },
          { to: '/ocs/solicitacoes', rotulo: 'Solicitações' },
        ],
      },
      {
        titulo: 'Fornecedores',
        paginas: [
          { to: '/ocs/ranking', rotulo: 'Ranking de fornecedores' },
          { to: '/ocs/cadastro-fornecedores', rotulo: 'Cadastro de fornecedores' },
        ],
      },
      { titulo: 'Análise', paginas: [{ to: '/ocs/metricas', rotulo: 'Desempenho de entrega' }] },
      {
        titulo: 'Dados',
        paginas: [
          { to: '/ocs/importar', rotulo: 'Importar relatórios' },
          { to: '/ocs/exportar', rotulo: 'Exportar' },
        ],
      },
    ],
  },
  {
    chave: 'pareceres',
    rotulo: 'Pareceres',
    titulo: 'Pareceres técnicos',
    descricao: 'Marcas aprovadas, restritas e proibidas por produto',
    base: '/pareceres',
    inicio: '/pareceres',
    icone: Stethoscope,
    cor: 'bg-status-purple-bg text-status-purple',
    porHospital: false,
    grupos: [
      {
        paginas: [
          { to: '/pareceres', rotulo: 'Consultar', exato: true },
          { to: '/pareceres/base', rotulo: 'Base de pareceres' },
          { to: '/pareceres/cadastrar', rotulo: 'Cadastrar parecer' },
        ],
      },
      {
        titulo: 'Referência',
        paginas: [
          { to: '/pareceres/marcas-sugeridas', rotulo: 'Marcas sugeridas' },
          { to: '/pareceres/dashboard', rotulo: 'Painel' },
        ],
      },
    ],
  },
  {
    chave: 'contratos',
    rotulo: 'Contratos',
    titulo: 'Contratos',
    descricao: 'Acordos, produtos, comodatos e vigência',
    base: '/contratos',
    inicio: '/contratos',
    icone: FileSignature,
    cor: 'bg-status-green-bg text-status-green',
    porHospital: true,
    grupos: [{ paginas: [{ to: '/contratos', rotulo: 'Tabela mestre', exato: true, contador: true }] }],
  },
  {
    chave: 'opmes',
    rotulo: 'OPME',
    titulo: 'OPME',
    descricao: 'Cirurgias com OPME e status de entrega',
    base: '/opmes',
    inicio: '/opmes',
    icone: CalendarDays,
    cor: 'bg-status-amber-bg text-status-amber',
    porHospital: true,
    grupos: [
      {
        paginas: [
          { to: '/opmes', rotulo: 'Calendário', exato: true },
          { to: '/opmes/gestao', rotulo: 'Gestão', contador: true },
        ],
      },
    ],
  },
]

export function moduloDoCaminho(pathname: string): ModuloNav | undefined {
  return NAV_MODULOS.find((m) => pathname === m.base || pathname.startsWith(`${m.base}/`))
}

/** Página do módulo que corresponde ao caminho (a mais específica). */
export function paginaDoCaminho(modulo: ModuloNav, pathname: string): PaginaModulo | undefined {
  const todas = modulo.grupos.flatMap((g) => g.paginas)
  return todas
    .filter((p) => (p.exato ? pathname === p.to : pathname === p.to || pathname.startsWith(`${p.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]
}
