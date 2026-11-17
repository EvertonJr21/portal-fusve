import { describe, expect, it } from 'vitest'
import type { ContratoHeader } from '@/types'
import { getHoje } from './date'
import { eixoTempo, faixaPrazo, marcasDeMes, montarCarteira, textoDias, unirContratos } from './carteiraContratos'

const iso = (dias: number) => {
  const d = getHoje()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const c = (id: string, o: Partial<ContratoHeader>) =>
  ({ id, titulo: '', tipo: 'Contrato', status: 'Ativo', fornecedorNome: 'FORNECEDOR ' + id, fornecedorCnpj: '', hospitalId: 'huv', classificacao: 'OPME', vigenciaFim: iso(200), avisoRenovacaoDias: 90, ...o }) as ContratoHeader

describe('relatório gerencial de contratos (item 112)', () => {
  it('faixas de prazo 30/90', () => {
    expect(faixaPrazo(-1)).toBe('vencido')
    expect(faixaPrazo(0)).toBe('critico')
    expect(faixaPrazo(30)).toBe('critico')
    expect(faixaPrazo(31)).toBe('atencao')
    expect(faixaPrazo(90)).toBe('atencao')
    expect(faixaPrazo(91)).toBe('normal')
    expect(faixaPrazo(null)).toBe('sem_data')
    expect(textoDias(-2)).toBe('Venceu há 2 dias')
    expect(textoDias(1)).toBe('1 dia')
  })

  it('monta a carteira da unidade, com "ambos" nos dois hospitais', () => {
    const lista = [
      c('a', { vigenciaFim: iso(10) }),
      c('b', { vigenciaFim: iso(-3), hospitalId: 'mkr', classificacao: 'CME' }),
      c('c', { vigenciaFim: iso(60), hospitalId: 'ambos' }),
      c('d', { status: 'Em Negociação' }),
      c('e', { vigenciaFim: iso(300), fornecedorNome: 'FORNECEDOR A' }),
    ]
    const huv = montarCarteira(lista, 'huv', new Map([['a', 4], ['c', 2]]))
    expect(huv.linhas.map((l) => l.contrato.id)).toEqual(['a', 'c', 'e'])
    expect(huv.decidir.map((l) => l.contrato.id)).toEqual(['a', 'c'])
    expect(huv.totais).toMatchObject({ ativos: 3, decidir: 2, vencidos: 0, criticos: 1, fornecedores: 2, produtos: 6, emNegociacao: 1 })
    const todas = montarCarteira(lista, 'todas')
    expect(todas.decidir[0].contrato.id).toBe('b')
    expect(todas.porClassificacao[0]).toMatchObject({ nome: 'OPME', quantidade: 3 })
    expect(todas.porUnidade.map((u) => u.nome).sort()).toEqual(['HMK', 'HUV', 'HUV e HMK'])
    expect(todas.linhas[0].itens).toBeNull()
  })

  it('une as listas dos hospitais sem repetir', () => {
    expect(unirContratos([c('a', {}), c('b', {})], [c('b', {}), c('c', {})]).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('eixo e marcas de mês', () => {
    const l = montarCarteira([c('a', { vigenciaFim: iso(-20) }), c('b', { vigenciaFim: iso(400) })], 'todas').linhas
    const e = eixoTempo(l)
    expect(e.min).toBe(-25)
    expect(e.max % 30).toBe(0)
    expect(e.max).toBeGreaterThanOrEqual(415)
    const marcas = marcasDeMes(getHoje(), e.min, e.max)
    expect(marcas.length).toBeGreaterThan(10)
    expect(marcas.every((m) => m.dias >= e.min && m.dias <= e.max)).toBe(true)
  })
})

describe('fraseCarteira', () => {
  it('resume ativos, fornecedores e decisões', async () => {
    const { fraseCarteira, montarCarteira } = await import('./carteiraContratos')
    const hoje = new Date()
    const iso = (d: number) => {
      const x = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + d)
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    }
    const base = { status: 'Ativo', hospitalId: 'huv', classificacao: 'OPME', titulo: '' }
    const contratos = [
      { ...base, id: '1', fornecedorNome: 'Fornecedor A', vigenciaFim: iso(10) },
      { ...base, id: '2', fornecedorNome: 'Fornecedor B', vigenciaFim: iso(200) },
    ] as unknown as Parameters<typeof montarCarteira>[0]
    const frase = fraseCarteira(montarCarteira(contratos, 'todas'), 'todas')
    expect(frase).toContain('2 contratos e acordos ativos com 2 fornecedores')
    expect(frase).toContain('1 precisa de decisão')
    expect(fraseCarteira(montarCarteira([], 'huv'), 'huv')).toBe('Nenhum contrato ativo nesta unidade no momento.')
  })
})
