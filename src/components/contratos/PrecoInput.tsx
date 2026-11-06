import { useState } from 'react'
import { campoClass } from '@/components/contratos/estilos'
import { formatarPrecoBR, parsePrecoBR } from '@/utils/contrato'

interface PrecoInputProps {
  valor: number
  onChange: (valor: number) => void
  inputRef?: React.Ref<HTMLInputElement>
}

/** Texto livre enquanto digita, formatado em R$ ao sair — evita o "0387,69" do input number. */
export function PrecoInput({ valor, onChange, inputRef }: PrecoInputProps) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`${campoClass} pl-8 text-right tabular-nums`}
        placeholder="0,00"
        value={rascunho ?? formatarPrecoBR(valor)}
        onFocus={() => setRascunho(formatarPrecoBR(valor))}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={() => {
          if (rascunho !== null) onChange(parsePrecoBR(rascunho))
          setRascunho(null)
        }}
      />
    </div>
  )
}

