import { useMemo, useState, type ReactNode } from 'react'
import { HOSPITAIS, type HospitalId } from '@/constants'
import { HospitalContext } from '@/hooks/useHospital'

const STORAGE_KEY = 'fusve:hospitalAtivo'

function hospitalInicial(): HospitalId {
  const salvo = localStorage.getItem(STORAGE_KEY)
  return salvo && salvo in HOSPITAIS ? (salvo as HospitalId) : 'huv'
}

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [hospitalId, setHospitalIdState] = useState<HospitalId>(hospitalInicial)

  const setHospitalId = (id: HospitalId) => {
    setHospitalIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const value = useMemo(() => ({ hospitalId, setHospitalId }), [hospitalId])

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}
