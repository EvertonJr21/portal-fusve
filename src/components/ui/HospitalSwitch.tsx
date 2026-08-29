import { HOSPITAIS } from '@/constants'
import { useHospital } from '@/hooks/useHospital'

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
            hospitalId === h.id ? 'shadow-soft-sm' : 'hover:bg-white/60'
          }`}
          style={
            hospitalId === h.id
              ? { backgroundColor: h.cor, color: '#fff' }
              : { color: '#475569' }
          }
        >
          {h.sigla}
        </button>
      ))}
    </div>
  )
}
