import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BarraModulos } from '@/components/layout/BarraModulos'
import { ModuloLayout } from '@/components/layout/ModuloLayout'
import { NAV_MODULOS } from '@/components/layout/navegacao'
import { TopoPagina } from '@/components/layout/TopoPagina'
import { HistoricoConsultasProvider } from '@/components/pareceres/HistoricoConsultasProvider'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PaletaComandos } from '@/components/ui/PaletaComandos'
import { PageTransition } from '@/components/ui/PageTransition'
import { SkeletonRows } from '@/components/ui/Skeleton'

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

const [NAV_OCS, NAV_PARECERES, NAV_CONTRATOS, NAV_OPMES] = (['ocs', 'pareceres', 'contratos', 'opmes'] as const).map(
  (chave) => NAV_MODULOS.find((m) => m.chave === chave)!,
)

function PareceresLayout() {
  return (
    <HistoricoConsultasProvider>
      <ModuloLayout modulo={NAV_PARECERES} />
    </HistoricoConsultasProvider>
  )
}

/** Telas fora dos módulos (início, admin): só o topo + a página. */
function TelaSolta({ titulo, children, topoNoComputador = true }: { titulo?: string; children: React.ReactNode; topoNoComputador?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={topoNoComputador ? '' : 'md:hidden'}>
        <TopoPagina titulo={titulo} />
      </div>
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh">
      <BarraModulos />
      <PaletaComandos />
      <div className="flex min-w-0 flex-1">
        <ErrorBoundary chave={pathname}>
        <Suspense fallback={<div className="flex-1 p-6"><SkeletonRows /></div>}>
        <Routes>
          <Route
            path="/"
            element={
              <TelaSolta topoNoComputador={false}>
                <Modulos />
              </TelaSolta>
            }
          />

          <Route path="/usuarios" element={<Navigate to="/admin" replace />} />

          <Route
            path="/admin"
            element={
              <TelaSolta titulo="Administração">
                <Admin />
              </TelaSolta>
            }
          />

          <Route path="/ocs" element={<ModuloLayout modulo={NAV_OCS} />}>
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

          <Route path="/contratos" element={<ModuloLayout modulo={NAV_CONTRATOS} />}>
            <Route index element={<TabelaMestre />} />
          </Route>

          <Route path="/opmes" element={<ModuloLayout modulo={NAV_OPMES} />}>
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
