import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as parecerRepository from '@/repositories/parecerRepository'
import type { Parecer } from '@/types'
import { abrirPdfDataUrl } from '@/utils/pdfDataUrl'

/** Adaptador React pro `parecerRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function usePareceres() {
  return useQuery({
    queryKey: ['pareceres'],
    queryFn: parecerRepository.listarPareceres,
  })
}

export function useParecer(cod: string | null) {
  return useQuery({
    queryKey: ['parecer', cod],
    enabled: !!cod,
    queryFn: () => parecerRepository.buscarParecer(cod as string),
  })
}

export function useSalvarParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerRepository.salvarParecer,
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
      queryClient.invalidateQueries({ queryKey: ['parecer', p.cod] })
    },
  })
}

export function useExcluirParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerRepository.excluirParecer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
    },
  })
}

/** Envia um PDF novo pro Storage — usado pelo `ParecerForm` antes de salvar. */
export function useUploadPdfParecer() {
  return useMutation({
    mutationFn: ({ cod, file }: { cod: string; file: File }) => parecerRepository.uploadPdf(cod, file),
  })
}

/** URL assinada temporária pra abrir/baixar um PDF já salvo no Storage. */
export function useObterUrlPdfParecer() {
  return useMutation({
    mutationFn: (path: string) => parecerRepository.obterUrlAssinadaPdf(path),
  })
}

/**
 * Abre o PDF de um parecer numa nova aba, preferindo `pdfPath` (Storage) e caindo
 * pro `pdfDataUrl` legado (base64) só pra pareceres que ainda não migraram — ver
 * nota em `parecerRepository.ts`. Centraliza essa escolha pra não duplicar em
 * `ParecerCard`/`Base.tsx`.
 */
export function useAbrirPdfParecer() {
  const obterUrl = useObterUrlPdfParecer()
  const abrir = async (p: Pick<Parecer, 'pdfPath' | 'pdfDataUrl'>) => {
    if (p.pdfPath) {
      const url = await obterUrl.mutateAsync(p.pdfPath)
      window.open(url, '_blank', 'noopener')
    } else if (p.pdfDataUrl) {
      abrirPdfDataUrl(p.pdfDataUrl)
    }
  }
  return { abrir, isPending: obterUrl.isPending }
}
