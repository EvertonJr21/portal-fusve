import { ArrowLeft, ArrowRightLeft, Clock, Database, KeyRound, LayoutGrid, Pause, Play, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, NivelAcessoControle, SeloPapel, SeloStatus } from '@/components/admin/AdminUi'
import { ModalReatribuir, ModalResetarSenha } from '@/components/admin/ModaisUsuario'
import { useAuditoria, useContasAuth } from '@/hooks/useAdmin'
import { detalheAuditoria, ROTULO_ACAO, STATUS_CONTA, statusConta, tempoRelativo } from '@/utils/admin'
import { dataHora } from '@/utils/historico'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, NaoEncontrado, Secao } from '@/components/ui/Detalhe'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { MODULOS } from '@/constants'
import { useAcoesUsuario } from '@/hooks/useAcoesUsuario'
import { useMeuPerfil, useRegistrosDoUsuario, useTodasPermissoes, useTodosPerfis } from '@/hooks/usePermissoes'
import type { RegistrosDoUsuario } from '@/repositories/permissaoRepository'
import { fmt } from '@/utils/date'

const REGISTROS: { chave: keyof RegistrosDoUsuario; rotulo: string }[] = [
  { chave: 'ocs', rotulo: 'Ordens de compra' },
  { chave: 'sols', rotulo: 'Solicitações' },
  { chave: 'pareceres', rotulo: 'Pareceres' },
  { chave: 'contratos', rotulo: 'Contratos' },
  { chave: 'opmes', rotulo: 'OPMEs' },
]

/**
 * Página do usuário (item 107) — dentro da Administração: papel, permissões
 * por módulo, quantos registros a conta tem e as ações (senha, transferir
 * registros, suspender, excluir) que antes eram só ícones na linha da tabela.
 */
export default function UsuarioDetalhe() {
  const { userId = '' } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { data: meuPerfil } = useMeuPerfil()
  const { data: contas } = useContasAuth()
  const { data: historico = [], error: erroHistorico } = useAuditoria(userId)
  const { data: perfis = [], isLoading, error } = useTodosPerfis()
  const { isLoading: carregandoPermissoes } = useTodasPermissoes()
  const { data: registros, isLoading: carregandoRegistros, error: erroRegistros } = useRegistrosDoUsuario(userId)
  const acoes = useAcoesUsuario()
  const [modal, setModal] = useState<null | 'senha' | 'transferir'>(null)

  if (isLoading || carregandoPermissoes) return <SkeletonRows />
  if (error) return <p className="p-6 text-sm text-status-red">Erro ao carregar usuários: {error.message}</p>

  const u = perfis.find((p) => p.id === userId)
  if (!u) {
    return (
      <NaoEncontrado texto="Conta não encontrada. Ela pode ter sido excluída." voltarPara="/admin/usuarios" voltarRotulo="Voltar para Usuários" />
    )
  }

  const souEu = u.id === meuPerfil?.id
  const auth = contas?.find((c) => c.id === u.id)
  const status = statusConta(u, auth)
  const isAdmin = u.role === 'admin'
  const total = registros ? Object.values(registros).reduce((a, b) => a + b, 0) : null
  const liberados = isAdmin ? MODULOS.length : MODULOS.filter((m) => acoes.permissaoDe(u.id, m.chave)?.podeVer).length

  const handleExcluir = async () => {
    if (await acoes.excluir(u.id, u.email)) navigate('/admin/usuarios')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/admin/usuarios" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Usuários
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar email={u.email} tamanho="lg" />
            <div className="min-w-0">
              <h1 className="break-all text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{u.email}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <SeloPapel admin={isAdmin} />
                <SeloStatus status={status} />
                {souEu && <span className="text-slate-400">esta é a sua conta</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setModal('senha')}>
              <KeyRound className="h-4 w-4" /> Redefinir senha
            </Button>
            <Button variant="outline" onClick={() => setModal('transferir')}>
              <ArrowRightLeft className="h-4 w-4" /> Transferir registros
            </Button>
            <Button
              variant="outline"
              disabled={souEu}
              title={souEu ? 'Não é possível suspender a própria conta' : undefined}
              onClick={() => void acoes.alternarSuspensao(u.id, u.email, u.suspensa)}
            >
              {u.suspensa ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {u.suspensa ? 'Reativar' : 'Suspender'}
            </Button>
            <Button variant="outline" disabled={souEu} title={souEu ? 'Não é possível excluir a própria conta' : undefined} onClick={handleExcluir}>
              <Trash2 className="h-4 w-4" /> Excluir conta
            </Button>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque icone={<Shield className="h-4 w-4" />} rotulo="Papel" valor={isAdmin ? 'Admin' : 'Usuário'} detalhe={isAdmin ? 'vê e edita tudo' : 'só os próprios registros'} />
        <Destaque
          icone={<Clock className="h-4 w-4" />}
          rotulo="Último acesso"
          valor={auth ? tempoRelativo(auth.ultimoAcesso) : '—'}
          detalhe={auth?.ultimoAcesso ? dataHora(auth.ultimoAcesso) : u.criadoEm ? `conta criada em ${fmt(new Date(u.criadoEm))}` : undefined}
        />
        <Destaque icone={<LayoutGrid className="h-4 w-4" />} rotulo="Módulos liberados" valor={`${liberados} de ${MODULOS.length}`} detalhe={u.suspensa ? 'conta suspensa — sem acesso' : undefined} />
        <Destaque
          icone={<Database className="h-4 w-4" />}
          rotulo="Registros da conta"
          valor={carregandoRegistros ? '…' : total === null ? '' : total.toLocaleString('pt-BR')}
          detalhe={total ? 'transferir antes de excluir' : total === 0 ? 'pode ser excluída' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao
            titulo="Permissões por módulo"
            acao={
              <button
                type="button"
                disabled={souEu}
                title={souEu ? 'Não é possível alterar o próprio papel' : undefined}
                onClick={() => void acoes.alternarRole(u.id, u.role)}
                className="text-xs font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                {isAdmin ? 'Remover admin' : 'Tornar admin'}
              </button>
            }
          >
            {isAdmin ? (
              <p className="text-sm text-slate-500">Admin vê e edita os dados de todos os usuários em todos os módulos — não precisa de permissão por módulo.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {MODULOS.map((m) => (
                  <li key={m.chave} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span className="text-sm font-medium text-slate-800">{m.label}</span>
                    <NivelAcessoControle rotulo={m.label} valor={acoes.nivelDe(u.id, m.chave)} onChange={(n) => void acoes.definirNivel(u.id, m.chave, n)} />
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo="Registros da conta">
            {erroRegistros ? (
              <p className="text-xs text-status-red">Erro ao contar: {erroRegistros.message}</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {REGISTROS.map((r) => (
                    <Campo key={r.chave} rotulo={r.rotulo}>
                      {carregandoRegistros ? '…' : (registros?.[r.chave] ?? 0).toLocaleString('pt-BR')}
                    </Campo>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-400">
                  Inclui registros excluídos. Enquanto a conta tiver algum, ela não pode ser excluída — use "Transferir registros" para passá-los a outra pessoa.
                </p>
              </>
            )}
          </Secao>
          <Secao titulo="Histórico da conta">
            {erroHistorico ? (
              <p className="text-xs text-slate-500">Disponível depois de rodar a migration 202611170001 no Supabase.</p>
            ) : !historico.length ? (
              <p className="text-sm text-slate-500">Nenhuma ação registrada para esta conta.</p>
            ) : (
              <ol className="relative flex flex-col gap-3 border-l border-slate-200 pl-4">
                {historico.map((e) => (
                  <li key={e.id} className="relative">
                    <span aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-700" />
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{ROTULO_ACAO[e.acao] ?? e.acao}</span> · {detalheAuditoria(e.detalhe)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.acao === 'conta_criada' ? 'pela própria pessoa' : `por ${e.atorEmail || 'sistema'}`} · <time dateTime={e.em} title={dataHora(e.em)}>{tempoRelativo(e.em)}</time>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Secao>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Detalhes">
            <dl className="flex flex-col gap-3">
              <Campo rotulo="E-mail">{u.email}</Campo>
              <Campo rotulo="Nome">{u.nome}</Campo>
              <Campo rotulo="Situação">{status ? STATUS_CONTA[status].descricao : u.suspensa ? 'Suspensa' : 'Ativa'}</Campo>
              <Campo rotulo="Conta criada em">{u.criadoEm ? fmt(new Date(u.criadoEm)) : ''}</Campo>
              <Campo rotulo="E-mail confirmado">{auth ? (auth.emailConfirmado ? 'Sim' : 'Não') : ''}</Campo>
            </dl>
          </Secao>
          <Secao titulo="Afastamento ou saída">
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs text-slate-600">
              <li><strong>Afastamento:</strong> suspenda a conta. Nada é apagado e dá pra reativar.</li>
              <li><strong>Troca de setor:</strong> transfira os registros para quem assume.</li>
              <li><strong>Saída definitiva:</strong> transfira os registros e depois exclua a conta.</li>
            </ul>
          </Secao>
        </aside>
      </div>

      {modal === 'senha' && <ModalResetarSenha usuario={u} onClose={() => setModal(null)} />}
      {modal === 'transferir' && <ModalReatribuir usuario={u} outros={perfis.filter((o) => o.id !== u.id)} onClose={() => setModal(null)} />}
    </div>
  )
}
