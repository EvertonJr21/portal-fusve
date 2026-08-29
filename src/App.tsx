import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Sidebar, type NavItem } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import Dashboard from '@/pages/ocs/Dashboard'
import OrdensDeCompra from '@/pages/ocs/OrdensDeCompra'
import Modulos from '@/pages/Modulos'
import Consultar from '@/pages/pareceres/Consultar'
import TabelaMestre from '@/pages/contratos/TabelaMestre'

const OCS_ITEMS: NavItem[] = [
  { to: '/ocs', label: 'Central de Pendências', end: true },
  { to: '/ocs/ordens', label: 'Ordens de Compra' },
]
const OCS_EM_BREVE = [
  { title: 'Fornecedores', items: ['Por Fornecedor', 'Cadastro'] },
  { title: 'Análise', items: ['Solicitações', 'Resumo Diário', 'Métricas'] },
  { title: 'Sistema', items: ['Importar PDF', 'Backup'] },
]

function OCsLayout() {
  return (
    <div className="flex flex-1">
      <Sidebar title="Controle de OCs" items={OCS_ITEMS} emBreve={OCS_EM_BREVE} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

const PARECERES_ITEMS: NavItem[] = [{ to: '/pareceres', label: 'Consultar', end: true }]

function PareceresLayout() {
  return (
    <div className="flex flex-1">
      <Sidebar title="Parecer Técnico" items={PARECERES_ITEMS} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

const CONTRATOS_ITEMS: NavItem[] = [{ to: '/contratos', label: 'Tabela Mestre', end: true }]

function ContratosLayout() {
  return (
    <div className="flex flex-1">
      <Sidebar title="Gestão de Contratos" items={CONTRATOS_ITEMS} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
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
          <Route path="/" element={<Modulos />} />

          <Route path="/ocs" element={<OCsLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ordens" element={<OrdensDeCompra />} />
          </Route>

          <Route path="/pareceres" element={<PareceresLayout />}>
            <Route index element={<Consultar />} />
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
