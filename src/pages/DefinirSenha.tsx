import { useEffect, useState } from 'react'
import { AuthInput, AuthShell, IconLock } from '@/components/ui/AuthShell'
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
    <AuthShell>
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Definir senha</h1>
      <p className="mb-6 text-sm text-slate-500">Escolha a senha da sua conta</p>

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
            <AuthInput
              id="password"
              type="password"
              autoComplete="new-password"
              required
              icon={<IconLock />}
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="confirmar">
              Confirmar senha
            </label>
            <AuthInput
              id="confirmar"
              type="password"
              autoComplete="new-password"
              required
              icon={<IconLock />}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-status-red">{erro}</p>}

          <Button type="submit" loading={enviando} className="mt-2 w-full">
            Definir senha e entrar
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
