import { NAV_MODULOS } from '@/components/layout/navegacao'
import type { ErroApp } from '@/repositories/erroRepository'
import type { AcaoAdmin, ContaAuth } from '@/repositories/adminRepository'
import type { Perfil, PermissaoDeUsuario } from '@/repositories/permissaoRepository'

/** Regras puras da Administração (item 113). */

export const DIAS_INATIVA = 30

export type StatusConta = 'ativa' | 'inativa' | 'nunca_entrou' | 'suspensa'

export const STATUS_CONTA: Record<StatusConta, { rotulo: string; tom: string; descricao: string }> = {
  ativa: { rotulo: 'Ativa', tom: 'bg-status-green-bg text-status-green', descricao: `Entrou nos últimos ${DIAS_INATIVA} dias` },
  inativa: { rotulo: 'Inativa', tom: 'bg-status-amber-bg text-status-amber', descricao: `Sem entrar há mais de ${DIAS_INATIVA} dias` },
  nunca_entrou: { rotulo: 'Nunca entrou', tom: 'bg-slate-100 text-slate-600', descricao: 'Conta criada, sem nenhum acesso' },
  suspensa: { rotulo: 'Suspensa', tom: 'bg-status-red-bg text-status-red', descricao: 'Login bloqueado pelo admin' },
}

export const ROTULO_ACAO: Record<AcaoAdmin, string> = {
  permissao: 'Permissão alterada',
  papel: 'Papel alterado',
  suspensao: 'Suspensão',
  senha: 'Senha redefinida',
  exclusao: 'Conta excluída',
  transferencia: 'Registros transferidos',
  conta_criada: 'Conta criada',
}

const DIA = 86_400_000

/** Status da conta. Sem a informação de acesso (migration não rodada), só distingue suspensa. */
export function statusConta(p: Perfil, auth: ContaAuth | undefined, agora: Date = new Date()): StatusConta | null {
  if (p.suspensa) return 'suspensa'
  if (!auth) return null
  if (!auth.ultimoAcesso) return 'nunca_entrou'
  const dias = (agora.getTime() - new Date(auth.ultimoAcesso).getTime()) / DIA
  return dias > DIAS_INATIVA ? 'inativa' : 'ativa'
}

/** "há 5 min", "há 3 h", "ontem", "há 12 dias", "há 2 meses". */
export function tempoRelativo(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return 'Nunca'
  const ms = agora.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const min = Math.floor(ms / 60_000)
  if (min < 2) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.floor(h / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

/** Módulos que a conta pode ver (admin vê todos). */
export function modulosLiberados(p: Perfil, permissoes: PermissaoDeUsuario[], total: number): number {
  if (p.role === 'admin') return total
  return permissoes.filter((x) => x.userId === p.id && x.podeVer).length
}

// ───────────── Erros ─────────────

export interface GrupoErro {
  chave: string
  mensagem: string
  /** Erro de arquivo de versão antiga do portal (resolve recarregando a página). */
  versaoAntiga: boolean
  ocorrencias: number
  usuarios: string[]
  telas: string[]
  primeira: string
  ultima: string
  ids: string[]
  detalhe: string
}

export const RE_VERSAO = /dynamically imported module|Importing a module script failed|error loading dynamically imported|Loading chunk .* failed/i

/** Agrupa erros iguais (ignorando o código de versão no nome dos arquivos), do mais recente ao mais antigo. */
export function agruparErros(erros: ErroApp[]): GrupoErro[] {
  const grupos = new Map<string, GrupoErro>()
  for (const e of erros) {
    const versaoAntiga = RE_VERSAO.test(e.mensagem)
    const chave = versaoAntiga
      ? 'versao-antiga'
      : e.mensagem.replace(/-[A-Za-z0-9_]{6,}\.(m?js|css)/g, '.$1').replace(/\d{3,}/g, '#').slice(0, 200)
    const g = grupos.get(chave)
    if (!g) {
      grupos.set(chave, {
        chave,
        mensagem: versaoAntiga ? 'O navegador tentou abrir um arquivo de uma versão antiga do portal' : e.mensagem,
        versaoAntiga,
        ocorrencias: 1,
        usuarios: e.userEmail ? [e.userEmail] : [],
        telas: e.url ? [e.url] : [],
        primeira: e.criadoEm,
        ultima: e.criadoEm,
        ids: [e.id],
        detalhe: versaoAntiga ? e.mensagem : e.detalhe,
      })
      continue
    }
    g.ocorrencias++
    g.ids.push(e.id)
    if (e.userEmail && !g.usuarios.includes(e.userEmail)) g.usuarios.push(e.userEmail)
    if (e.url && !g.telas.includes(e.url)) g.telas.push(e.url)
    if (e.criadoEm < g.primeira) g.primeira = e.criadoEm
    if (e.criadoEm > g.ultima) g.ultima = e.criadoEm
  }
  return [...grupos.values()].sort((a, b) => (a.ultima < b.ultima ? 1 : -1))
}

// ───────────── Visão geral ─────────────

export interface AlertaAdmin {
  nivel: 'alto' | 'medio' | 'info'
  texto: string
  link?: { para: string; rotulo: string }
}

export interface ResumoAdmin {
  contas: number
  admins: number
  ativas: number | null
  inativas: number | null
  nuncaEntraram: number | null
  suspensas: number
  /** Erros de tela reais na semana (sem os de versão antiga, que se resolvem recarregando). */
  errosSemana: number
  alertas: AlertaAdmin[]
}

export function resumoAdmin(
  perfis: Perfil[],
  contas: ContaAuth[] | undefined,
  permissoes: PermissaoDeUsuario[],
  erros: ErroApp[],
  totalModulos: number,
  agora: Date = new Date(),
): ResumoAdmin {
  const authDe = new Map((contas ?? []).map((c) => [c.id, c]))
  const status = perfis.map((p) => statusConta(p, authDe.get(p.id), agora))
  const conta = (s: StatusConta) => (contas ? status.filter((x) => x === s).length : null)
  const admins = perfis.filter((p) => p.role === 'admin' && !p.suspensa).length
  const semanaAtras = agora.getTime() - 7 * DIA
  const errosSemana = erros.filter((e) => new Date(e.criadoEm).getTime() >= semanaAtras)
  const alertas: AlertaAdmin[] = []

  if (admins <= 1) {
    alertas.push({
      nivel: 'medio',
      texto: 'Só existe 1 administrador. Se essa conta ficar sem acesso, ninguém consegue administrar o portal — considere ter um segundo admin de confiança.',
      link: { para: '/admin/usuarios', rotulo: 'Ver usuários' },
    })
  }
  const inativasComEdicao = contas
    ? perfis.filter(
        (p, i) => status[i] === 'inativa' && p.role !== 'admin' && permissoes.some((x) => x.userId === p.id && x.podeEditar),
      )
    : []
  if (inativasComEdicao.length) {
    alertas.push({
      nivel: 'medio',
      texto: `${inativasComEdicao.length} conta${inativasComEdicao.length === 1 ? '' : 's'} sem entrar há mais de ${DIAS_INATIVA} dias ainda pode${inativasComEdicao.length === 1 ? '' : 'm'} editar. Se a pessoa saiu do setor, suspenda a conta.`,
      link: { para: '/admin/usuarios?status=inativa', rotulo: 'Ver contas inativas' },
    })
  }
  const nunca = conta('nunca_entrou') ?? 0
  if (nunca) {
    alertas.push({
      nivel: 'info',
      texto: `${nunca} conta${nunca === 1 ? '' : 's'} nunca entrou no portal.`,
      link: { para: '/admin/usuarios?status=nunca_entrou', rotulo: 'Ver contas' },
    })
  }
  const semModulo = perfis.filter((p) => p.role !== 'admin' && !p.suspensa && modulosLiberados(p, permissoes, totalModulos) === 0)
  if (semModulo.length) {
    alertas.push({
      nivel: 'info',
      texto: `${semModulo.length} conta${semModulo.length === 1 ? '' : 's'} ativa${semModulo.length === 1 ? '' : 's'} sem nenhum módulo liberado — a pessoa entra e não vê nada.`,
      link: { para: '/admin/permissoes', rotulo: 'Ajustar permissões' },
    })
  }
  const errosReais = errosSemana.filter((e) => !RE_VERSAO.test(e.mensagem))
  if (errosReais.length) {
    alertas.push({
      nivel: 'alto',
      texto: `${errosReais.length} erro${errosReais.length === 1 ? '' : 's'} de tela nos últimos 7 dias.`,
      link: { para: '/admin/erros', rotulo: 'Ver erros' },
    })
  }

  return {
    contas: perfis.length,
    admins,
    ativas: conta('ativa'),
    inativas: conta('inativa'),
    nuncaEntraram: conta('nunca_entrou'),
    suspensas: perfis.filter((p) => p.suspensa).length,
    errosSemana: errosSemana.filter((e) => !RE_VERSAO.test(e.mensagem)).length,
    alertas,
  }
}

/** Alterações por pessoa num período — quem está usando o portal. */
export function atividadePorUsuario(alteracoes: { userId: string | null; userEmail: string; em: string }[]): { email: string; total: number; ultima: string }[] {
  const m = new Map<string, { email: string; total: number; ultima: string }>()
  for (const a of alteracoes) {
    const chave = a.userId ?? a.userEmail
    if (!chave) continue
    const r = m.get(chave)
    if (r) {
      r.total++
      if (a.em > r.ultima) r.ultima = a.em
    } else m.set(chave, { email: a.userEmail || '—', total: 1, ultima: a.em })
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/** Nome curto do módulo (o mesmo da barra lateral: Compras, Pareceres, Contratos, OPME). */
export function rotuloCurto(chave: string): string {
  return NAV_MODULOS.find((m) => m.chave === chave)?.rotulo ?? chave
}

/** Texto do registro de auditoria com o nome do módulo legível ("ocs: …" → "Compras: …"). */
export function detalheAuditoria(detalhe: string): string {
  return detalhe.replace(/^([a-z]+):/, (_, chave: string) => `${rotuloCurto(chave)}:`)
}
