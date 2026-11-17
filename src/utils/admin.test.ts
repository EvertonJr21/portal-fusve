import { describe, expect, it } from 'vitest'
import type { Perfil } from '@/repositories/permissaoRepository'
import { agruparErros, atividadePorUsuario, modulosLiberados, resumoAdmin, statusConta, tempoRelativo } from './admin'

const agora = new Date('2026-11-17T12:00:00Z')
const perfil = (id: string, o: Partial<Perfil> = {}): Perfil => ({ id, email: `${id}@exemplo.org`, nome: '', role: 'user', criadoEm: null, suspensa: false, ...o })
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString()

describe('statusConta', () => {
  it('suspensa, nunca entrou, ativa e inativa', () => {
    expect(statusConta(perfil('a', { suspensa: true }), undefined, agora)).toBe('suspensa')
    expect(statusConta(perfil('a'), undefined, agora)).toBeNull()
    expect(statusConta(perfil('a'), { id: 'a', ultimoAcesso: null, emailConfirmado: true, bloqueadaAte: null }, agora)).toBe('nunca_entrou')
    expect(statusConta(perfil('a'), { id: 'a', ultimoAcesso: dias(3), emailConfirmado: true, bloqueadaAte: null }, agora)).toBe('ativa')
    expect(statusConta(perfil('a'), { id: 'a', ultimoAcesso: dias(45), emailConfirmado: true, bloqueadaAte: null }, agora)).toBe('inativa')
  })
})

describe('tempoRelativo', () => {
  it('formata intervalos', () => {
    expect(tempoRelativo(null, agora)).toBe('Nunca')
    expect(tempoRelativo(new Date(agora.getTime() - 30_000).toISOString(), agora)).toBe('agora há pouco')
    expect(tempoRelativo(new Date(agora.getTime() - 15 * 60_000).toISOString(), agora)).toBe('há 15 min')
    expect(tempoRelativo(dias(1), agora)).toBe('ontem')
    expect(tempoRelativo(dias(12), agora)).toBe('há 12 dias')
    expect(tempoRelativo(dias(65), agora)).toBe('há 2 meses')
  })
})

describe('agruparErros', () => {
  it('junta erros de versão antiga e repetidos', () => {
    const e = (id: string, mensagem: string, em: string, user = 'x@exemplo.org') => ({ id, mensagem, detalhe: '', url: '/ocs', userEmail: user, criadoEm: em })
    const g = agruparErros([
      e('1', 'Failed to fetch dynamically imported module: /assets/A-DSBjXM68.js', dias(1)),
      e('2', 'Failed to fetch dynamically imported module: /assets/B-9WFQgm12.js', dias(5), 'y@exemplo.org'),
      e('3', 'x is undefined', dias(2)),
      e('4', 'x is undefined', dias(0)),
    ])
    expect(g).toHaveLength(2)
    expect(g[0].mensagem).toBe('x is undefined')
    expect(g[0].ocorrencias).toBe(2)
    expect(g[1].versaoAntiga).toBe(true)
    expect(g[1].usuarios).toEqual(['x@exemplo.org', 'y@exemplo.org'])
  })
})

describe('resumoAdmin', () => {
  it('conta status e gera alertas', () => {
    const perfis = [perfil('adm', { role: 'admin' }), perfil('a'), perfil('b'), perfil('c', { suspensa: true })]
    const contas = [
      { id: 'adm', ultimoAcesso: dias(0), emailConfirmado: true, bloqueadaAte: null },
      { id: 'a', ultimoAcesso: dias(40), emailConfirmado: true, bloqueadaAte: null },
      { id: 'b', ultimoAcesso: null, emailConfirmado: true, bloqueadaAte: null },
      { id: 'c', ultimoAcesso: dias(1), emailConfirmado: true, bloqueadaAte: null },
    ]
    const permissoes = [{ userId: 'a', modulo: 'ocs' as const, podeVer: true, podeEditar: true }]
    const r = resumoAdmin(perfis, contas, permissoes, [], 4, agora)
    expect(r).toMatchObject({ contas: 4, admins: 1, ativas: 1, inativas: 1, nuncaEntraram: 1, suspensas: 1 })
    expect(r.alertas.map((x) => x.nivel)).toEqual(['medio', 'medio', 'info', 'info'])
    expect(modulosLiberados(perfis[0], permissoes, 4)).toBe(4)
    expect(modulosLiberados(perfis[2], permissoes, 4)).toBe(0)
  })
})

describe('atividadePorUsuario', () => {
  it('conta alterações por pessoa', () => {
    const r = atividadePorUsuario([
      { userId: 'a', userEmail: 'a@x', em: dias(2) },
      { userId: 'a', userEmail: 'a@x', em: dias(1) },
      { userId: 'b', userEmail: 'b@x', em: dias(3) },
    ])
    expect(r[0]).toEqual({ email: 'a@x', total: 2, ultima: dias(1) })
  })
})
