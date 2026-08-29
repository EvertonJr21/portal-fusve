import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const TIMEOUT_MS = 6000

export default function DefinirSenha() {
  const { session, setPassword } = useAuth()
  const [aguardandoSessao, setAguardandoSessao] = useState(true)
  const [password, setPasswordValue] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (session) {
      setAguardandoSessao(false)
      return
    }
    const timeout = setTimeout(() => setAguardandoSessao(false), TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (password.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    setEnviando(true)
    const { error } = await setPassword(password)
    setEnviando(false)
    if (error) {
      setErro('Não foi possível definir a senha. Tente pedir um novo convite.')
      return
    }
    window.history.replaceState(null, '', window.location.pathname)
    setSucesso(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft-lg">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Portal FUSVE</h1>
        <p className="mb-6 text-sm text-slate-500">Defina a senha da sua conta</p>

        {sucesso ? (
          <p className="text-sm text-status-green">Senha definida com sucesso. Entrando...</p>
        ) : aguardandoSessao && !session ? (
          <p className="text-sm text-slate-400">Carregando convite...</p>
        ) : !session ? (
          <p className="text-sm text-status-red">
            Link de convite inválido ou expirado. Peça pra quem administra o sistema enviar um novo
            convite.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="password">
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="confirmar">
                Confirmar senha
              </label>
              <input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>

            {erro && <p className="text-sm text-status-red">{erro}</p>}

            <Button type="submit" disabled={enviando} className="mt-2">
              {enviando ? 'Salvando...' : 'Definir senha e entrar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
