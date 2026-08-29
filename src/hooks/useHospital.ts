import { createContext, useContext } from 'react'
import type { HospitalId } from '@/constants'

export interface HospitalContextValue {
  hospitalId: HospitalId
  setHospitalId: (id: HospitalId) => void
}

export const HospitalContext = createContext<HospitalContextValue | null>(null)

export function useHospital(): HospitalContextValue {
  const ctx = useContext(HospitalContext)
  if (!ctx) throw new Error('useHospital deve ser usado dentro de <HospitalProvider>')
  return ctx
}
