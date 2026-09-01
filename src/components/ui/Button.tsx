import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
  /** Mostra spinner e desabilita o botão — usar no lugar de `disabled={x.isPending}` manual. */
  loading?: boolean
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-700 text-white shadow-soft-sm hover:bg-blue-800 hover:shadow-soft-md',
  outline: 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function Button({ variant = 'primary', size = 'sm', loading = false, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
