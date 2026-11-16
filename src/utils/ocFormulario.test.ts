import { describe, expect, it } from 'vitest'
import type { Fornecedor, OC, Solicitacao } from '@/types'
import { acharFornecedorPorNome, buscarSolicitacoes, estoquesMaisUsados, ultimaOCDoFornecedor, usoFornecedoresEmOCs } from './ocFormulario'

const oc = (id: number, o: Partial<OC>): OC =>
  ({ id, dataSolic: '01/01/2026', fornecedorNome: 'FORNECEDOR ALFA', fornecedorId: 1, sit: 'Autorizada', estoque: 'SUP CAF', ...o }) as OC

describe('formulário de OC (item 110)', () => {
  const ocs = [
    oc(1, { dataSolic: '10/02/2026', estoque: 'SUP CAF' }),
    oc(2, { dataSolic: '20/03/2026', estoque: 'SUP HEMODINAMICA' }),
    oc(3, { fornecedorId: 2, fornecedorNome: 'BETA', estoque: 'sup caf' }),
    oc(4, { fornecedorId: null, fornecedorNome: 'Gama Ltda', estoque: '' }),
  ]

  it('conta uso por fornecedor e ordena estoques por frequência', () => {
    expect(usoFornecedoresEmOCs(ocs).get(1)).toBe(2)
    expect(estoquesMaisUsados(ocs)).toEqual(['SUP CAF', 'SUP HEMODINAMICA'])
  })

  it('acha a OC mais recente do fornecedor, por código ou por nome', () => {
    expect(ultimaOCDoFornecedor(ocs, 1, '')?.id).toBe(2)
    expect(ultimaOCDoFornecedor(ocs, 1, '', 2)?.id).toBe(1)
    expect(ultimaOCDoFornecedor(ocs, null, 'GAMA LTDA')?.id).toBe(4)
    expect(ultimaOCDoFornecedor(ocs, 9, '')).toBeNull()
  })

  it('casa fornecedor do cadastro pelo nome sem acento', () => {
    const cad = [{ id: 7, nome: 'COMÉRCIO TESTE' }] as Fornecedor[]
    expect(acharFornecedorPorNome(cad, 'comercio teste')?.id).toBe(7)
    expect(acharFornecedorPorNome(cad, 'outro')).toBeNull()
  })

  it('busca solicitação por número ou por palavras do produto', () => {
    const sols = [
      { id: 26829, produto: 'LUVA FICTICIA TAM M', solicitante: 'SETOR A' },
      { id: 26900, produto: 'CATETER TESTE', solicitante: 'SETOR B' },
    ] as Solicitacao[]
    expect(buscarSolicitacoes(sols, '268').map((s) => s.id)).toEqual([26829])
    expect(buscarSolicitacoes(sols, 'luva m').map((s) => s.id)).toEqual([26829])
    expect(buscarSolicitacoes(sols, 'setor')).toHaveLength(2)
  })
})
