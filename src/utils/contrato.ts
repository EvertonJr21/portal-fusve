import { ALERTA_CRITICO_DIAS } from '@/constants'
import type { ContratoHeader } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'

export type StatusVigencia = 'vencido' | 'critico' | 'atencao' | 'ok' | 'sem_vigencia'

/** Dias restantes até `vigenciaFim` (negativo = vencido). Aceita `YYYY-MM-DD` (formato do input date/Postgres). */
export function diasParaVencer(vigenciaFim: string | null): number | null {
  if (!vigenciaFim) return null
  const data = vigenciaFim.includes('/') ? parseDMY(vigenciaFim) : new Date(`${vigenciaFim}T00:00:00`)
  if (!data || Number.isNaN(data.getTime())) return null
  return diasEntre(getHoje(), data)
}

/**
 * Status de vigência do contrato: vencido (passou), crítico (≤30 dias fixos),
 * atenção (dentro da janela de aviso configurada no próprio contrato,
 * `avisoRenovacaoDias`), ok (fora dessas janelas), sem_vigencia (sem data fim).
 */
export function statusVigencia(contrato: Pick<ContratoHeader, 'vigenciaFim' | 'avisoRenovacaoDias'>): StatusVigencia {
  const dias = diasParaVencer(contrato.vigenciaFim)
  if (dias === null) return 'sem_vigencia'
  if (dias < 0) return 'vencido'
  if (dias <= ALERTA_CRITICO_DIAS) return 'critico'
  if (dias <= contrato.avisoRenovacaoDias) return 'atencao'
  return 'ok'
}

/** 387.69 → "387,69"; 0/negativo → "" (campo vazio em vez de um "0" que o usuário teria que apagar). */
export function formatarPrecoBR(valor: number): string {
  if (!valor || valor < 0) return ''
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Aceita "1.234,56", "1234,56", "1234.56" ou "R$ 12" → número; texto inválido → 0. */
export function parsePrecoBR(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, '')
  if (!limpo) return 0
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

export interface LinhaColada {
  cod: string
  /** Preço encontrado na mesma linha (com vírgula ou ponto decimal), ou null. */
  preco: number | null
}

const RE_PRECO = /^(?:R\$)?\d{1,3}(?:\.\d{3})*,\d{1,2}$|^(?:R\$)?\d+[.,]\d{1,2}$/

/**
 * Lê uma lista colada de códigos SoulMV (item 83) pra adicionar vários produtos
 * ao contrato de uma vez. Aceita:
 * - um código por linha, opcionalmente com o preço no fim (`16874 700,00`,
 *   colunas copiadas do Excel separadas por tab, `16874;Stent ...;700,00`);
 * - vários códigos numa linha só, separados por vírgula/espaço (`16874, 16876`).
 * Código = número inteiro de até 7 dígitos no início da linha (ou cada um da
 * lista, quando a linha só tem números). Preço = último valor com casas decimais.
 * Repetidos são ignorados (fica a 1ª ocorrência).
 */
export function lerListaColada(texto: string): LinhaColada[] {
  const saida: LinhaColada[] = []
  const vistos = new Set<string>()
  const add = (cod: string, preco: number | null) => {
    const c = cod.replace(/^0+(?=\d)/, '')
    if (vistos.has(c)) return
    vistos.add(c)
    saida.push({ cod: c, preco })
  }
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim()
    if (!linha) continue
    const tokens = linha.split(/[\t;|]+|\s+/).map((t) => t.trim().replace(/^"|"$/g, '')).filter(Boolean)
    if (!tokens.length) continue
    // Só números inteiros (separados por espaço/vírgula) → lista de códigos. "700,00" é preço,
    // não dois códigos: vírgula só separa códigos quando as partes têm 3+ dígitos.
    const soCodigos = tokens.flatMap((t) => {
      const sem = t.replace(/,$/, '')
      const partes = sem.split(',')
      return partes.length > 1 && partes.every((x) => x.length >= 3) ? partes : [sem]
    })
    if (soCodigos.length > 1 && soCodigos.every((t) => /^\d{1,7}$/.test(t))) {
      soCodigos.forEach((t) => add(t, null))
      continue
    }
    if (!/^\d{1,7}$/.test(tokens[0])) continue
    const ultimo = tokens.length > 1 ? tokens[tokens.length - 1].replace(/\s/g, '') : ''
    const preco = ultimo && RE_PRECO.test(ultimo) ? parsePrecoBR(ultimo) || null : null
    add(tokens[0], preco)
  }
  return saida
}

/** `YYYY-MM-DD` → Date local (meia-noite), ou null. */
function dataIso(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export interface MarcosVigencia {
  inicio: Date | null
  fim: Date | null
  /** Quando o aviso de renovação começa (fim − `avisoRenovacaoDias`). */
  avisoEm: Date | null
  /** 0–100 do tempo de vigência já decorrido; null sem início/fim. */
  pctDecorrido: number | null
  /** Duração total em dias; null sem início/fim. */
  duracaoDias: number | null
}

/** Datas-chave do contrato pra página do contrato (item 102). */
export function marcosVigencia(
  c: Pick<ContratoHeader, 'vigenciaInicio' | 'vigenciaFim' | 'avisoRenovacaoDias'>,
  hoje: Date,
): MarcosVigencia {
  const inicio = dataIso(c.vigenciaInicio)
  const fim = dataIso(c.vigenciaFim)
  const avisoEm = fim ? new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - c.avisoRenovacaoDias) : null
  if (!inicio || !fim || fim <= inicio) return { inicio, fim, avisoEm, pctDecorrido: null, duracaoDias: null }
  const duracaoDias = diasEntre(inicio, fim)
  const pct = (diasEntre(inicio, hoje) / duracaoDias) * 100
  return { inicio, fim, avisoEm, pctDecorrido: Math.min(100, Math.max(0, Math.round(pct))), duracaoDias }
}

/** Fornecedor que já aparece em contratos cadastrados (busca do formulário de contrato, item 108). */
export interface FornecedorDeContrato {
  chave: string
  nome: string
  cnpj: string
  contratos: ContratoHeader[]
  /** Contrato mais recente do fornecedor — de onde os dados são copiados. */
  modelo: ContratoHeader
}

const soDigitos = (s: string) => s.replace(/\D/g, '')
const normalizarNome = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Chave de agrupamento: CNPJ quando tem 14 dígitos, senão o nome sem acento. */
export function chaveFornecedorContrato(nome: string, cnpj: string): string {
  const d = soDigitos(cnpj)
  return d.length === 14 ? `cnpj:${d}` : `nome:${normalizarNome(nome)}`
}

/** Agrupa os contratos por fornecedor; o modelo é o contrato com vigência mais recente. */
export function fornecedoresDeContratos(contratos: ContratoHeader[], ignorarId?: string): FornecedorDeContrato[] {
  const grupos = new Map<string, ContratoHeader[]>()
  for (const c of contratos) {
    if (c.id === ignorarId || !c.fornecedorNome.trim()) continue
    const k = chaveFornecedorContrato(c.fornecedorNome, c.fornecedorCnpj)
    grupos.set(k, [...(grupos.get(k) ?? []), c])
  }
  return [...grupos.entries()]
    .map(([chave, lista]) => {
      const ordenados = [...lista].sort((a, b) => (b.vigenciaFim ?? b.vigenciaInicio ?? '').localeCompare(a.vigenciaFim ?? a.vigenciaInicio ?? ''))
      const modelo = ordenados[0]
      return { chave, nome: modelo.fornecedorNome, cnpj: lista.find((c) => c.fornecedorCnpj)?.fornecedorCnpj ?? '', contratos: ordenados, modelo }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

/** Acha o fornecedor de contrato pelo CNPJ (14 dígitos) ou pelo nome exato (sem acento). */
export function acharFornecedorDeContrato(lista: FornecedorDeContrato[], nome: string, cnpj: string): FornecedorDeContrato | null {
  const d = soDigitos(cnpj)
  if (d.length === 14) {
    const porCnpj = lista.find((f) => soDigitos(f.cnpj) === d)
    if (porCnpj) return porCnpj
  }
  const n = normalizarNome(nome)
  return n ? (lista.find((f) => normalizarNome(f.nome) === n) ?? null) : null
}

/** Campos que valem pro fornecedor em qualquer acordo dele: identificação, contato, logística e condições comerciais. */
const CAMPOS_DO_FORNECEDOR = [
  'fornecedorNome',
  'fornecedorCnpj',
  'contatoNome',
  'contatoEmail',
  'contatoWhatsapp',
  'freteTipo',
  'prazoMedioDias',
  'origemEmbarque',
  'toleranciaAtrasoDias',
  'horarioCutoff',
  'condicaoPagamento',
  'reajusteRegra',
  'gatilhoDesconto',
] as const satisfies readonly (keyof ContratoHeader)[]

/**
 * Copia os dados do fornecedor de outro contrato só nos campos ainda vazios —
 * nunca apaga o que já foi digitado. Devolve o cabeçalho novo e quantos campos mudaram.
 */
export function copiarDadosFornecedor(destino: ContratoHeader, origem: ContratoHeader): { header: ContratoHeader; preenchidos: number } {
  const header = { ...destino }
  let preenchidos = 0
  for (const campo of CAMPOS_DO_FORNECEDOR) {
    const atual = header[campo]
    const novo = origem[campo]
    const vazio = atual === null || atual === ''
    if (vazio && novo !== null && novo !== '') {
      ;(header as Record<string, unknown>)[campo] = novo
      preenchidos++
    }
  }
  return { header, preenchidos }
}
