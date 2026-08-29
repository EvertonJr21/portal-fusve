import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { HistoricoConsultasProvider } from '@/components/pareceres/HistoricoConsultasProvider'
import { PageTransition } from '@/components/ui/PageTransition'
import { Sidebar, type NavItem } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import AnaliseCausas from '@/pages/ocs/AnaliseCausas'
import DashboardExecutivo from '@/pages/ocs/DashboardExecutivo'
import DashboardOCs from '@/pages/ocs/Dashboard'
import FichaFornecedor from '@/pages/ocs/FichaFornecedor'
import Fornecedores from '@/pages/ocs/Fornecedores'
import Importar from '@/pages/ocs/Importar'
import Metricas from '@/pages/ocs/Metricas'
import OrdensDeCompra from '@/pages/ocs/OrdensDeCompra'
import PorFornecedor from '@/pages/ocs/PorFornecedor'
import RankingFornecedores from '@/pages/ocs/RankingFornecedores'
import Resumo from '@/pages/ocs/Resumo'
import SLA from '@/pages/ocs/SLA'
import Solicitacoes from '@/pages/ocs/Solicitacoes'
import Modulos from '@/pages/Modulos'
import Bionexo from '@/pages/pareceres/Bionexo'
import Cadastrar from '@/pages/pareceres/Cadastrar'
import Base from '@/pages/pareceres/Base'
import Consultar from '@/pages/pareceres/Consultar'
import DashboardPareceres from '@/pages/pareceres/Dashboard'
import TabelaMestre from '@/pages/contratos/TabelaMestre'

const OCS_ITEMS: NavItem[] = [
  { to: '/ocs', label: 'Central de Pendências', end: true },
  { to: '/ocs/executivo', label: 'Dashboard Executivo' },
  { to: '/ocs/ordens', label: 'Ordens de Compra' },
  { to: '/ocs/solicitacoes', label: 'Solicitações' },
  { to: '/ocs/resumo', label: 'Resumo Diário' },
  { to: '/ocs/fornecedores', label: 'Por Fornecedor' },
  { to: '/ocs/ranking', label: 'Ranking de Fornecedores' },
  { to: '/ocs/cadastro-fornecedores', label: 'Cadastro de Fornecedores' },
  { to: '/ocs/sla', label: 'SLA' },
  { to: '/ocs/causas', label: 'Análise de Causas' },
  { to: '/ocs/metricas', label: 'Métricas' },
  { to: '/ocs/importar', label: 'Importar' },
]

function OCsLayout() {
  return (
    <div className="flex flex-1">
      <Sidebar title="Controle de OCs" items={OCS_ITEMS} />
      <main className="flex-1 overflow-y-auto p-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}

const PARECERES_ITEMS: NavItem[] = [
  { to: '/pareceres', label: 'Consultar', end: true },
  { to: '/pareceres/cadastrar', label: 'Cadastrar' },
  { to: '/pareceres/base', label: 'Base de Pareceres' },
  { to: '/pareceres/bionexo', label: 'Bionexo' },
  { to: '/pareceres/dashboard', label: 'Dashboard' },
]

function PareceresLayout() {
  return (
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
  )
}

const CONTRATOS_ITEMS: NavItem[] = [{ to: '/contratos', label: 'Tabela Mestre', end: true }]

function ContratosLayout() {
  return (
    <div className="flex flex-1">
      <Sidebar title="Gestão de Contratos" items={CONTRATOS_ITEMS} />
      <main className="flex-1 overflow-y-auto p-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
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

          <Route path="/ocs" element={<OCsLayout />}>
            <Route index element={<DashboardOCs />} />
            <Route path="executivo" element={<DashboardExecutivo />} />
            <Route path="ordens" element={<OrdensDeCompra />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="resumo" element={<Resumo />} />
            <Route path="fornecedores" element={<PorFornecedor />} />
            <Route path="ranking" element={<RankingFornecedores />} />
            <Route path="ranking/:fornecedorId" element={<FichaFornecedor />} />
            <Route path="cadastro-fornecedores" element={<Fornecedores />} />
            <Route path="sla" element={<SLA />} />
            <Route path="causas" element={<AnaliseCausas />} />
            <Route path="metricas" element={<Metricas />} />
            <Route path="importar" element={<Importar />} />
          </Route>

          <Route path="/pareceres" element={<PareceresLayout />}>
            <Route index element={<Consultar />} />
            <Route path="cadastrar" element={<Cadastrar />} />
            <Route path="base" element={<Base />} />
            <Route path="bionexo" element={<Bionexo />} />
            <Route path="dashboard" element={<DashboardPareceres />} />
          </Route>

          <Route path="/contratos" element={<ContratosLayout />}>
            <Route index element={<TabelaMestre />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
