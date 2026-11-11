import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DesempenhoDoFornecedor } from '@/components/contratos/DesempenhoDoFornecedor'
import { HistoricoAlteracoes } from '@/components/ui/HistoricoAlteracoes'
import { Modal } from '@/components/ui/Modal'
import {
  AVISO_RENOVACAO_OPCOES,
  CLASSIFICACOES_CONTRATO,
  FRETE_TIPOS,
  HOSPITAIS,
  STATUS_CONTRATO,
  TIPOS_CONTRATO,
  type HospitalId,
} from '@/constants'
import { ComodatosContratoEditor } from '@/components/contratos/ComodatosContratoEditor'
import { ProdutosContratoEditor } from '@/components/contratos/ProdutosContratoEditor'
import {
  useAbrirPdfContrato,
  useContratoComodatos,
  useDefinirPdfContrato,
  useContratoProdutos,
  useSalvarComodatosContrato,
  useSalvarContrato,
  useSalvarProdutosContrato,
} from '@/hooks/useContratos'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/hooks/useToast'
import type { ContratoComodato, ContratoHeader, ContratoProduto } from '@/types'
import { consultarCNPJ, formatarCNPJ } from '@/utils/cnpj'

interface ContratoFormProps {
  contrato: ContratoHeader | null
  hospitalIdPadrao: HospitalId
  onClose: () => void
}

function novoHeader(hospitalId: HospitalId): ContratoHeader {
  return {
    id: crypto.randomUUID(),
    titulo: '',
    tipo: 'Contrato',
    status: 'Ativo',
    fornecedorNome: '',
    fornecedorCnpj: '',
    contatoNome: '',
    contatoEmail: '',
    contatoWhatsapp: '',
    freteTipo: '',
    prazoMedioDias: null,
    origemEmbarque: '',
    toleranciaAtrasoDias: null,
    horarioCutoff: '',
    gatilhoDesconto: '',
    reajusteRegra: '',
    condicaoPagamento: '',
    vigenciaInicio: null,
    vigenciaFim: null,
    avisoRenovacaoDias: 60,
    renovacaoAutomatica: false,
    hospitalId,
    classificacao: '',
    observacoes: '',
  }
}

const inputClass = 'rounded-md border border-slate-300 px-2 py-1.5 text-sm'
const labelClass = 'flex flex-col gap-1 text-sm'
const sectionTitleClass = 'mb-2 text-xs font-bold uppercase tracking-wide text-slate-400'

export function ContratoForm({ contrato, hospitalIdPadrao, onClose }: ContratoFormProps) {
  const isNovo = !contrato
  const [header, setHeader] = useState<ContratoHeader>(contrato ?? novoHeader(hospitalIdPadrao))
  const { data: produtosOriginais = [], isLoading: carregandoProdutos } = useContratoProdutos(contrato?.id ?? null)
  const [produtos, setProdutos] = useState<ContratoProduto[]>([])
  const [produtosInicializados, setProdutosInicializados] = useState(isNovo)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [headerInicial] = useState(() => JSON.stringify(header))
  const confirmar = useConfirm()

  if (!produtosInicializados && !carregandoProdutos) {
    setProdutos(produtosOriginais)
    setProdutosInicializados(true)
  }

  const {
    data: comodatosOriginais = [],
    isLoading: carregandoComodatos,
    error: erroComodatos,
  } = useContratoComodatos(contrato?.id ?? null)
  const [comodatos, setComodatos] = useState<ContratoComodato[]>([])
  const [comodatosInicializados, setComodatosInicializados] = useState(isNovo)
  if (!comodatosInicializados && !carregandoComodatos) {
    setComodatos(comodatosOriginais)
    setComodatosInicializados(true)
  }

  const salvarContrato = useSalvarContrato(header.hospitalId === 'ambos' ? hospitalIdPadrao : header.hospitalId)
  const salvarProdutos = useSalvarProdutosContrato()
  const salvarComodatos = useSalvarComodatosContrato()
  const definirPdf = useDefinirPdfContrato(header.hospitalId === 'ambos' ? hospitalIdPadrao : header.hospitalId)
  const abrirPdf = useAbrirPdfContrato()
  const [pdfNovo, setPdfNovo] = useState<File | null>(null)
  const [pdfRemover, setPdfRemover] = useState(false)
  const toast = useToast()

  const set = <K extends keyof ContratoHeader>(key: K, value: ContratoHeader[K]) =>
    setHeader((prev) => ({ ...prev, [key]: value }))

  const buscarCnpj = async () => {
    setBuscandoCnpj(true)
    try {
      const dados = await consultarCNPJ(header.fornecedorCnpj)
      set('fornecedorNome', header.fornecedorNome || dados.razaoSocial)
      set('fornecedorCnpj', formatarCNPJ(header.fornecedorCnpj))
      toast.show(`Encontrado: ${dados.razaoSocial}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao consultar CNPJ', 'warn')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!header.fornecedorNome.trim()) {
      toast.show('Nome do fornecedor é obrigatório', 'warn')
      return
    }
    try {
      await salvarContrato.mutateAsync(header)
      await salvarProdutos.mutateAsync({
        contratoId: header.id,
        produtosAtuais: produtos.filter((p) => p.descricao.trim()),
        produtosOriginais,
      })
      const comodatosValidos = comodatos.filter((c) => c.equipamento.trim())
      if (comodatosValidos.length || comodatosOriginais.length) {
        await salvarComodatos.mutateAsync({ contratoId: header.id, atuais: comodatosValidos, originais: comodatosOriginais })
      }
      // PDF por último e à parte: se a migration do PDF ainda não rodou, o contrato já está salvo.
      if (pdfNovo || pdfRemover) {
        try {
          await definirPdf.mutateAsync({ contratoId: header.id, file: pdfNovo })
        } catch (err) {
          toast.show(`Contrato salvo, mas o PDF não foi gravado: ${err instanceof Error ? err.message : 'erro'}`, 'warn')
          onClose()
          return
        }
      }
      toast.show(isNovo ? 'Contrato cadastrado!' : 'Contrato atualizado!')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar contrato', 'error')
    }
  }

  const salvando = salvarContrato.isPending || salvarProdutos.isPending || salvarComodatos.isPending || definirPdf.isPending
  const alterado =
    JSON.stringify(header) !== headerInicial ||
    !!pdfNovo ||
    pdfRemover ||
    (produtosInicializados && JSON.stringify(produtos) !== JSON.stringify(produtosOriginais)) ||
    (comodatosInicializados && JSON.stringify(comodatos) !== JSON.stringify(comodatosOriginais))

  const fechar = async () => {
    if (
      alterado &&
      !(await confirmar({
        message: 'Você tem alterações não salvas neste contrato. Sair sem salvar?',
        tone: 'danger',
        confirmLabel: 'Descartar alterações',
      }))
    )
      return
    onClose()
  }

  return (
    <Modal
      title={isNovo ? 'Novo Contrato' : `Editar Contrato — ${[header.titulo.trim(), header.fornecedorNome].filter(Boolean).join(' · ')}`}
      onClose={fechar}
      size="xl"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button form="contrato-form" type="submit" loading={salvando}>
            Salvar contrato
          </Button>
        </>
      }
    >
      <form id="contrato-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Cabeçalho */}
        <section>
          <h4 className={sectionTitleClass}>Cabeçalho</h4>
          <label className={`${labelClass} mb-3`}>
            <span className="font-medium text-slate-700">Título do contrato/acordo</span>
            <input
              type="text"
              className={inputClass}
              value={header.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Ex.: Stent coronário, Cateter balão — diferencia acordos do mesmo fornecedor"
              autoFocus={isNovo}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Tipo</span>
              <select className={inputClass} value={header.tipo} onChange={(e) => set('tipo', e.target.value as ContratoHeader['tipo'])}>
                {TIPOS_CONTRATO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Status</span>
              <select className={inputClass} value={header.status} onChange={(e) => set('status', e.target.value as ContratoHeader['status'])}>
                {STATUS_CONTRATO.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Hospital</span>
              <select className={inputClass} value={header.hospitalId} onChange={(e) => set('hospitalId', e.target.value as ContratoHeader['hospitalId'])}>
                <option value="ambos">Ambos</option>
                {Object.values(HOSPITAIS).map((h) => (
                  <option key={h.id} value={h.id}>{h.sigla}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Classificação</span>
              <select className={inputClass} value={header.classificacao} onChange={(e) => set('classificacao', e.target.value)}>
                <option value="">—</option>
                {CLASSIFICACOES_CONTRATO.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Vigência início</span>
              <input type="date" className={inputClass} value={header.vigenciaInicio ?? ''} onChange={(e) => set('vigenciaInicio', e.target.value || null)} />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Vigência fim</span>
              <input type="date" className={inputClass} value={header.vigenciaFim ?? ''} onChange={(e) => set('vigenciaFim', e.target.value || null)} />
            </label>
          </div>
        </section>

        {/* Fornecedor */}
        <section>
          <h4 className={sectionTitleClass}>Fornecedor</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className={`${labelClass} md:col-span-2`}>
              <span className="font-medium text-slate-700">Nome / Razão Social *</span>
              <input type="text" className={inputClass} value={header.fornecedorNome} onChange={(e) => set('fornecedorNome', e.target.value)} required />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">CNPJ</span>
              <div className="flex gap-1">
                <input type="text" className={`${inputClass} min-w-0 flex-1`} value={header.fornecedorCnpj} onChange={(e) => set('fornecedorCnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                <Button type="button" variant="outline" onClick={buscarCnpj} disabled={buscandoCnpj || !header.fornecedorCnpj}>
                  {buscandoCnpj ? '…' : '🔍'}
                </Button>
              </div>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Contato — Nome</span>
              <input type="text" className={inputClass} value={header.contatoNome} onChange={(e) => set('contatoNome', e.target.value)} />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Contato — E-mail</span>
              <input type="email" className={inputClass} value={header.contatoEmail} onChange={(e) => set('contatoEmail', e.target.value)} />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Contato — WhatsApp</span>
              <input type="text" className={inputClass} value={header.contatoWhatsapp} onChange={(e) => set('contatoWhatsapp', e.target.value)} placeholder="55 24 999999999" />
            </label>
          </div>
        </section>

        {/* Logística */}
        <section>
          <h4 className={sectionTitleClass}>Logística</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Frete</span>
              <select className={inputClass} value={header.freteTipo} onChange={(e) => set('freteTipo', e.target.value as ContratoHeader['freteTipo'])}>
                <option value="">—</option>
                {FRETE_TIPOS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Prazo médio (dias)</span>
              <input type="number" className={inputClass} value={header.prazoMedioDias ?? ''} onChange={(e) => set('prazoMedioDias', e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Origem / embarque</span>
              <input type="text" className={inputClass} value={header.origemEmbarque} onChange={(e) => set('origemEmbarque', e.target.value)} placeholder="Cidade/UF" />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Tolerância de atraso (dias)</span>
              <input type="number" className={inputClass} value={header.toleranciaAtrasoDias ?? ''} onChange={(e) => set('toleranciaAtrasoDias', e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Horário cut-off</span>
              <input type="time" className={inputClass} value={header.horarioCutoff} onChange={(e) => set('horarioCutoff', e.target.value)} />
            </label>
          </div>
        </section>

        <ProdutosContratoEditor contratoId={header.id} produtos={produtos} onChange={setProdutos} />

        <ComodatosContratoEditor
          contratoId={header.id}
          comodatos={comodatos}
          onChange={setComodatos}
          erro={erroComodatos ? erroComodatos.message : null}
        />

        {/* Comercial */}
        <section>
          <h4 className={sectionTitleClass}>Condições Comerciais e Renovação</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Condição de pagamento</span>
              <input type="text" className={inputClass} value={header.condicaoPagamento} onChange={(e) => set('condicaoPagamento', e.target.value)} placeholder="Ex.: Boleto 28 dias" />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Gatilho de desconto</span>
              <input type="text" className={inputClass} value={header.gatilhoDesconto} onChange={(e) => set('gatilhoDesconto', e.target.value)} placeholder="Ex.: Acima de 5.000un, preço cai 5%" />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Regra de reajuste</span>
              <input type="text" className={inputClass} value={header.reajusteRegra} onChange={(e) => set('reajusteRegra', e.target.value)} placeholder="Ex.: Anual pelo IPCA" />
            </label>
            <label className={labelClass}>
              <span className="font-medium text-slate-700">Aviso de renovação (dias antes)</span>
              <select className={inputClass} value={header.avisoRenovacaoDias} onChange={(e) => set('avisoRenovacaoDias', Number(e.target.value))}>
                {AVISO_RENOVACAO_OPCOES.map((d) => (
                  <option key={d} value={d}>{d} dias</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
              <input type="checkbox" checked={header.renovacaoAutomatica} onChange={(e) => set('renovacaoAutomatica', e.target.checked)} />
              <span className="font-medium text-slate-700">Renovação automática</span>
            </label>
          </div>
          <label className={`${labelClass} mt-3`}>
            <span className="font-medium text-slate-700">Observações</span>
            <textarea className={`${inputClass} h-20`} value={header.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
          </label>
        </section>

        {/* Contrato assinado (PDF) — item 98 */}
        <section>
          <h4 className={sectionTitleClass}>Contrato assinado (PDF)</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {pdfNovo || (header.pdfPath && !pdfRemover) ? 'Trocar arquivo' : 'Anexar PDF'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  setPdfNovo(e.target.files?.[0] ?? null)
                  setPdfRemover(false)
                  e.target.value = ''
                }}
              />
            </label>
            {pdfNovo ? (
              <span className="text-xs text-slate-600">{pdfNovo.name} — será enviado ao salvar</span>
            ) : header.pdfPath && !pdfRemover ? (
              <>
                <button type="button" className="text-xs font-medium text-blue-700 hover:underline" onClick={() => abrirPdf.mutate(header.pdfPath as string)}>
                  {header.pdfNome || 'Abrir PDF'}
                </button>
                <button type="button" className="text-xs text-status-red hover:underline" onClick={() => setPdfRemover(true)}>
                  remover
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">{pdfRemover ? 'O PDF será desvinculado ao salvar.' : 'Nenhum arquivo anexado.'}</span>
            )}
          </div>
        </section>

        {!isNovo && contrato && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DesempenhoDoFornecedor contrato={contrato} />
            <HistoricoAlteracoes tabela="contratos" registroId={contrato.id} limite={12} />
          </section>
        )}
      </form>
    </Modal>
  )
}
