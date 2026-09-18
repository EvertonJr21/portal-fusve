import { HOSPITAIS, type HospitalId } from '@/constants'
import { useHospital } from '@/hooks/useHospital'

// Classes fixas (não geradas dinamicamente) pra Tailwind conseguir estaticamente
// detectar e gerar cada utilitário — nunca usar `bg-${h.id}` interpolado.
const ATIVO_CLASS: Record<HospitalId, string> = {
  huv: 'bg-huv text-white',
  mkr: 'bg-hmk text-white',
}

export function HospitalSwitch() {
  const { hospitalId, setHospitalId } = useHospital()

  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {Object.values(HOSPITAIS).map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => setHospitalId(h.id)}
          aria-pressed={hospitalId === h.id}
          className={`rounded-md px-3 py-1 text-sm font-semibold transition-all duration-150 ${
            hospitalId === h.id ? `${ATIVO_CLASS[h.id]} shadow-soft-sm` : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          {h.sigla}
        </button>
      ))}
    </div>
  )
}
