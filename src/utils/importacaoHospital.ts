import { HOSPITAIS, type HospitalId } from '@/constants'

/**
 * Proteção contra importar relatório de um hospital no outro (HUV ↔ HMK).
 * `ocs.id`/`sols.id` são o número do SoulMV e são chave primária única no banco
 * inteiro — uma OC do HUV não pode ser gravada de novo como HMK. Antes, o insert
 * falhava com o erro cru do Supabase ("[object Object]").
 */

export interface AvaliacaoHospital {
  /** Ids do arquivo que já estão cadastrados em outro hospital → hospital deles. */
  deOutro: Map<number, HospitalId>
  /** Hospital mais frequente entre `deOutro` (null se nenhum). */
  outroHospital: HospitalId | null
  /** Maioria dos ids já conhecidos é de outro hospital — o arquivo é de lá. */
  arquivoEhDeOutro: boolean
}

export function avaliarHospitalDoArquivo(
  idsNoAtivo: number,
  encontradosForaDoAtivo: Map<number, HospitalId>,
  ativo: HospitalId,
): AvaliacaoHospital {
  const deOutro = new Map([...encontradosForaDoAtivo].filter(([, h]) => h !== ativo))
  const contagem = new Map<HospitalId, number>()
  for (const h of deOutro.values()) contagem.set(h, (contagem.get(h) ?? 0) + 1)
  const outroHospital = [...contagem].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { deOutro, outroHospital, arquivoEhDeOutro: deOutro.size > 0 && deOutro.size > idsNoAtivo }
}

export function siglaHospital(id: HospitalId | string): string {
  return HOSPITAIS[id as HospitalId]?.sigla ?? String(id).toUpperCase()
}

export function avisoArquivoDeOutroHospital(outro: HospitalId, ativo: HospitalId, qtd: number, tipo: string): string {
  return (
    `Este relatório parece ser do ${siglaHospital(outro)} (${qtd} ${tipo} já cadastrada(s) lá), ` +
    `mas o hospital ativo é ${siglaHospital(ativo)}. Nada foi gravado — troque o hospital no topo da tela e importe de novo.`
  )
}

/** Texto legível de qualquer erro — inclusive o objeto de erro do Supabase (não é `instanceof Error`). */
export function mensagemErro(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown; details?: unknown }
    if (e.code === '23505') {
      return 'Registro já existe no sistema (possivelmente cadastrado no outro hospital). Confira se o hospital ativo é o mesmo do relatório.'
    }
    if (e.code === '42501') return 'Sem permissão para gravar esses dados (verifique suas permissões no módulo).'
    if (typeof e.message === 'string' && e.message) {
      return typeof e.details === 'string' && e.details ? `${e.message} (${e.details})` : e.message
    }
  }
  if (typeof err === 'string') return err
  return 'Erro desconhecido'
}
