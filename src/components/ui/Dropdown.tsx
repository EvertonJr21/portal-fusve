import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const CloseCtx = createContext<() => void>(() => {})

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}

/** Menu "mais ações" — fecha ao clicar fora, ao pressionar Esc, ou ao escolher um item. */
export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickFora)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickFora)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <CloseCtx.Provider value={() => setOpen(false)}>
          <div
            role="menu"
            className={`absolute z-20 mt-1 min-w-[9rem] animate-scale-in rounded-lg border border-slate-200 bg-white py-1 shadow-soft-lg ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </div>
        </CloseCtx.Provider>
      )}
    </div>
  )
}

interface DropdownItemProps {
  onClick: () => void
  tone?: 'danger'
  children: ReactNode
}

export function DropdownItem({ onClick, tone, children }: DropdownItemProps) {
  const close = useContext(CloseCtx)
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick()
        close()
      }}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
        tone === 'danger' ? 'text-status-red hover:bg-status-red-bg' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}
