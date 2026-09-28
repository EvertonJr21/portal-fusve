import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import * as catalogoRepository from '@/repositories/catalogoRepository'
import type { Area, Grupo, ItemCatalogo } from '@/types'

/** Adaptador React pro `catalogoRepository` — sem SQL/mapeamento aqui. */

// ---- Áreas ----

export function useAreas(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['catalogo', 'areas', hospitalId],
    queryFn: () => catalogoRepository.listarAreas(hospitalId),
  })
}

export function useSalvarArea(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (area: Area) => catalogoRepository.salvarArea(area),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo', 'areas', hospitalId] }),
  })
}

export function useExcluirArea(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogoRepository.excluirArea(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo', 'areas', hospitalId] }),
  })
}

// ---- Grupos ----

export function useGrupos() {
  return useQuery({
    queryKey: ['catalogo', 'grupos'],
    queryFn: catalogoRepository.listarGrupos,
  })
}

export function useSalvarGrupo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (grupo: Grupo) => catalogoRepository.salvarGrupo(grupo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo', 'grupos'] }),
  })
}

export function useExcluirGrupo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogoRepository.excluirGrupo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo', 'grupos'] }),
  })
}

// ---- Itens ----

/** Lista completa (~5.400+) — usada na tela de Gestão, paginação/busca no cliente. */
export function useItens() {
  return useQuery({
    queryKey: ['catalogo', 'itens'],
    queryFn: catalogoRepository.listarItens,
  })
}

/** Busca server-side por nome/sinônimo — usada no autocomplete de `/catalogo` (Navegar). */
export function useBuscaItens(texto: string) {
  return useQuery({
    queryKey: ['catalogo', 'busca-itens', texto],
    queryFn: () => catalogoRepository.buscarItensPorTexto(texto),
    enabled: texto.trim().length > 0,
  })
}

export function useItensDaArea(areaId: string | null) {
  return useQuery({
    queryKey: ['catalogo', 'itens-da-area', areaId],
    queryFn: () => catalogoRepository.listarItensDaArea(areaId!),
    enabled: !!areaId,
  })
}

export function useSalvarItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (item: ItemCatalogo) => catalogoRepository.salvarItem(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] }),
  })
}

export function useExcluirItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogoRepository.excluirItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] }),
  })
}

// ---- Item ↔ Grupo ----

export function useGruposDoItem(itemId: string | null) {
  return useQuery({
    queryKey: ['catalogo', 'grupos-do-item', itemId],
    queryFn: () => catalogoRepository.listarGruposDoItem(itemId!),
    enabled: !!itemId,
  })
}

export function useDefinirGruposDoItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, grupoIds }: { itemId: string; grupoIds: string[] }) =>
      catalogoRepository.definirGruposDoItem(itemId, grupoIds),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'grupos-do-item', itemId] })
    },
  })
}

// ---- Item ↔ Área ----

export function useAreasDoItem(itemId: string | null) {
  return useQuery({
    queryKey: ['catalogo', 'areas-do-item', itemId],
    queryFn: () => catalogoRepository.listarAreasDoItem(itemId!),
    enabled: !!itemId,
  })
}

export function useDefinirAreaItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, areaId, principal }: { itemId: string; areaId: string; principal: boolean }) =>
      catalogoRepository.definirAreaItem(itemId, areaId, principal),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'areas-do-item', itemId] })
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'itens-da-area'] })
    },
  })
}

export function useRemoverAreaItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, areaId }: { itemId: string; areaId: string }) =>
      catalogoRepository.removerAreaItem(itemId, areaId),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'areas-do-item', itemId] })
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'itens-da-area'] })
    },
  })
}
