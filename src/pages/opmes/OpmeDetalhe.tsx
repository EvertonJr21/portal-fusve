import { AlertTriangle, ArrowLeft, CalendarDays, Check, Clock, FileSignature, Mail, MessageCircle, Pencil, RotateCcw, Trash2, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OpmeForm } from '@/components/opmes/OpmeForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Destaque, Secao } from '@/components/ui/Detalhe'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HOSPITAIS } from '@/constants'
import { useContratos } from '@/hooks/useContratos'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useAlternarStatusOpme, useExcluirOpme, useOpmes } from '@/hooks/useOpmes'
import { useToast } from '@/hooks/useToast'
import type { Opme } from '@/types'
import { linkOutlookCompose, linkWhatsApp } from '@/utils/cobranca'
import { getHoje } from '@/utils/date'
import { ligarContratosFornecedores } from '@/utils/kpis'
import { diasAteCirurgia, mensagemConfirmacaoOpme, rotuloPrazoCirurgia, STATUS_OPME_LABEL, STATUS_OPME_TONE } from '@/utils/opme'

const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function dataDe(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}
function curta(iso: string) {
  return dataDe(iso).toLocaleDateString('pt-BR')
}
function longa(iso: string) {
  const t = DATA_LONGA.format(dataDe(iso))
  return t.charAt(0).toUpperCase() + t.slice(1)
}
function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

/** Lista curta de outras cirurgias (mesmo paciente ou mesmo fornecedor), cada uma abrindo a sua página. */
function ListaCirurgias({ itens, nomeFornecedor, mostrar }: { itens: Opme[]; nomeFornecedor: (id: number | null) => string; mostrar: 'fornecedor' | 'paciente' }) {
  if (itens.length === 0) return <p className="text-xs text-slate-400">Nenhuma.</p>
  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {itens.map((o) => (
        <li key={o.id}>
          <Link to={`/opmes/${o.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-blue-700">
            <span className="min-w-0">
              <span className="font-medium text-slate-800">{curta(o.dataCirurgia)}</span>
              <span className="ml-2 truncate text-xs text-slate-500">{mostrar === 'paciente' ? o.paciente : nomeFornecedor(o.fornecedorId)}</span>
            </span>
            <Badge tone={STATUS_OPME_TONE[o.status]}>{STATUS_OPME_LABEL[o.status]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Página do OPME (item 103) — mesmo formato da página do contrato: cabeçalho com
 * ações, números-chave, aviso quando a cirurgia está perto ou já passou com o
 * OPME pendente, fornecedor com atalhos pra confirmar a entrega, e as outras
 * cirurgias do paciente e do fornecedor.
 */
export default function OpmeDetalhe() {
  const { opmeId = '' } = useParams<{ opmeId: string }>()
  const navigate = useNavigate()
  const { hospitalId } = useHospital()
  const { data: opmes = [], isLoading, isFetching, error } = useOpmes(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const { data: contratos = [] } = useContratos(hospitalId)
  const alternar = useAlternarStatusOpme(hospitalId)
  const excluir = useExcluirOpme(hospitalId)
  const desfazer = useDesfazer()
  const toast = useToast()
  const [editando, setEditando] = useState(false)

  const opme = opmes.find((o) => o.id === opmeId) ?? null
  const forn = opme?.fornecedorId ? (forns.find((f) => f.id === opme.fornecedorId) ?? null) : null
  const nomeFornecedor = (id: number | null) => (id ? (forns.find((f) => f.id === id)?.nome ?? `Fornecedor ${id}`) : 'Sem fornecedor')

  const relacionados = useMemo(() => {
    if (!opme) return { doPaciente: [], doFornecedor: [] }
    const nome = semAcento(opme.paciente)
    const outros = opmes.filter((o) => o.id !== opme.id)
    const hoje = getHoje()
    return {
      doPaciente: outros.filter((o) => semAcento(o.paciente) === nome),
      // Pendentes do mesmo fornecedor daqui pra frente — dá pra confirmar tudo numa conversa só.
      doFornecedor: opme.fornecedorId
        ? outros.filter((o) => o.fornecedorId === opme.fornecedorId && o.status === 'pendente' && (diasAteCirurgia(o.dataCirurgia, hoje) ?? -1) >= 0).slice(0, 8)
        : [],
    }
  }, [opme, opmes])

  const contratosDoForn = useMemo(() => {
    if (!opme?.fornecedorId) return []
    const { fornecedorDoContrato } = ligarContratosFornecedores(contratos, forns)
    return contratos.filter((c) => fornecedorDoContrato.get(c.id) === opme.fornecedorId)
  }, [opme, contratos, forns])

  if (isLoading || (!opme && isFetching)) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar o OPME: {error.message}</p>
  if (!opme) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-slate-600">
          OPME não encontrado no {HOSPITAIS[hospitalId].sigla}. Ele pode ser do outro hospital ou ter sido excluído.
        </p>
        <Link to="/opmes/gestao" className="text-sm font-medium text-blue-700 hover:underline">
          ← Voltar para a gestão
        </Link>
      </div>
    )
  }

  const o = opme
  const dias = diasAteCirurgia(o.dataCirurgia, getHoje())
  const pendente = o.status === 'pendente'
  const atrasado = pendente && dias !== null && dias < 0
  const urgente = pendente && dias !== null && dias >= 0 && dias <= 1
  const hospital = HOSPITAIS[o.hospitalId]
  const mensagem = mensagemConfirmacaoOpme(o, hospital.nomeCompleto)
  const assunto = `Confirmação de entrega OPME — cirurgia ${curta(o.dataCirurgia)}`

  const handleStatus = async () => {
    const novo = pendente ? 'finalizado' : 'pendente'
    try {
      await alternar.mutateAsync({ id: o.id, status: novo })
      toast.show(novo === 'finalizado' ? 'OPME marcado como finalizado' : 'OPME voltou para pendente')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao atualizar status', 'error')
    }
  }

  const handleExcluir = async () => {
    try {
      await excluir.mutateAsync(o.id)
      desfazer(`OPME de ${o.paciente} excluído`, 'opmes', o.id, ['opmes', hospitalId])
      navigate('/opmes/gestao')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OPME', 'error')
    }
  }

  const copiarMensagem = async () => {
    try {
      await navigator.clipboard.writeText(mensagem)
      toast.show('Mensagem copiada')
    } catch {
      toast.show('Não foi possível copiar a mensagem', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/opmes/gestao" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Gestão de OPME
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{o.paciente}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone={STATUS_OPME_TONE[o.status]}>{STATUS_OPME_LABEL[o.status]}</Badge>
              <span>Cirurgia {longa(o.dataCirurgia).toLowerCase()}</span>
              <span className="text-slate-300">·</span>
              <span>{hospital.sigla}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExcluir}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button onClick={handleStatus} loading={alternar.isPending}>
              {pendente ? (
                <>
                  <Check className="h-4 w-4" /> Marcar como finalizado
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" /> Voltar para pendente
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {(atrasado || urgente) && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
            atrasado ? 'border-status-red/30 bg-status-red-bg text-status-red' : 'border-status-amber/30 bg-status-amber-bg text-status-amber'
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {atrasado
              ? `A cirurgia foi ${rotuloPrazoCirurgia(dias).toLowerCase()} e o OPME continua pendente. Se já foi entregue, marque como finalizado.`
              : `Cirurgia ${dias === 0 ? 'hoje' : 'amanhã'} e o OPME ainda está pendente — confirme a entrega com o fornecedor.`}
          </span>
        </div>
      )}

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque icone={<CalendarDays className="h-4 w-4" />} rotulo="Data da cirurgia" valor={curta(o.dataCirurgia)} detalhe={longa(o.dataCirurgia).split(',')[0]} />
        <Destaque icone={<Clock className="h-4 w-4" />} rotulo="Prazo" valor={rotuloPrazoCirurgia(dias)} detalhe={pendente ? 'OPME pendente' : 'OPME finalizado'} />
        <Destaque
          icone={<User className="h-4 w-4" />}
          rotulo="Fornecedor"
          valor={forn ? forn.nome : o.fornecedorId ? `Fornecedor ${o.fornecedorId}` : 'Não definido'}
          detalhe={forn?.cnpj ?? undefined}
        />
        <Destaque
          icone={<FileSignature className="h-4 w-4" />}
          rotulo="Contrato com o fornecedor"
          valor={contratosDoForn.length ? contratosDoForn[0].titulo || contratosDoForn[0].fornecedorNome : 'Nenhum'}
          detalhe={contratosDoForn.length ? contratosDoForn[0].status : 'compra avulsa'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao titulo="Observação" acao={<button type="button" onClick={() => setEditando(true)} className="text-xs font-medium text-blue-700 hover:underline">Editar</button>}>
            {o.observacao ? (
              <p className="whitespace-pre-line text-sm text-slate-700">{o.observacao}</p>
            ) : (
              <p className="text-xs text-slate-400">Sem observação (material, quantidade, nº da OC, contato do centro cirúrgico…).</p>
            )}
          </Secao>
          <Secao titulo={`Outras cirurgias deste paciente (${relacionados.doPaciente.length})`}>
            <ListaCirurgias itens={relacionados.doPaciente} nomeFornecedor={nomeFornecedor} mostrar="fornecedor" />
          </Secao>
          {o.fornecedorId && (
            <Secao titulo={`Próximas pendentes com este fornecedor (${relacionados.doFornecedor.length})`}>
              <ListaCirurgias itens={relacionados.doFornecedor} nomeFornecedor={nomeFornecedor} mostrar="paciente" />
            </Secao>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Confirmar entrega com o fornecedor">
            {!forn ? (
              <p className="text-xs text-slate-400">
                {o.fornecedorId ? 'Fornecedor não encontrado no cadastro.' : 'Nenhum fornecedor definido.'}{' '}
                <button type="button" onClick={() => setEditando(true)} className="font-medium text-blue-700 hover:underline">
                  Definir
                </button>
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{forn.nome}</div>
                  {forn.cnpj && <div className="font-mono text-xs text-slate-500">{forn.cnpj}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {forn.email && (
                    <a
                      href={linkOutlookCompose(forn.email, assunto)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void copiarMensagem()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </a>
                  )}
                  {forn.wpp && (
                    <a
                      href={linkWhatsApp(forn.wpp, mensagem)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void copiarMensagem()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Copiar mensagem
                  </button>
                </div>
                {!forn.email && !forn.wpp && (
                  <p className="text-xs text-slate-400">
                    Sem e-mail ou WhatsApp no cadastro.{' '}
                    <Link to="/ocs/cadastro-fornecedores" className="font-medium text-blue-700 hover:underline">
                      Cadastrar contato
                    </Link>
                  </p>
                )}
                {forn.email && <p className="text-[11px] text-slate-400">No e-mail, a mensagem já vai copiada — é só colar.</p>}
                <Link to={`/ocs/ranking/${forn.id}`} className="text-xs font-medium text-blue-700 hover:underline">
                  Ver ficha do fornecedor →
                </Link>
                {contratosDoForn.map((c) => (
                  <Link key={c.id} to={`/contratos/${c.id}`} className="text-xs font-medium text-blue-700 hover:underline">
                    Contrato: {c.titulo || c.fornecedorNome} →
                  </Link>
                ))}
              </div>
            )}
          </Secao>
          <Secao titulo="Registro">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Cadastrado em</dt>
                <dd className="text-slate-800">{o.criadoEm ? DATA_HORA.format(new Date(o.criadoEm)) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Última alteração</dt>
                <dd className="text-slate-800">{o.atualizadoEm ? DATA_HORA.format(new Date(o.atualizadoEm)) : '—'}</dd>
              </div>
            </dl>
          </Secao>
        </aside>
      </div>

      {editando && <OpmeForm opme={o} hospitalIdPadrao={hospitalId} onClose={() => setEditando(false)} />}
    </div>
  )
}
