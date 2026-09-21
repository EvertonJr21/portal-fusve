import { z } from 'zod'
import { HOSPITAIS, type HospitalId } from '@/constants'

/**
 * Validação na fronteira da importação (CSV/PDF do SoulMV) — os parsers em
 * `csv.ts`/`pdf.ts` já são tolerantes a formato variável, mas o que sai deles
 * nunca deve ser gravado no Supabase sem checar o formato mínimo esperado.
 * Ver CLAUDE_ENGINEERING.md, seção 34 ("nunca confiar diretamente em CSV/PDF/
 * input do usuário/API externa").
 */

const dataDMY = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'data fora do formato DD/MM/AAAA')

const hospitalIdSchema = z.enum(Object.keys(HOSPITAIS) as [HospitalId, ...HospitalId[]])

export const ocImportadaSchema = z.object({
  id: z.number().int().positive('id da OC precisa ser um inteiro positivo'),
  dataSolic: dataDMY,
  sit: z.string().min(1, 'situação vazia'),
  fornecedorId: z.number().int().nonnegative(),
  fornecedorNome: z.string().min(2, 'nome do fornecedor muito curto ou vazio'),
  previsaoForn: dataDMY.nullable(),
  diasAtraso: z.number().int().nonnegative('dias em atraso não pode ser negativo'),
  estoque: z.string(),
})

export const solImportadaSchema = z.object({
  id: z.number().int().positive('id da solicitação precisa ser um inteiro positivo'),
  data: dataDMY,
  produto: z.string().min(1),
  motivo: z.string(),
  solicitante: z.string(),
  qtd: z.number().int().nonnegative('quantidade não pode ser negativa'),
  sit: z.string().min(1),
  estoque: z.string(),
  hospitalId: hospitalIdSchema,
})

export const fornecedorImportadoSchema = z.object({
  id: z.number().int().positive('id do fornecedor precisa ser um inteiro positivo'),
  nome: z.string().min(2, 'nome do fornecedor muito curto ou vazio'),
  cnpj: z.string().nullable(),
})

export const vinculoAcompSchema = z.object({
  ocId: z.number().int().positive(),
  solicitacaoId: z.number().int().positive(),
  dataOC: dataDMY,
  fornecedorNome: z.string().min(1),
})

export interface ItemInvalido<T> {
  item: T
  erros: string[]
}

export interface ResultadoValidacao<T> {
  validos: T[]
  invalidos: ItemInvalido<T>[]
}

/**
 * Separa itens válidos dos inválidos em vez de rejeitar o lote inteiro — uma
 * linha ruim no meio de 665 OCs não pode travar as outras 664 (ver
 * CLAUDE_ENGINEERING.md seção 33: usuário precisa saber quantos processados,
 * quantos falharam, quais e por quê).
 */
export function validarLote<T>(itens: T[], schema: z.ZodType<T>): ResultadoValidacao<T> {
  const validos: T[] = []
  const invalidos: ItemInvalido<T>[] = []
  for (const item of itens) {
    const resultado = schema.safeParse(item)
    if (resultado.success) {
      validos.push(resultado.data)
    } else {
      invalidos.push({ item, erros: resultado.error.issues.map((i) => i.message) })
    }
  }
  return { validos, invalidos }
}
