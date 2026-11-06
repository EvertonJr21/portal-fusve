import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { HOSPITAIS, type HospitalId } from '@/constants'
import { useRegistrarCobrancas } from '@/hooks/useHistOC'
import { useAtualizarOCsEmLote } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor } from '@/types'
import { gerarMensagemCobrancaLote, linkOutlookCompose, linkWhatsApp } from '@/utils/cobranca'
import { fmt, getHoje } from '@/utils/date'
import { agruparPorFornecedor, type LinhaOC } from '@/utils/ocLista'

interface CobrancaLoteProps {
  linhas: LinhaOC[]
  forns: Fornecedor[]
  hospitalId: HospitalId
  onClose: () => void
}

/**
 * Cobrança em lote (substitui a tela "Por Fornecedor", item 82): as OCs abertas
 * selecionadas são agrupadas por fornecedor e cada fornecedor recebe UMA mensagem
 * com todas as OCs dele. Um botão por fornecedor — abrir várias janelas de uma vez
 * seria barrado pelo bloqueador de pop-up do navegador.
 */
export function CobrancaLote({ linhas, forns, hospitalId, onClose }: CobrancaLoteProps) {
  const registrar = useRegistrarCobrancas()
  const atualizar = useAtualizarOCsEmLote(hospitalId)
  const toast = useToast()
  const hospitalNome = HOSPITAIS[hospitalId].nome

  const abertas = linhas.filter((l) => l.aberta)
  const fechadas = linhas.length - abertas.length
  const grupos = agruparPorFornecedor(abertas)
  const [enviados, setEnviados] = useState<Record<string, 'mail' | 'wpp'>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  const fornDe = (fornecedorId: number | null) => (fornecedorId ? forns.find((f) => f.id === fornecedorId) : undefined)
  const mensagem = (g: (typeof grupos)[number]) =>
    gerarMensagemCobrancaLote(
      g.fornecedorNome,
      g.linhas.map((l) => ({ oc: l.oc, prazoEntrega: l.avaliacao.dataPrometida })),
      hospitalNome,
    )

  const enviar = async (g: (typeof grupos)[number], canal: 'mail' | 'wpp') => {
    const forn = fornDe(g.fornecedorId)
    const contato = canal === 'mail' ? forn?.email : forn?.wpp
    if (!contato) return
    const msg = mensagem(g)
    if (canal === 'mail') {
      await navigator.clipboard.writeText(msg).catch(() => {})
      window.open(linkOutlookCompose(contato, `[${hospitalNome}] Cobrança — ${g.fornecedorNome}`), '_blank')
    } else {
      window.open(linkWhatsApp(contato, msg), '_blank')
    }
    setEnviando(g.chave)
    try {
      const ids = g.linhas.map((l) => l.oc.id)
      await registrar.mutateAsync(ids.map((ocId) => ({ ocId, canal, resposta: 'Cobrança em lote', tipo: 'lote' as const })))
      await atualizar.mutateAsync({ ids, patch: { cobrado: true, ultimaMovimentacao: fmt(getHoje()) } })
      setEnviados((e) => ({ ...e, [g.chave]: canal }))
      toast.show(
        canal === 'mail'
          ? `Mensagem copiada — cole no e-mail. Cobrança registrada em ${g.linhas.length} OC(s)`
          : `Cobrança registrada em ${g.linhas.length} OC(s)`,
      )
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao registrar cobrança', 'error')
    } finally {
      setEnviando(null)
    }
  }

  return (
    <Modal
      title={`Cobrar em lote — ${abertas.length} OC(s), ${grupos.length} fornecedor(es)`}
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500">
          Uma mensagem por fornecedor, com todas as OCs dele. No e-mail, a mensagem vai pra área de transferência — é só
          colar. A cobrança fica registrada no histórico de cada OC.
          {fechadas > 0 && ` ${fechadas} OC(s) já encerrada(s) da seleção ficaram de fora.`}
        </p>
        {grupos.length === 0 && <p className="text-sm text-slate-500">Nenhuma OC aberta na seleção.</p>}
        {grupos.map((g) => {
          const forn = fornDe(g.fornecedorId)
          const enviado = enviados[g.chave]
          return (
            <div key={g.chave} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{g.fornecedorNome}</p>
                  <p className="text-xs text-slate-500">
                    {g.linhas.length} OC(s){g.vencidas ? ` · ${g.vencidas} vencida(s)` : ''} ·{' '}
                    {g.linhas.map((l) => l.oc.id).join(', ')}
                  </p>
                  {!forn?.email && !forn?.wpp && (
                    <p className="text-xs text-status-amber">Sem e-mail/WhatsApp no cadastro de fornecedores.</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {enviado && <span className="text-xs font-medium text-status-green">✓ cobrado</span>}
                  <button
                    type="button"
                    className="text-xs text-blue-700 hover:underline"
                    onClick={() => setAberto((a) => (a === g.chave ? null : g.chave))}
                  >
                    {aberto === g.chave ? 'ocultar mensagem' : 'ver mensagem'}
                  </button>
                  <Button
                    variant="outline"
                    disabled={!forn?.email || enviando !== null}
                    loading={enviando === g.chave}
                    title={forn?.email || 'Fornecedor sem e-mail cadastrado'}
                    onClick={() => enviar(g, 'mail')}
                  >
                    ✉ E-mail
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!forn?.wpp || enviando !== null}
                    title={forn?.wpp || 'Fornecedor sem WhatsApp cadastrado'}
                    onClick={() => enviar(g, 'wpp')}
                  >
                    💬 WhatsApp
                  </Button>
                </div>
              </div>
              {aberto === g.chave && (
                <pre className="whitespace-pre-wrap border-t border-slate-100 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
                  {mensagem(g)}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
