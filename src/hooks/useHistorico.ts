import { useQuery } from '@tanstack/react-query'
import * as erroRepository from '@/repositories/erroRepository'
import * as historicoRepository from '@/repositories/historicoRepository'

/** Alterações de uma OC ou contrato. Se a tabela ainda não existe (migration não rodada), `error` vem preenchido e a tela só não mostra a seção. */
export function useHistoricoAlteracoes(tabela: 'ocs' | 'contratos', registroId: string | number | null) {
  return useQuery({
    queryKey: ['historico', tabela, String(registroId)],
    enabled: registroId !== null && registroId !== '',
    queryFn: () => historicoRepository.listarHistorico(tabela, registroId as string | number),
  })
}

/** Erros de tela registrados automaticamente — só admin enxerga (RLS). */
export function useErrosApp(ativo: boolean) {
  return useQuery({
    queryKey: ['erros-app'],
    enabled: ativo,
    queryFn: () => erroRepository.listarErros(),
  })
}
