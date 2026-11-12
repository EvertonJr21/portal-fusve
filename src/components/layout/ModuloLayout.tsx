import { Outlet } from 'react-router-dom'
import { ModuloGuard } from '@/components/ui/ModuloGuard'
import { PageTransition } from '@/components/ui/PageTransition'
import { AbasModulo, MenuModulo } from './MenuModulo'
import { TopoPagina } from './TopoPagina'
import type { ModuloNav } from './navegacao'

/** Casco de um módulo (item 101): menu do módulo + topo + a página. */
export function ModuloLayout({ modulo }: { modulo: ModuloNav }) {
  return (
    <ModuloGuard modulo={modulo.chave}>
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <MenuModulo modulo={modulo} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopoPagina comHospital={modulo.porHospital} />
          <AbasModulo modulo={modulo} />
          <main className="min-w-0 flex-1 p-3 pb-24 md:p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
    </ModuloGuard>
  )
}
