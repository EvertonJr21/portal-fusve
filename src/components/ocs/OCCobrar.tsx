import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { HOSPITAIS, type HospitalId } from '@/constants'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useRegistrarCobranca } from '@/hooks/useHistOC'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor, OC, Solicitacao } from '@/types'
import { fmt, getHoje, parseDMY } from '@/utils/date'
import { gerarMensagemCobranca, linkOutlookCompose, linkWhatsApp } from '@/utils/cobranca'

interface OCCobrarProps {
  oc: OC
  sols: Solicitacao[]
  forn: Fornecedor | undefined
  hospitalId: HospitalId
  canalInicial: 'mail' | 'wpp'
  onClose: () => void
}

export function OCCobrar({ oc, sols, forn, hospitalId, canalInicial, onClose }: OCCobrarProps) {
  const atualizar = useAtualizarOC(hospitalId)
  const registrar = useRegistrarCobranca()
  const toast = useToast()

  const hospitalNome = HOSPITAIS[hospitalId].nome
  const [corpo, setCorpo] = useState(() => gerarMensagemCobranca(oc, sols, hospitalNome))
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const registrarEFechar = async (canal: 'mail' | 'wpp') => {
    setEnviando(true)
    try {
      await registrar.mutateAsync({ ocId: oc.id, canal, resposta, tipo: 'individual' })

      let previsaoDescumprida = oc.previsaoDescumprida
      if (oc.previsaoForn && !oc.dataEntregaReal) {
        const d = parseDMY(oc.previsaoForn)
        previsaoDescumprida = !!d && d < getHoje()
      }

      await atualizar.mutateAsync({
        id: oc.id,
        patch: { cobrado: true, ultimaMovimentacao: fmt(getHoje()), previsaoDescumprida },
      })
      toast.show(`Cobrança registrada — OC ${oc.id}`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao registrar cobrança', 'error')
    } finally {
      setEnviando(false)
    }
  }

  const enviarEmail = async () => {
    if (!forn?.email) {
      toast.show('Fornecedor sem e-mail cadastrado', 'warn')
      return
    }
    try {
      await navigator.clipboard.writeText(corpo)
      toast.show('Mensagem copiada — cole no corpo do e-mail')
    } catch {
      // clipboard pode falhar sem permissão; segue mesmo assim
    }
    window.open(linkOutlookCompose(forn.email, `[${hospitalNome}] Cobrança — OC nº ${oc.id}`), '_blank')
    await registrarEFechar('mail')
  }

  const enviarWhatsApp = async () => {
    if (!forn?.wpp) {
      toast.show('Fornecedor sem WhatsApp cadastrado', 'warn')
      return
    }
    window.open(linkWhatsApp(forn.wpp, corpo), '_blank')
    await registrarEFechar('wpp')
  }

  return (
    <Modal
      title={`Cobrar fornecedor — OC ${oc.id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={canalInicial === 'mail' ? 'primary' : 'outline'}
            onClick={enviarEmail}
            disabled={enviando || !forn?.email}
            title={forn?.email || 'Cadastre e-mail do fornecedor'}
          >
            ✉ E-mail
          </Button>
          <Button
            variant={canalInicial === 'wpp' ? 'primary' : 'outline'}
            onClick={enviarWhatsApp}
            disabled={enviando || !forn?.wpp}
            title={forn?.wpp || 'Cadastre WhatsApp do fornecedor'}
          >
            💬 WhatsApp
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500">
          {forn?.email && <>E-mail: {forn.email}. </>}
          {forn?.wpp && <>WhatsApp: {forn.wpp}.</>}
          {!forn?.email && !forn?.wpp && 'Nenhum contato cadastrado para este fornecedor.'}
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Mensagem</span>
          <textarea
            className="h-56 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Observação (fica no histórico)</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </div>
    </Modal>
  )
}
