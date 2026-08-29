import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/** Fade sutil no conteúdo ao trocar de rota. */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  )
}
