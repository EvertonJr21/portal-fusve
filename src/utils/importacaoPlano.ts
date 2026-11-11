import { SIT_RANK, type HospitalId } from '@/constants'
import type { OCImportadaInput } from '@/repositories/ocRepository'
import type { SalvarSolInput } from '@/repositories/solRepository'
import type { OC, Solicitacao } from '@/types'
import type { OCImportada, SolImportada } from './csv'

/**
 * Plano da importação: decide, sem gravar nada, o que cada linha do relatório
 * vai virar (nova, atualização, sem mudança, de outro hospital). É o que a prévia
 * mostra antes de confirmar, e o que a gravação em lote executa depois.
 */

function sitAvancou(atual: string, nova: string): boolean {
  return (SIT_RANK[nova] ?? 0) > (SIT_RANK[atual] ?? 0)
}

export interface Atualizacao<T> {
  id: number
  patch: Partial<T>
  log: string
}

export interface ForaDoHospital {
  id: number
  hospital: HospitalId
}

export interface PlanoOCs {
  novas: OCImportadaInput[]
  atualizacoes: Atualizacao<OC>[]
  semMudanca: number
  outroHospital: ForaDoHospital[]
  /** Das atualizações, quantas mudam a situação (o resto só corrige fornecedor). */
  mudamSituacao: number
}

/** `hojeStr` = hoje em DD/MM/AAAA — data aproximada de entrega/parcial (item 34/60). */
export function planejarOCs(
  itens: OCImportada[],
  existentes: Map<number, OC>,
  deOutro: Map<number, HospitalId>,
  hospitalId: HospitalId,
  hojeStr: string,
): PlanoOCs {
  const plano: PlanoOCs = { novas: [], atualizacoes: [], semMudanca: 0, outroHospital: [], mudamSituacao: 0 }
  const vistos = new Set<number>()
  for (const item of itens) {
    // Linha repetida no relatório: vale a primeira (um lote com id repetido falharia inteiro).
    if (vistos.has(item.id)) continue
    vistos.add(item.id)

    const existente = existentes.get(item.id)
    if (existente) {
      const patch: Partial<OC> = {}
      if (sitAvancou(existente.sit, item.sit)) patch.sit = item.sit as OC['sit']
      if (item.fornecedorNome && existente.fornecedorNome !== item.fornecedorNome) {
        patch.fornecedorNome = item.fornecedorNome
        patch.fornecedorId = item.fornecedorId
      }
      // O relatório não traz a data real: a transição pra Atendida/Parcial registra
      // hoje como aproximação, sem sobrescrever o que já existe. Previsão do
      // relatório nunca é aplicada (item 72).
      if (patch.sit === 'Atendida' && !existente.dataEntregaReal) {
        patch.dataEntregaReal = hojeStr
        patch.dataEntregaOrigem = 'estimada'
      }
      if (patch.sit === 'Parcialmente Atendida' && !existente.dataParcial) patch.dataParcial = hojeStr
      if (!Object.keys(patch).length) {
        plano.semMudanca++
        continue
      }
      if (patch.sit) plano.mudamSituacao++
      const marcador = patch.dataEntregaReal ? ' (entrega registrada hoje)' : patch.dataParcial ? ' (parcial registrada hoje)' : ''
      plano.atualizacoes.push({ id: item.id, patch, log: `OC ${item.id} — ${item.sit}${marcador}` })
      continue
    }

    const outro = deOutro.get(item.id)
    if (outro) {
      plano.outroHospital.push({ id: item.id, hospital: outro })
      continue
    }

    const entrega = item.sit === 'Atendida' ? hojeStr : null
    plano.novas.push({
      id: item.id,
      dataSolic: item.dataSolic,
      fornecedorNome: item.fornecedorNome,
      fornecedorId: item.fornecedorId,
      sit: item.sit,
      estoque: item.estoque || 'SUP CAF',
      solicitacaoId: null,
      previsaoForn: null,
      diasAtraso: item.diasAtraso,
      hospitalId,
      ultimaMovimentacao: item.dataSolic,
      dataEntregaReal: entrega,
      dataParcial: item.sit === 'Parcialmente Atendida' ? hojeStr : null,
      dataEntregaOrigem: entrega ? 'estimada' : null,
    })
  }
  return plano
}

/** Texto do log de uma OC nova — mesmo formato de antes da importação em lote. */
export function logOCNova(n: OCImportadaInput): string {
  const marcador = n.dataEntregaReal ? ' (entrega registrada hoje)' : n.dataParcial ? ' (parcial registrada hoje)' : ''
  return `OC ${n.id} — ${n.sit} (nova)${marcador}`
}

export interface PlanoSols {
  novas: SalvarSolInput[]
  atualizacoes: Atualizacao<Solicitacao>[]
  semMudanca: number
  outroHospital: ForaDoHospital[]
}

export function planejarSols(
  itens: SolImportada[],
  existentes: Map<number, Solicitacao>,
  deOutro: Map<number, HospitalId>,
  hospitalId: HospitalId,
): PlanoSols {
  const plano: PlanoSols = { novas: [], atualizacoes: [], semMudanca: 0, outroHospital: [] }
  const vistos = new Set<number>()
  for (const item of itens) {
    if (vistos.has(item.id)) continue
    vistos.add(item.id)

    const existente = existentes.get(item.id)
    if (existente) {
      // Só preenche campo vazio de solicitação já existente.
      const patch: Partial<Solicitacao> = {}
      if (!existente.motivo && item.motivo) patch.motivo = item.motivo
      if (!existente.solicitante && item.solicitante) patch.solicitante = item.solicitante
      if ((!existente.produto || existente.produto.includes('verificar')) && item.produto) patch.produto = item.produto
      if (!Object.keys(patch).length) plano.semMudanca++
      else plano.atualizacoes.push({ id: item.id, patch, log: `Solicitação ${item.id} — ${item.sit}` })
      continue
    }

    const outro = deOutro.get(item.id)
    if (outro) {
      plano.outroHospital.push({ id: item.id, hospital: outro })
      continue
    }

    plano.novas.push({
      id: item.id,
      data: item.data,
      produto: item.produto,
      motivo: item.motivo,
      solicitante: item.solicitante,
      qtd: item.qtd,
      sit: item.sit,
      hospitalId,
    })
  }
  return plano
}

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho))
  return lotes
}

/**
 * Roda `fn` em todos os itens com no máximo `limite` chamadas ao mesmo tempo.
 * Devolve, na ordem dos itens, o erro de cada um (null = deu certo) — um item
 * com erro não interrompe os outros.
 */
export async function emParalelo<T>(itens: T[], limite: number, fn: (item: T) => Promise<void>): Promise<unknown[]> {
  const erros: unknown[] = new Array(itens.length).fill(null)
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++
      try {
        await fn(itens[i])
      } catch (err) {
        erros[i] = err ?? new Error('erro desconhecido')
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador))
  return erros
}
