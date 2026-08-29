import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'

export default function Usuarios() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

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
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password },
    })
    setEnviando(false)

    if (error || data?.error) {
      setErro(data?.error ?? 'Não foi possível criar o usuário.')
      return
    }

    toast.show(`Conta criada para ${email}`)
    setEmail('')
    setPassword('')
    setConfirmar('')
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft-lg">
        <Link to="/" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
          ← Voltar
        </Link>
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Criar usuário</h1>
        <p className="mb-6 text-sm text-slate-500">
          A conta é criada direto, sem envio de e-mail. Combine a senha com a pessoa por fora.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="off"
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
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {enviando ? 'Criando...' : 'Criar usuário'}
          </Button>
        </form>
      </div>
    </div>
  )
}
