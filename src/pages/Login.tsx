import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await signIn(email, password)
    setEnviando(false)
    if (error) setErro('E-mail ou senha inválidos.')
  }

  const handleResetPassword = async () => {
    if (!email) {
      setErro('Informe o e-mail pra receber o link de redefinição.')
      return
    }
    setErro(null)
    setEnviando(true)
    await resetPassword(email)
    setEnviando(false)
    setResetEnviado(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft-lg">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Portal FUSVE</h1>
        <p className="mb-6 text-sm text-slate-500">Setor de Compras — entre com seu e-mail e senha</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-status-red">{erro}</p>}
          {resetEnviado && !erro && (
            <p className="text-sm text-status-green">
              Se o e-mail existir, enviamos um link de redefinição de senha.
            </p>
          )}

          <Button type="submit" disabled={enviando} className="mt-2">
            {enviando ? 'Entrando...' : 'Entrar'}
          </Button>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={enviando}
            className="mt-1 text-xs text-slate-500 hover:text-slate-700 hover:underline"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}
