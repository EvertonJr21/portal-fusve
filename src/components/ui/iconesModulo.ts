import { CalendarDays, ClipboardList, FileSignature, Stethoscope, type LucideIcon } from 'lucide-react'
import type { ModuloChave } from '@/constants'

/** Ícone de cada módulo — um só lugar, usado na tela inicial e no login (item 11 da revisão). */
export const ICONE_MODULO: Record<ModuloChave, LucideIcon> = {
  ocs: ClipboardList,
  pareceres: Stethoscope,
  contratos: FileSignature,
  opmes: CalendarDays,
}
