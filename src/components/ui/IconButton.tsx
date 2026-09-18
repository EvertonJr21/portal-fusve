import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Também usado como aria-label — todo IconButton precisa de rótulo acessível, o ícone sozinho não basta. */
  title: string
  tone?: 'default' | 'danger'
}

const TONE_CLASS: Record<NonNullable<IconButtonProps['tone']>, string> = {
  default: 'border-slate-200 hover:bg-slate-100',
  danger: 'border-slate-200 text-status-red hover:bg-status-red-bg',
}

/** Botão de ação em linha de tabela — consolida o `<button className="rounded border ...">` que era reescrito à mão em várias tabelas do projeto. */
export function IconButton({ title, tone = 'default', className = '', disabled, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`rounded border px-1.5 py-1 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50 ${TONE_CLASS[tone]} ${className}`}
      {...props}
    />
  )
}
