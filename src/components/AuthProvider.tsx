import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        return { error: error?.message ?? null }
      },
      setPassword: async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password })
        return { error: error?.message ?? null }
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
