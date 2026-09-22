import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { BuscaGlobal } from '@/components/ocs/BuscaGlobal'
import { HistoricoConsultasProvider } from '@/components/pareceres/HistoricoConsultasProvider'
import { ModuloGuard } from '@/components/ui/ModuloGuard'
import { PageTransition } from '@/components/ui/PageTransition'
import { Sidebar, type NavGroup, type NavItem } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import Admin from '@/pages/Admin'
import AnaliseCausas from '@/pages/ocs/AnaliseCausas'
import DashboardExecutivo from '@/pages/ocs/DashboardExecutivo'
import DashboardOCs from '@/pages/ocs/Dashboard'
import Exportar from '@/pages/ocs/Exportar'
import FichaFornecedor from '@/pages/ocs/FichaFornecedor'
import Fornecedores from '@/pages/ocs/Fornecedores'
import Importar from '@/pages/ocs/Importar'
import Metricas from '@/pages/ocs/Metricas'
import OrdensDeCompra from '@/pages/ocs/OrdensDeCompra'
import PorFornecedor from '@/pages/ocs/PorFornecedor'
import RankingFornecedores from '@/pages/ocs/RankingFornecedores'
import SLA from '@/pages/ocs/SLA'
import Solicitacoes from '@/pages/ocs/Solicitacoes'
import Modulos from '@/pages/Modulos'
import Calendario from '@/pages/opmes/Calendario'
import Gestao from '@/pages/opmes/Gestao'
import Cadastrar from '@/pages/pareceres/Cadastrar'
import Base from '@/pages/pareceres/Base'
import Consultar from '@/pages/pareceres/Consultar'
import DashboardPareceres from '@/pages/pareceres/Dashboard'
import MarcasSugeridas from '@/pages/pareceres/MarcasSugeridas'
import TabelaMestre from '@/pages/contratos/TabelaMestre'

// Agrupado por seção funcional — 12 itens numa lista linear só era o menu mais
// carregado do sistema, sem nenhuma hierarquia (auditoria de UX, 18/09/2026).
const OCS_GROUPS: NavGroup[] = [
  {
    title: 'Operação',
    items: [
      { to: '/ocs', label: 'Central de Pendências', end: true },
      { to: '/ocs/executivo', label: 'Dashboard Executivo' },
      { to: '/ocs/ordens', label: 'Ordens de Compra' },
      { to: '/ocs/solicitacoes', label: 'Solicitações' },
    ],
  },
  {
    title: 'Fornecedores',
    items: [
      { to: '/ocs/fornecedores', label: 'Por Fornecedor' },
      { to: '/ocs/ranking', label: 'Ranking de Fornecedores' },
      { to: '/ocs/cadastro-fornecedores', label: 'Cadastro de Fornecedores' },
    ],
  },
  {
    title: 'Análise',
    items: [
      { to: '/ocs/sla', label: 'SLA' },
      { to: '/ocs/causas', label: 'Análise de Causas' },
      { to: '/ocs/metricas', label: 'Métricas' },
    ],
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
      <div className="flex flex-1">
        <Sidebar title="Controle de OCs" groups={OCS_GROUPS} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <BuscaGlobal />
          </div>
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
        <div className="flex flex-1">
          <Sidebar title="Parecer Técnico" items={PARECERES_ITEMS} />
          <main className="flex-1 overflow-y-auto p-6">
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
      <div className="flex flex-1">
        <Sidebar title="Gestão de Contratos" items={CONTRATOS_ITEMS} />
        <main className="flex-1 overflow-y-auto p-6">
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
      <div className="flex flex-1">
        <Sidebar title="Controle de OPME" items={OPMES_ITEMS} />
        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </ModuloGuard>
  )
}

export default function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <div className="flex flex-1">
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
            <Route index element={<DashboardOCs />} />
            <Route path="executivo" element={<DashboardExecutivo />} />
            <Route path="ordens" element={<OrdensDeCompra />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="fornecedores" element={<PorFornecedor />} />
            <Route path="ranking" element={<RankingFornecedores />} />
            <Route path="ranking/:fornecedorId" element={<FichaFornecedor />} />
            <Route path="cadastro-fornecedores" element={<Fornecedores />} />
            <Route path="sla" element={<SLA />} />
            <Route path="causas" element={<AnaliseCausas />} />
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
      </div>
    </div>
  )
}
