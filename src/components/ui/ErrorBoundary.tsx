import { Component, type ErrorInfo, type ReactNode } from 'react'
import { registrarErro } from '@/repositories/erroRepository'

interface Props {
  children: ReactNode
  /** Muda quando a rota muda — sair da tela com erro limpa o erro. */
  chave?: string
}

interface State {
  erro: Error | null
  chave?: string
}

/**
 * Rede de segurança: se uma tela quebrar, mostra uma mensagem com "recarregar"
 * em vez de deixar a página em branco, e registra o erro (`erros_app`).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null, chave: this.props.chave }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Saiu da tela com erro → limpa o erro.
    return props.chave !== state.chave ? { chave: props.chave, erro: null } : null
  }

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    void registrarErro(erro.message || String(erro), `${erro.stack ?? ''}\n${info.componentStack ?? ''}`)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Algo deu errado nesta tela</h2>
        <p className="text-sm text-slate-500">
          O erro foi registrado. Recarregue a página; se continuar, avise o administrador com a mensagem abaixo.
        </p>
        <pre className="max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-status-red">
          {this.state.erro.message}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Recarregar
          </button>
          <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ir para o início
          </a>
        </div>
      </div>
    )
  }
}
