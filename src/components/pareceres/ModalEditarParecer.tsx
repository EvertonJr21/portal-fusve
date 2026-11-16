import { Modal } from '@/components/ui/Modal'
import type { Produto } from '@/data/produtos'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import type { Parecer } from '@/types'
import { ParecerForm } from './ParecerForm'

interface ModalEditarParecerProps {
  /** Parecer existente; `null` cadastra um novo para `produto`. */
  parecer: Parecer | null
  /** Obrigatório quando `parecer` é `null`. */
  produto?: Produto
  onClose: () => void
}

/** Modal de cadastro/edição do parecer — usado na Base, na página do parecer e na página do produto. */
export function ModalEditarParecer({ parecer, produto, onClose }: ModalEditarParecerProps) {
  const guarda = useGuardaSaida(onClose)
  const alvo = parecer ? { cod: parecer.cod, nome: parecer.nome, cat: parecer.cat } : produto
  if (!alvo) return null
  return (
    <Modal
      title={`${parecer ? 'Editar' : 'Cadastrar'} parecer — ${alvo.cod}`}
      onClose={guarda.fechar}
      onInput={guarda.marcar}
      closeOnBackdrop={false}
    >
      <ParecerForm produto={alvo} parecerExistente={parecer} onSalvo={onClose} />
    </Modal>
  )
}
