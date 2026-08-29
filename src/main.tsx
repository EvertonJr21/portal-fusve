import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './components/AuthProvider.tsx'
import { HospitalProvider } from './components/HospitalProvider.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { useAuth } from './hooks/useAuth.ts'
import './index.css'
import { queryClient } from './lib/queryClient.ts'
import Login from './pages/Login.tsx'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 text-sm text-slate-400">
        Carregando...
      </div>
    )
  }

  if (!session) return <Login />

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AuthGate>
            <HospitalProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </HospitalProvider>
          </AuthGate>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
