import { describe, expect, it } from 'vitest'
import type { ContratoHeader } from '@/types'
import { acharFornecedorDeContrato, copiarDadosFornecedor, formatarPrecoBR, fornecedoresDeContratos, lerListaColada, marcosVigencia, parsePrecoBR, pontosDeAtencaoContrato, textoVigencia } from './contrato'
import { getHoje } from './date'

describe('formatarPrecoBR', () => {
  it('formata com vírgula decimal e milhar', () => {
    expect(formatarPrecoBR(387.69)).toBe('387,69')
    expect(formatarPrecoBR(1234.5)).toBe('1.234,50')
  })
  it('zero vira campo vazio', () => {
    expect(formatarPrecoBR(0)).toBe('')
  })
})

describe('parsePrecoBR', () => {
  it('lê formato brasileiro', () => {
    expect(parsePrecoBR('1.234,56')).toBe(1234.56)
    expect(parsePrecoBR('387,69')).toBe(387.69)
  })
  it('lê ponto decimal e prefixo R$', () => {
    expect(parsePrecoBR('387.69')).toBe(387.69)
    expect(parsePrecoBR('R$ 12')).toBe(12)
  })
  it('texto vazio ou inválido vira 0', () => {
    expect(parsePrecoBR('')).toBe(0)
    expect(parsePrecoBR('abc')).toBe(0)
  })
})

describe('lerListaColada', () => {
  it('um código por linha, com ou sem preço no fim', () => {
    expect(lerListaColada('16874 700,00\n16876\n\n2868\tFIO ETHIBOND 2-0\t12,5')).toEqual([
      { cod: '16874', preco: 700 },
      { cod: '16876', preco: null },
      { cod: '2868', preco: 12.5 },
    ])
  })

  it('vários códigos na mesma linha e repetidos ignorados', () => {
    expect(lerListaColada('16874, 16876 16880\n16874')).toEqual([
      { cod: '16874', preco: null },
      { cod: '16876', preco: null },
      { cod: '16880', preco: null },
    ])
  })

  it('não confunde medida da descrição com preço; ignora linha sem código no início', () => {
    expect(lerListaColada('16874;STENT 2.50X12\nCÓDIGO;DESCRIÇÃO\n100;R$ 1.234,56')).toEqual([
      { cod: '16874', preco: null },
      { cod: '100', preco: 1234.56 },
    ])
  })
})

describe('marcosVigencia', () => {
  const c = { vigenciaInicio: '2026-01-01', vigenciaFim: '2026-12-31', avisoRenovacaoDias: 90 }
  it('calcula o aviso e o tempo decorrido', () => {
    const m = marcosVigencia(c, new Date(2026, 6, 2))
    expect(m.avisoEm?.toLocaleDateString('pt-BR')).toBe('02/10/2026')
    expect(m.duracaoDias).toBe(364)
    expect(m.pctDecorrido).toBe(50)
  })
  it('limita entre 0 e 100', () => {
    expect(marcosVigencia(c, new Date(2025, 5, 1)).pctDecorrido).toBe(0)
    expect(marcosVigencia(c, new Date(2027, 5, 1)).pctDecorrido).toBe(100)
  })
  it('sem início não calcula progresso', () => {
    const m = marcosVigencia({ ...c, vigenciaInicio: null }, new Date(2026, 6, 2))
    expect(m.pctDecorrido).toBeNull()
    expect(m.fim).not.toBeNull()
  })
})

describe('fornecedor de contratos (item 108)', () => {
  const base = (o: Partial<ContratoHeader>): ContratoHeader => ({
    id: 'x', titulo: '', tipo: 'Contrato', status: 'Ativo', fornecedorNome: '', fornecedorCnpj: '', contatoNome: '', contatoEmail: '',
    contatoWhatsapp: '', freteTipo: '', prazoMedioDias: null, origemEmbarque: '', toleranciaAtrasoDias: null, horarioCutoff: '',
    gatilhoDesconto: '', reajusteRegra: '', condicaoPagamento: '', vigenciaInicio: null, vigenciaFim: null, avisoRenovacaoDias: 60,
    renovacaoAutomatica: false, hospitalId: 'huv', classificacao: '', observacoes: '', ...o,
  })
  const a = base({ id: 'a', titulo: 'Stent', fornecedorNome: 'Fornecedor Teste', fornecedorCnpj: '11.222.333/0001-44', contatoEmail: 'a@x.org', prazoMedioDias: 10, vigenciaFim: '2026-05-01' })
  const b = base({ id: 'b', titulo: 'Balão', fornecedorNome: 'FORNECEDOR TESTE', fornecedorCnpj: '11222333000144', freteTipo: 'CIF', vigenciaFim: '2027-01-01' })
  const c = base({ id: 'c', fornecedorNome: 'Outro Fornecedor' })

  it('agrupa pelo CNPJ e usa o contrato mais recente como modelo', () => {
    const lista = fornecedoresDeContratos([a, b, c])
    expect(lista).toHaveLength(2)
    const f = lista.find((x) => x.contratos.length === 2)!
    expect(f.modelo.id).toBe('b')
    expect(fornecedoresDeContratos([a, b, c], 'b').find((x) => x.chave.startsWith('cnpj'))!.contratos).toHaveLength(1)
  })

  it('acha por CNPJ ou nome sem acento', () => {
    const lista = fornecedoresDeContratos([a, c])
    expect(acharFornecedorDeContrato(lista, '', '11.222.333/0001-44')?.modelo.id).toBe('a')
    expect(acharFornecedorDeContrato(lista, 'outro  fornecedor', '')?.modelo.id).toBe('c')
    expect(acharFornecedorDeContrato(lista, 'nada', '')).toBeNull()
  })

  it('copia só nos campos vazios', () => {
    const destino = base({ id: 'novo', titulo: 'Novo', fornecedorNome: 'Mais', contatoEmail: 'meu@x.org' })
    const { header, preenchidos } = copiarDadosFornecedor(destino, a)
    expect(header.fornecedorNome).toBe('Mais')
    expect(header.contatoEmail).toBe('meu@x.org')
    expect(header.fornecedorCnpj).toBe('11.222.333/0001-44')
    expect(header.prazoMedioDias).toBe(10)
    expect(header.titulo).toBe('Novo')
    expect(header.id).toBe('novo')
    expect(preenchidos).toBe(2)
  })
})

describe('resumo impresso do contrato (item 110)', () => {
  const iso = (dias: number) => {
    const d = getHoje()
    d.setDate(d.getDate() + dias)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const base = {
    id: 'x', titulo: 'Teste', tipo: 'Contrato', status: 'Ativo', fornecedorNome: 'FORNECEDOR TESTE', fornecedorCnpj: '00.000.000/0001-00',
    contatoNome: '', contatoEmail: 'a@exemplo.org', contatoWhatsapp: '', freteTipo: 'CIF', prazoMedioDias: 10, origemEmbarque: '',
    toleranciaAtrasoDias: null, horarioCutoff: '', gatilhoDesconto: '', reajusteRegra: '', condicaoPagamento: '', vigenciaInicio: iso(-100),
    vigenciaFim: iso(200), avisoRenovacaoDias: 90, renovacaoAutomatica: false, hospitalId: 'huv', classificacao: '', observacoes: '',
  } as ContratoHeader

  it('textoVigencia', () => {
    expect(textoVigencia(iso(45))).toBe('Vence em 45 dias')
    expect(textoVigencia(iso(-3))).toBe('Vencido há 3 dias')
    expect(textoVigencia(iso(0))).toBe('Vence hoje')
    expect(textoVigencia(null)).toBe('Sem data de término')
  })

  it('contrato em dia não tem ponto de atenção', () => {
    expect(pontosDeAtencaoContrato(base, { produtos: [{ precoUnitario: 10 }], classe: 'A', temPdfAssinado: true })).toEqual([])
  })

  it('lista vencimento, preço faltando, nota D, cadastro e PDF', () => {
    const p = pontosDeAtencaoContrato(
      { ...base, vigenciaFim: iso(-5), fornecedorCnpj: '', contatoEmail: '' },
      { produtos: [{ precoUnitario: 0 }, { precoUnitario: 5 }], classe: 'D', temPdfAssinado: false },
    )
    expect(p.map((x) => x.nivel)).toEqual(['alto', 'medio', 'alto', 'medio', 'medio', 'medio'])
    expect(p[0].texto).toContain('vencida há 5')
    expect(p[1].texto).toContain('1 produto(s) sem preço')
  })
})
