import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthContextValue {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  /**
   * Cadastro público (22/09/2026) — exige "Allow new users to sign up" ligado
   * no Supabase Auth. `precisaConfirmarEmail` vem `true` quando "Confirm
   * email" também está ligado lá (o Supabase cria a conta mas não devolve
   * sessão até a pessoa clicar no link do e-mail) — a UI mostra um aviso em
   * vez de tentar entrar direto nesse caso.
   */
  signUp: (email: string, password: string) => Promise<{ error: string | null; precisaConfirmarEmail: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  setPassword: (password: string) => Promise<{ error: string | null }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
