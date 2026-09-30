// Carga inicial do Catálogo de Materiais — a partir do export completo de
// produtos do SoulMV (relatório Espécie → Classe → Sub Classe → Produto).
// Só a Espécie "002 — MATERIAL MEDICO HOSPITALAR" entra nesta carga (decisão
// do Everton, 28/09/2026) — outras espécies (gases, laboratório, etc.) ficam
// pra uma expansão futura, sem precisar recriar o script do zero: é só
// trocar o código da espécie abaixo (`ESPECIE_ALVO`).
//
// O que este script carrega: `itens` (nome, código SoulMV, unidade) e
// `grupos` (um por combinação Classe+Sub Classe, ex: "MATERIAL MEDICO —
// AGULHAS") + o vínculo `item_grupos`. NÃO mexe em `areas`/`item_areas` —
// o export do SoulMV não tem nenhuma informação de setor hospitalar (ver
// CLAUDE.md, seção do módulo Catálogo, pro porquê) — isso o Everton
// pesquisa e cadastra pela tela de Gestão.
//
// Idempotente — roda de novo sem duplicar (casa item por `cod_soulmv`,
// grupo por `nome`, vínculo por par item+grupo já existente).
//
// PRÉ-REQUISITO: migration `202609280002_catalogo_materiais.sql` já
// aplicada em produção.
//
// RODAR: npx tsx scripts/import-catalogo.ts /caminho/para/produtos.csv
// Requer no `.env` (não `.env.local`, roda fora do Vite):
//   VITE_SUPABASE_URL=https://urruseycrvfajnnbupyd.supabase.co
//   SUPABASE_KEY=... (service_role — RLS exige autenticado)

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

/** Mesma lógica de `src/utils/csv.ts` — tenta UTF-8, cai pra latin-1 (padrão dos exports do SoulMV) se inválido. */
function lerComEncodingAutomatico(caminho: string): string {
  const buf = readFileSync(caminho)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('iso-8859-1').decode(buf)
  }
}

const ESPECIE_ALVO = '002'
const TAMANHO_LOTE = 500

function env(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida — confira o .env`)
  return valor
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      entreAspas = !entreAspas
    } else if (c === ',' && !entreAspas) {
      result.push(atual.trim())
      atual = ''
    } else {
      atual += c
    }
  }
  result.push(atual.trim())
  return result
}

interface ProdutoExtraido {
  codigo: string
  nome: string
  unidade: string
  grupoNome: string
}

function extrairProdutos(caminho: string): ProdutoExtraido[] {
  const linhas = lerComEncodingAutomatico(caminho).split(/\r?\n/)
  const produtos: ProdutoExtraido[] = []

  let dentroDaEspecieAlvo = false
  let classeAtual = ''
  let subClasseAtual = ''

  for (const linhaBruta of linhas) {
    if (!linhaBruta.trim()) continue
    const cols = splitCsvLine(linhaBruta)

    if (cols[0] === 'Espécie:') {
      dentroDaEspecieAlvo = cols[6] === ESPECIE_ALVO
      continue
    }
    if (!dentroDaEspecieAlvo) continue

    if (cols[0] === 'Classe:') {
      classeAtual = cols[7] ?? ''
      continue
    }
    if (cols[1] === 'Sub Classe:') {
      subClasseAtual = cols[8] ?? ''
      continue
    }
    // Linha de produto: código numérico na coluna 2, nome na coluna 4, Mestre na 9.
    const codigo = cols[2]?.trim() ?? ''
    const nome = cols[4]?.trim() ?? ''
    const mestre = cols[9]?.trim() ?? ''
    const unidade = cols[10]?.trim() ?? ''
    if (!/^\d+$/.test(codigo) || !nome || mestre === 'S') continue

    // Quebra de página no meio de um registro: o relatório do SoulMV às vezes
    // interrompe uma linha de produto bem no meio (o resto do nome/código de
    // referência do fabricante vira uma "nova" linha logo depois do cabeçalho
    // repetido de Espécie/Classe/Sub Classe da página seguinte) — mesmo
    // código do produto anterior imediato, só que com um pedaço do nome.
    // Sem isso, o script cria um item fantasma duplicado com nome truncado.
    const anterior = produtos[produtos.length - 1]
    if (anterior && anterior.codigo === codigo) {
      anterior.nome = `${anterior.nome} ${nome}`.trim()
      if (!anterior.unidade && unidade) anterior.unidade = unidade
      continue
    }

    produtos.push({
      codigo,
      nome,
      unidade,
      grupoNome: `${classeAtual} — ${subClasseAtual}`,
    })
  }

  return produtos
}

async function emLotes<T>(itens: T[], tamanho: number, fn: (lote: T[]) => Promise<void>) {
  for (let i = 0; i < itens.length; i += tamanho) {
    const lote = itens.slice(i, i + tamanho)
    await fn(lote)
    console.log(`  ${Math.min(i + tamanho, itens.length)}/${itens.length}`)
  }
}

async function main() {
  const caminho = process.argv[2]
  if (!caminho) {
    console.error('Uso: npx tsx scripts/import-catalogo.ts /caminho/para/produtos.csv')
    process.exit(1)
  }

  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_KEY'))

  console.log('Lendo e extraindo produtos do CSV...')
  const produtos = extrairProdutos(caminho)
  console.log(`${produtos.length} produtos extraídos (Espécie ${ESPECIE_ALVO}).`)

  const nomesGrupos = [...new Set(produtos.map((p) => p.grupoNome))]
  console.log(`${nomesGrupos.length} grupos distintos.`)

  // ---- Grupos: casa por nome, cria os que faltam ----
  const { data: gruposExistentes, error: erroGrupos } = await supabase.from('grupos').select('id, nome').is('deleted_at', null)
  if (erroGrupos) throw erroGrupos
  const mapaGrupos = new Map(gruposExistentes.map((g) => [g.nome, g.id as string]))

  const gruposNovos = nomesGrupos.filter((n) => !mapaGrupos.has(n))
  if (gruposNovos.length > 0) {
    console.log(`Criando ${gruposNovos.length} grupos novos...`)
    const { data: inseridos, error } = await supabase
      .from('grupos')
      .insert(gruposNovos.map((nome, i) => ({ nome, ordem: i })))
      .select('id, nome')
    if (error) throw error
    for (const g of inseridos) mapaGrupos.set(g.nome, g.id as string)
  }

  // ---- Itens: casa por cod_soulmv, cria os que faltam ----
  const { data: itensExistentesRaw, error: erroItens } = await supabase
    .from('itens')
    .select('id, cod_soulmv')
    .is('deleted_at', null)
    .not('cod_soulmv', 'is', null)
  if (erroItens) throw erroItens
  const mapaItens = new Map(itensExistentesRaw.map((i) => [i.cod_soulmv as string, i.id as string]))

  const itensNovos = produtos.filter((p) => !mapaItens.has(p.codigo))
  console.log(`${itensNovos.length} itens novos, ${produtos.length - itensNovos.length} já existentes.`)

  if (itensNovos.length > 0) {
    console.log('Inserindo itens novos...')
    await emLotes(itensNovos, TAMANHO_LOTE, async (lote) => {
      const { data, error } = await supabase
        .from('itens')
        .insert(
          lote.map((p) => ({
            nome: p.nome,
            unidade_padrao: p.unidade,
            cod_soulmv: p.codigo,
            sinonimos: [],
            observacao: '',
          })),
        )
        .select('id, cod_soulmv')
      if (error) throw error
      for (const i of data) mapaItens.set(i.cod_soulmv as string, i.id as string)
    })
  }

  // ---- item_grupos: casa por par (item_id, grupo_id) já existente ----
  const { data: vinculosExistentes, error: erroVinculos } = await supabase.from('item_grupos').select('item_id, grupo_id')
  if (erroVinculos) throw erroVinculos
  const paresExistentes = new Set(vinculosExistentes.map((v) => `${v.item_id}:${v.grupo_id}`))

  const vinculosNovos = produtos
    .map((p) => ({ item_id: mapaItens.get(p.codigo)!, grupo_id: mapaGrupos.get(p.grupoNome)! }))
    .filter((v) => !paresExistentes.has(`${v.item_id}:${v.grupo_id}`))

  // dedupe (mesmo par pode repetir se o produto aparecer 2x no arquivo)
  const vinculosUnicos = [...new Map(vinculosNovos.map((v) => [`${v.item_id}:${v.grupo_id}`, v])).values()]

  console.log(`${vinculosUnicos.length} vínculos item↔grupo novos.`)
  if (vinculosUnicos.length > 0) {
    await emLotes(vinculosUnicos, TAMANHO_LOTE, async (lote) => {
      const { error } = await supabase.from('item_grupos').insert(lote)
      if (error) throw error
    })
  }

  console.log('─ Concluído.')
  console.log(`  Grupos: ${mapaGrupos.size} no total (${gruposNovos.length} criados agora)`)
  console.log(`  Itens: ${mapaItens.size} no total (${itensNovos.length} criados agora)`)
  console.log(`  Vínculos item↔grupo: ${vinculosUnicos.length} criados agora`)
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
