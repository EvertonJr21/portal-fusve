import { useState } from 'react'
import { AuthInput, AuthShell, IconLock, IconMail } from '@/components/ui/AuthShell'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

type Modo = 'entrar' | 'cadastrar'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
  const [confirmeEmail, setConfirmeEmail] = useState(false)

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setResetEnviado(false)
    setConfirmeEmail(false)
    setPassword('')
    setConfirmarSenha('')
  }

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await signIn(email, password)
    setEnviando(false)
    if (error) setErro('E-mail ou senha inválidos.')
  }

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (password.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    setEnviando(true)
    const { error, precisaConfirmarEmail } = await signUp(email, password)
    setEnviando(false)
    if (error) {
      setErro(error)
      return
    }
    if (precisaConfirmarEmail) {
      setConfirmeEmail(true)
      return
    }
    // Sem confirmação por e-mail exigida — signUp já deixa a sessão ativa,
    // o AuthGate em main.tsx troca pra tela do app sozinho.
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
    <AuthShell>
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => trocarModo('entrar')}
          className={`flex-1 rounded-md py-1.5 transition-colors ${modo === 'entrar' ? 'bg-white text-slate-800 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => trocarModo('cadastrar')}
          className={`flex-1 rounded-md py-1.5 transition-colors ${modo === 'cadastrar' ? 'bg-white text-slate-800 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Criar conta
        </button>
      </div>

      {modo === 'entrar' ? (
        <>
          <h1 className="mb-1 text-lg font-semibold text-slate-800">Entrar</h1>
          <p className="mb-6 text-sm text-slate-500">Setor de Compras — use seu e-mail e senha</p>

          <form onSubmit={handleEntrar} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="email">
                E-mail
              </label>
              <AuthInput
                id="email"
                type="email"
                autoComplete="email"
                required
                icon={<IconMail />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="password">
                Senha
              </label>
              <AuthInput
                id="password"
                type="password"
                autoComplete="current-password"
                required
                icon={<IconLock />}
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

            <Button type="submit" loading={enviando} className="mt-2 w-full">
              Entrar
            </Button>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={enviando}
              className="mt-1 self-center text-xs text-slate-500 hover:text-slate-700 hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-lg font-semibold text-slate-800">Criar conta</h1>
          <p className="mb-6 text-sm text-slate-500">
            Sua conta nasce com todos os módulos liberados — cada um só vê o que ele mesmo cadastrar.
          </p>

          {confirmeEmail ? (
            <p className="text-sm text-status-green">
              Quase lá! Enviamos um link de confirmação pro seu e-mail — clique nele pra ativar a conta.
            </p>
          ) : (
            <form onSubmit={handleCadastrar} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cad-email">
                  E-mail
                </label>
                <AuthInput
                  id="cad-email"
                  type="email"
                  autoComplete="email"
                  required
                  icon={<IconMail />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cad-password">
                  Senha
                </label>
                <AuthInput
                  id="cad-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  icon={<IconLock />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cad-confirmar">
                  Confirmar senha
                </label>
                <AuthInput
                  id="cad-confirmar"
                  type="password"
                  autoComplete="new-password"
                  required
                  icon={<IconLock />}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>

              {erro && <p className="text-sm text-status-red">{erro}</p>}

              <Button type="submit" loading={enviando} className="mt-2 w-full">
                Criar conta
              </Button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  )
}
