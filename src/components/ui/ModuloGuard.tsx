import { Navigate } from 'react-router-dom'
import type { ModuloChave } from '@/constants'
import { usePermissaoModulo } from '@/hooks/usePermissoes'

/**
 * Bloqueia a entrada num módulo pra quem não tem permissão de "ver" — a
 * proteção real é a RLS (`pode_ver_modulo()` no banco, ver migration
 * 202609220001), isso aqui é só UX: sem ele, quem navegasse direto pra uma
 * URL de módulo sem permissão veria a tela renderizar vazia (RLS filtrando
 * tudo em silêncio) em vez de entender que não tem acesso.
 */
export function ModuloGuard({ modulo, children }: { modulo: ModuloChave; children: React.ReactNode }) {
  const { carregando, podeVer } = usePermissaoModulo(modulo)

  if (carregando) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Carregando...</div>
  }
  if (!podeVer) return <Navigate to="/" replace />

  return <>{children}</>
}
