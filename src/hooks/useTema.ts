import { useCallback, useSyncExternalStore } from 'react'

export type Tema = 'claro' | 'escuro'

const KEY = 'fusve:tema'
const ouvintes = new Set<() => void>()

function ler(): Tema {
  try {
    return localStorage.getItem(KEY) === 'escuro' ? 'escuro' : 'claro'
  } catch {
    return 'claro'
  }
}

/** Aplica a classe `dark` no <html> — chamado também em `main.tsx`, antes do primeiro render. */
export function aplicarTema(tema: Tema = ler()) {
  document.documentElement.classList.toggle('dark', tema === 'escuro')
}

function assinar(fn: () => void) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

/** Tema claro/escuro — preferência por navegador (`fusve:tema`). */
export function useTema() {
  const tema = useSyncExternalStore(assinar, ler)
  const setTema = useCallback((t: Tema) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* localStorage indisponível — vale só até recarregar */
    }
    aplicarTema(t)
    ouvintes.forEach((f) => f())
  }, [])
  return { tema, setTema, alternar: () => setTema(ler() === 'escuro' ? 'claro' : 'escuro') }
}
