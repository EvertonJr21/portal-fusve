import { House } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { MenuUsuario } from '@/components/ui/MenuUsuario'
import { Sino } from '@/components/ui/Sino'
import { useModulosVisiveis } from '@/hooks/useModulosVisiveis'
import { useResumoDia } from '@/hooks/useResumoDia'
import { moduloDoCaminho } from './navegacao'

function Contador({ valor, className }: { valor: number; className: string }) {
  if (!valor) return null
  return (
    <span
      className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {valor > 99 ? '99+' : valor}
    </span>
  )
}

/**
 * Barra de módulos (item 101): cada módulo é um espaço próprio, escolhido por
 * ícone. No computador fica à esquerda (azul-marinho), com avisos e conta
 * embaixo; no celular vira a barra fixa no rodapé da tela.
 */
export function BarraModulos() {
  const { pathname } = useLocation()
  const { modulos } = useModulosVisiveis()
  const { contadores } = useResumoDia()
  const ativo = moduloDoCaminho(pathname)
  const noInicio = pathname === '/'

  const itemClasse = (selecionado: boolean) =>
    `relative flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold transition-colors ${
      selecionado ? 'bg-claro/15 text-claro' : 'text-claro/60 hover:bg-claro/10 hover:text-claro'
    }`
  const itemCelular = (selecionado: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-semibold ${
      selecionado ? 'text-blue-700' : 'text-slate-500'
    }`

  return (
    <>
      {/* Computador */}
      <nav
        aria-label="Módulos"
        className="sticky top-0 z-40 hidden h-svh w-[76px] shrink-0 flex-col items-center gap-1 bg-marinho py-3 md:flex"
      >
        <Link
          to="/"
          title="Portal FUSVE — início"
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-claro/10 text-[11px] font-extrabold tracking-tight text-claro"
        >
          FUSVE
        </Link>
        <Link to="/" className={itemClasse(noInicio)} aria-current={noInicio ? 'page' : undefined}>
          {noInicio && <span className="absolute -left-[6px] top-2 bottom-2 w-[3px] rounded-r bg-claro" />}
          <House className="h-5 w-5" strokeWidth={1.8} />
          Início
        </Link>
        {modulos.map((m) => {
          const Icone = m.icone
          const selecionado = ativo?.chave === m.chave
          return (
            <Link
              key={m.chave}
              to={m.inicio}
              title={m.titulo}
              className={itemClasse(selecionado)}
              aria-current={selecionado ? 'page' : undefined}
            >
              {selecionado && <span className="absolute -left-[6px] top-2 bottom-2 w-[3px] rounded-r bg-claro" />}
              <Icone className="h-5 w-5" strokeWidth={1.8} />
              {m.rotulo}
              <Contador valor={contadores[m.chave]} className="right-2.5 top-1" />
            </Link>
          )
        })}
        <div className="flex-1" />
        <Sino variante="barra" />
        <div className="mt-2">
          <MenuUsuario variante="barra" />
        </div>
      </nav>

      {/* Celular */}
      <nav
        aria-label="Módulos"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <NavLink to="/" end className={({ isActive }) => itemCelular(isActive)}>
          <House className="h-5 w-5" strokeWidth={1.8} />
          Início
        </NavLink>
        {modulos.map((m) => {
          const Icone = m.icone
          return (
            <Link key={m.chave} to={m.inicio} className={itemCelular(ativo?.chave === m.chave)}>
              <Icone className="h-5 w-5" strokeWidth={1.8} />
              <span className="max-w-full truncate">{m.rotulo}</span>
              <Contador valor={contadores[m.chave]} className="left-1/2 top-0.5 ml-1.5" />
            </Link>
          )
        })}
      </nav>
    </>
  )
}
