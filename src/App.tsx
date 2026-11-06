import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { BuscaGlobal } from '@/components/ocs/BuscaGlobal'
import { HistoricoConsultasProvider } from '@/components/pareceres/HistoricoConsultasProvider'
import { ModuloGuard } from '@/components/ui/ModuloGuard'
import { PageTransition } from '@/components/ui/PageTransition'
import { Sidebar, type NavGroup, type NavItem } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import Admin from '@/pages/Admin'
import Exportar from '@/pages/ocs/Exportar'
import FichaFornecedor from '@/pages/ocs/FichaFornecedor'
import Fornecedores from '@/pages/ocs/Fornecedores'
import Importar from '@/pages/ocs/Importar'
import Metricas from '@/pages/ocs/Metricas'
import OrdensDeCompra from '@/pages/ocs/OrdensDeCompra'
import RankingFornecedores from '@/pages/ocs/RankingFornecedores'
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

// Agrupado por seção funcional. Enxugado de 12 pra 8 itens no item 82: Central de
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
      </div>
    </div>
  )
}
