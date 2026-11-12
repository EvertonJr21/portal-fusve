import { useMemo } from 'react'
import { NAV_MODULOS, type ModuloNav } from '@/components/layout/navegacao'
import { useMeuPerfil, useMinhasPermissoes } from './usePermissoes'

/** Módulos que a conta pode ver, na ordem da navegação (admin vê todos). */
export function useModulosVisiveis(): {
  modulos: ModuloNav[]
  isAdmin: boolean
  carregando: boolean
  erro: Error | null
} {
  const perfil = useMeuPerfil()
  const permissoes = useMinhasPermissoes()
  const isAdmin = perfil.data?.role === 'admin'
  const carregando = perfil.isLoading || permissoes.isLoading
  const erro = perfil.error ?? permissoes.error ?? null

  const modulos = useMemo(() => {
    if (carregando || erro) return []
    return NAV_MODULOS.filter((m) => isAdmin || permissoes.data?.some((p) => p.modulo === m.chave && p.podeVer))
  }, [carregando, erro, isAdmin, permissoes.data])

  return { modulos, isAdmin, carregando, erro }
}
