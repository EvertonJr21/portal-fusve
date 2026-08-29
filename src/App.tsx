import { Navigate, Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import Dashboard from '@/pages/ocs/Dashboard'
import OrdensDeCompra from '@/pages/ocs/OrdensDeCompra'
import Consultar from '@/pages/pareceres/Consultar'
import TabelaMestre from '@/pages/contratos/TabelaMestre'

export default function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/ocs" replace />} />
            <Route path="/ocs" element={<Dashboard />} />
            <Route path="/ocs/ordens" element={<OrdensDeCompra />} />
            <Route path="/pareceres" element={<Consultar />} />
            <Route path="/contratos" element={<TabelaMestre />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
