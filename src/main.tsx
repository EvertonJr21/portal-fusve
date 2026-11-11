import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './components/AuthProvider.tsx'
import { HospitalProvider } from './components/HospitalProvider.tsx'
import { ConfirmProvider } from './components/ui/ConfirmDialog.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { useAuth } from './hooks/useAuth.ts'
import { aplicarTema } from './hooks/useTema.ts'
import './index.css'
import { queryClient } from './lib/queryClient.ts'
import { registrarErro } from './repositories/erroRepository.ts'
import DefinirSenha from './pages/DefinirSenha.tsx'
import Login from './pages/Login.tsx'

/** Link de convite/recuperação de senha do Supabase — vem no hash (`#...type=invite`) ou na query (`?...type=invite`), dependendo do flow. */
function isLinkDeConviteOuRecuperacao(): boolean {
  return (
    /type=invite|type=recovery/.test(window.location.hash) ||
    /type=invite|type=recovery/.test(window.location.search)
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 text-sm text-slate-400">
        Carregando...
      </div>
    )
  }

  if (isLinkDeConviteOuRecuperacao()) return <DefinirSenha />

  if (!session) return <Login />

  return <>{children}</>
}

aplicarTema()

// Erros fora do React (promessa rejeitada, script) também vão pro registro.
window.addEventListener('error', (e) => void registrarErro(e.message, e.error?.stack ?? `${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  void registrarErro(r?.message ? String(r.message) : String(r), r?.stack ?? '')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AuthGate>
              <HospitalProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </HospitalProvider>
            </AuthGate>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
