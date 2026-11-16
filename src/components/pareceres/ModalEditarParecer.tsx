import { Modal } from '@/components/ui/Modal'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import type { Parecer } from '@/types'
import { ParecerForm } from './ParecerForm'

/** Modal de edição do parecer — usado na Base de Pareceres e na página do parecer. */
export function ModalEditarParecer({ parecer, onClose }: { parecer: Parecer; onClose: () => void }) {
  const guarda = useGuardaSaida(onClose)
  return (
    <Modal title={`Editar Parecer — ${parecer.cod}`} onClose={guarda.fechar} onInput={guarda.marcar} closeOnBackdrop={false}>
      <ParecerForm produto={{ cod: parecer.cod, nome: parecer.nome, cat: parecer.cat }} parecerExistente={parecer} onSalvo={onClose} />
    </Modal>
  )
}
