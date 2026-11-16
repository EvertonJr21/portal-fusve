import { Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BuscaPacienteOpme } from '@/components/opmes/BuscaPacienteOpme'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SearchFornecedor } from '@/components/ocs/SearchFornecedor'
import { HOSPITAIS, STATUS_OPME, type HospitalId } from '@/constants'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useContratos } from '@/hooks/useContratos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useExcluirOpme, useOpmes, useSalvarOpme } from '@/hooks/useOpmes'
import { useToast } from '@/hooks/useToast'
import type { Opme } from '@/types'
import { statusVigencia } from '@/utils/contrato'
import { ligarContratosFornecedores } from '@/utils/kpis'
import {
  acharPaciente,
  copiarDadosPaciente,
  pacientesDeOpmes,
  STATUS_OPME_LABEL,
  usoFornecedoresEmOpme,
  type PacienteOpme,
} from '@/utils/opme'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'

interface OpmeFormProps {
  opme: Opme | null
  hospitalIdPadrao: HospitalId
  dataCirurgiaPadrao?: string
  onClose: () => void
}

function novoOpme(hospitalId: HospitalId, dataCirurgia: string): Opme {
  return {
    id: crypto.randomUUID(),
    paciente: '',
    dataCirurgia,
    fornecedorId: null,
    hospitalId,
    status: 'pendente',
    observacao: '',
  }
}

const inputClass = 'rounded-md border border-slate-300 px-2 py-1.5 text-sm'
const labelClass = 'flex flex-col gap-1 text-sm'

export function OpmeForm({ opme, hospitalIdPadrao, dataCirurgiaPadrao, onClose }: OpmeFormProps) {
  const guarda = useGuardaSaida(onClose)
  const isNovo = !opme
  const [form, setForm] = useState<Opme>(opme ?? novoOpme(hospitalIdPadrao, dataCirurgiaPadrao ?? ''))
  const salvar = useSalvarOpme(form.hospitalId)
  const excluir = useExcluirOpme(form.hospitalId)
  const toast = useToast()
  const desfazer = useDesfazer()

  // Item 109: pacientes e fornecedores já usados nos OPMEs (dos dois hospitais) e fornecedores com contrato ativo.
  const { data: opmesHuv = [] } = useOpmes('huv')
  const { data: opmesMkr = [] } = useOpmes('mkr')
  const { data: contratosHuv = [] } = useContratos('huv')
  const { data: contratosMkr = [] } = useContratos('mkr')
  const { data: fornecedores = [] } = useFornecedores()
  const [sugestaoDispensada, setSugestaoDispensada] = useState<string | null>(null)

  const pacientes = useMemo(() => pacientesDeOpmes([...opmesHuv, ...opmesMkr], opme?.id), [opmesHuv, opmesMkr, opme?.id])
  const usoFornecedores = useMemo(() => usoFornecedoresEmOpme([...opmesHuv, ...opmesMkr]), [opmesHuv, opmesMkr])
  const comContrato = useMemo(() => {
    const ativos = [...contratosHuv, ...contratosMkr].filter((c) => c.status === 'Ativo' && statusVigencia(c) !== 'vencido')
    return new Set(ligarContratosFornecedores(ativos, fornecedores).porFornecedor.keys())
  }, [contratosHuv, contratosMkr, fornecedores])
  const nomeFornecedor = (id: number | null) => (id === null ? '' : (fornecedores.find((f) => f.id === id)?.nome ?? `cód. ${id}`))

  const aplicarPaciente = (p: PacienteOpme) => {
    const { opme: copiado, preenchidos } = copiarDadosPaciente({ ...form, paciente: p.nome }, p.ultimo)
    setForm(copiado)
    guarda.marcar()
    setSugestaoDispensada(p.chave)
    toast.show(preenchidos.length ? `Copiado da última cirurgia: ${preenchidos.join(' e ')}` : `Paciente ${p.nome} selecionado`)
  }

  // Paciente digitado que já tem OPME: oferece copiar o que ainda está vazio.
  const sugestao = (() => {
    if (!isNovo) return null
    const p = acharPaciente(pacientes, form.paciente)
    if (!p || p.chave === sugestaoDispensada) return null
    return copiarDadosPaciente(form, p.ultimo).preenchidos.length > 0 ? p : null
  })()

  const handleExcluir = async () => {
    if (!opme) return
    try {
      await excluir.mutateAsync(opme.id)
      desfazer(`OPME de ${opme.paciente} excluído`, 'opmes', opme.id, ['opmes', form.hospitalId])
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OPME', 'error')
    }
  }

  const handleSalvar = async () => {
    if (!form.paciente.trim()) {
      toast.show('Informe o nome do paciente', 'error')
      return
    }
    if (!form.dataCirurgia) {
      toast.show('Informe a data da cirurgia', 'error')
      return
    }
    try {
      await salvar.mutateAsync(form)
      toast.show(isNovo ? 'OPME cadastrado' : 'OPME atualizado')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar OPME', 'error')
    }
  }

  return (
    <Modal
      title={isNovo ? 'Novo OPME' : 'Editar OPME'}
      onClose={guarda.fechar}
      onInput={guarda.marcar}
      closeOnBackdrop={false}
      footer={
        <>
          {!isNovo && (
            <Button variant="outline" className="mr-auto text-status-red" onClick={handleExcluir} loading={excluir.isPending}>
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={guarda.fechar}>Cancelar</Button>
          <Button onClick={handleSalvar} loading={salvar.isPending}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className={labelClass}>
          <span>Paciente</span>
          <BuscaPacienteOpme
            value={form.paciente}
            onChange={(paciente) => setForm({ ...form, paciente })}
            pacientes={pacientes}
            nomeFornecedor={nomeFornecedor}
            onEscolher={aplicarPaciente}
            className={inputClass}
            autoFocus
          />
        </div>
        {sugestao && (
          <div className="flex flex-col gap-2 rounded-lg border border-status-blue/30 bg-status-blue-bg px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-700">
              <strong>{sugestao.nome}</strong> já tem {sugestao.opmes.length} cirurgia(s) com OPME — a última com{' '}
              {nomeFornecedor(sugestao.ultimo.fornecedorId) || 'fornecedor não definido'}. Copiar o que falta?
            </span>
            <span className="flex shrink-0 gap-2">
              <Button type="button" variant="ghost" onClick={() => setSugestaoDispensada(sugestao.chave)}>
                Agora não
              </Button>
              <Button type="button" onClick={() => aplicarPaciente(sugestao)}>
                <Copy className="h-4 w-4" /> Copiar dados
              </Button>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Data da cirurgia
            <input
              type="date"
              className={inputClass}
              value={form.dataCirurgia}
              onChange={(e) => setForm({ ...form, dataCirurgia: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Hospital
            <select
              className={inputClass}
              value={form.hospitalId}
              onChange={(e) => setForm({ ...form, hospitalId: e.target.value as HospitalId })}
            >
              {Object.values(HOSPITAIS).map((h) => (
                <option key={h.id} value={h.id}>{h.sigla}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={labelClass}>
            <span>Fornecedor</span>
            <SearchFornecedor
              value={form.fornecedorId}
              onChange={(fornecedorId) => setForm({ ...form, fornecedorId })}
              uso={usoFornecedores}
              comContrato={comContrato}
            />
          </div>
          <label className={labelClass}>
            Status
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Opme['status'] })}
            >
              {STATUS_OPME.map((s) => (
                <option key={s} value={s}>{STATUS_OPME_LABEL[s]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Observação
          <textarea
            className={inputClass}
            rows={2}
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          />
        </label>
      </div>
    </Modal>
  )
}
