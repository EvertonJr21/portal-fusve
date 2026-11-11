import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { HistoricoConsultasProvider } from '@/components/pareceres/HistoricoConsultasProvider'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ModuloGuard } from '@/components/ui/ModuloGuard'
import { PaletaComandos } from '@/components/ui/PaletaComandos'
import { PageTransition } from '@/components/ui/PageTransition'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Sidebar, type NavGroup, type NavItem } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'

// Cada tela é baixada só quando é aberta (item 9 da revisão) — a abertura do portal fica mais leve.
const Admin = lazy(() => import('@/pages/Admin'))
const Exportar = lazy(() => import('@/pages/ocs/Exportar'))
const FichaFornecedor = lazy(() => import('@/pages/ocs/FichaFornecedor'))
const Fornecedores = lazy(() => import('@/pages/ocs/Fornecedores'))
const Importar = lazy(() => import('@/pages/ocs/Importar'))
const Metricas = lazy(() => import('@/pages/ocs/Metricas'))
const OrdensDeCompra = lazy(() => import('@/pages/ocs/OrdensDeCompra'))
const RankingFornecedores = lazy(() => import('@/pages/ocs/RankingFornecedores'))
const Solicitacoes = lazy(() => import('@/pages/ocs/Solicitacoes'))
const Modulos = lazy(() => import('@/pages/Modulos'))
const Calendario = lazy(() => import('@/pages/opmes/Calendario'))
const Gestao = lazy(() => import('@/pages/opmes/Gestao'))
const Cadastrar = lazy(() => import('@/pages/pareceres/Cadastrar'))
const Base = lazy(() => import('@/pages/pareceres/Base'))
const Consultar = lazy(() => import('@/pages/pareceres/Consultar'))
const DashboardPareceres = lazy(() => import('@/pages/pareceres/Dashboard'))
const MarcasSugeridas = lazy(() => import('@/pages/pareceres/MarcasSugeridas'))
const TabelaMestre = lazy(() => import('@/pages/contratos/TabelaMestre'))

// Agrupado por seção funcional. Enxugado de 12 pra 7 itens no item 82: Central de
// Pendências e Por Fornecedor viraram visões/agrupamento da própria tela de OCs,
// Análise de Causas virou coluna/filtro de motivo, Ciclo interno e Dashboard
// Executivo entraram em Desempenho de Entrega.
const OCS_GROUPS: NavGroup[] = [
  {
    title: 'Operação',
    items: [
      { to: '/ocs/ordens', label: 'Ordens de Compra' },
      { to: '/ocs/solicitacoes', label: 'Solicitações' },
    ],
  },
  {
    title: 'Fornecedores',
    items: [
      { to: '/ocs/ranking', label: 'Ranking de Fornecedores' },
      { to: '/ocs/cadastro-fornecedores', label: 'Cadastro de Fornecedores' },
    ],
  },
  {
    title: 'Análise',
    items: [{ to: '/ocs/metricas', label: 'Desempenho de Entrega' }],
  },
  {
    title: 'Dados',
    items: [
      { to: '/ocs/importar', label: 'Importar' },
      { to: '/ocs/exportar', label: 'Exportar' },
    ],
  },
]

function OCsLayout() {
  return (
    <ModuloGuard modulo="ocs">
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar title="Controle de OCs" groups={OCS_GROUPS} />
        <main className="min-w-0 flex-1 overflow-y-auto p-3 md:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </ModuloGuard>
  )
}

const PARECERES_ITEMS: NavItem[] = [
  { to: '/pareceres', label: 'Consultar', end: true },
  { to: '/pareceres/cadastrar', label: 'Cadastrar' },
  { to: '/pareceres/base', label: 'Base de Pareceres' },
  { to: '/pareceres/marcas-sugeridas', label: 'Marcas Sugeridas' },
  { to: '/pareceres/dashboard', label: 'Dashboard' },
]

function PareceresLayout() {
  return (
    <ModuloGuard modulo="pareceres">
      <HistoricoConsultasProvider>
        <div className="flex min-w-0 flex-1 flex-col md:flex-row">
          <Sidebar title="Parecer Técnico" items={PARECERES_ITEMS} />
          <main className="min-w-0 flex-1 overflow-y-auto p-3 md:p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </HistoricoConsultasProvider>
    </ModuloGuard>
  )
}

const CONTRATOS_ITEMS: NavItem[] = [{ to: '/contratos', label: 'Tabela Mestre', end: true }]

function ContratosLayout() {
  return (
    <ModuloGuard modulo="contratos">
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar title="Gestão de Contratos" items={CONTRATOS_ITEMS} />
        <main className="min-w-0 flex-1 overflow-y-auto p-3 md:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </ModuloGuard>
  )
}

const OPMES_ITEMS: NavItem[] = [
  { to: '/opmes', label: 'Calendário', end: true },
  { to: '/opmes/gestao', label: 'Gestão' },
]

function OpmesLayout() {
  return (
    <ModuloGuard modulo="opmes">
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar title="Controle de OPME" items={OPMES_ITEMS} />
        <main className="min-w-0 flex-1 overflow-y-auto p-3 md:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </ModuloGuard>
  )
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <PaletaComandos />
      <div className="flex min-w-0 flex-1">
        <ErrorBoundary chave={pathname}>
        <Suspense fallback={<div className="flex-1 p-6"><SkeletonRows /></div>}>
        <Routes>
          <Route
            path="/"
            element={
              <PageTransition>
                <Modulos />
              </PageTransition>
            }
          />

          <Route path="/usuarios" element={<Navigate to="/admin" replace />} />

          <Route
            path="/admin"
            element={
              <PageTransition>
                <Admin />
              </PageTransition>
            }
          />

          <Route path="/ocs" element={<OCsLayout />}>
            {/* Telas antigas (item 82) redirecionam pra onde o conteúdo foi parar. */}
            <Route index element={<Navigate to="/ocs/ordens" replace />} />
            <Route path="executivo" element={<Navigate to="/ocs/metricas" replace />} />
            <Route path="ordens" element={<OrdensDeCompra />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="fornecedores" element={<Navigate to="/ocs/ordens" replace />} />
            <Route path="ranking" element={<RankingFornecedores />} />
            <Route path="ranking/:fornecedorId" element={<FichaFornecedor />} />
            <Route path="cadastro-fornecedores" element={<Fornecedores />} />
            <Route path="sla" element={<Navigate to="/ocs/metricas" replace />} />
            <Route path="causas" element={<Navigate to="/ocs/ordens" replace />} />
            <Route path="metricas" element={<Metricas />} />
            <Route path="importar" element={<Importar />} />
            <Route path="exportar" element={<Exportar />} />
          </Route>

          <Route path="/pareceres" element={<PareceresLayout />}>
            <Route index element={<Consultar />} />
            <Route path="cadastrar" element={<Cadastrar />} />
            <Route path="base" element={<Base />} />
            <Route path="marcas-sugeridas" element={<MarcasSugeridas />} />
            <Route path="dashboard" element={<DashboardPareceres />} />
          </Route>

          <Route path="/contratos" element={<ContratosLayout />}>
            <Route index element={<TabelaMestre />} />
          </Route>

          <Route path="/opmes" element={<OpmesLayout />}>
            <Route index element={<Calendario />} />
            <Route path="gestao" element={<Gestao />} />
          </Route>


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
