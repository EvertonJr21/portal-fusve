import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  AVISO_RENOVACAO_OPCOES,
  CAPACIDADE_PERIODOS,
  CLASSIFICACOES_CONTRATO,
  FRETE_TIPOS,
  HOSPITAIS,
  STATUS_CONTRATO,
  TIPOS_CONTRATO,
  type CapacidadePeriodo,
  type HospitalId,
} from '@/constants'
import { useContratoProdutos, useSalvarContrato, useSalvarProdutosContrato } from '@/hooks/useContratos'
import { useToast } from '@/hooks/useToast'
import type { ContratoHeader, ContratoProduto } from '@/types'
import { consultarCNPJ, formatarCNPJ } from '@/utils/cnpj'

interface ContratoFormProps {
  contrato: ContratoHeader | null
  hospitalIdPadrao: HospitalId
  onClose: () => void
}

function novoHeader(hospitalId: HospitalId): ContratoHeader {
  return {
    id: crypto.randomUUID(),
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
    vigenciaInicio: null,
    vigenciaFim: null,
    avisoRenovacaoDias: 60,
    renovacaoAutomatica: false,
    hospitalId,
    classificacao: '',
    observacoes: '',
  }
}

function novoProduto(contratoId: string): ContratoProduto {
  return {
    id: crypto.randomUUID(),
    contratoId,
    sku: '',
    descricao: '',
    codSoulmv: '',
    precoUnitario: 0,
    unidade: 'UNIDADE',
    moq: null,
    capacidadeFornecimento: null,
    capacidadePeriodo: 'mes',
    meioPagamento: '',
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

  if (!produtosInicializados && !carregandoProdutos) {
    setProdutos(produtosOriginais)
    setProdutosInicializados(true)
  }

  const salvarContrato = useSalvarContrato(header.hospitalId === 'ambos' ? hospitalIdPadrao : header.hospitalId)
  const salvarProdutos = useSalvarProdutosContrato()
  const toast = useToast()

  const set = <K extends keyof ContratoHeader>(key: K, value: ContratoHeader[K]) =>
    setHeader((prev) => ({ ...prev, [key]: value }))

  const setProduto = <K extends keyof ContratoProduto>(id: string, key: K, value: ContratoProduto[K]) =>
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)))

  const adicionarProduto = () => setProdutos((prev) => [...prev, novoProduto(header.id)])
  const removerProduto = (id: string) => setProdutos((prev) => prev.filter((p) => p.id !== id))

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
      toast.show(isNovo ? 'Contrato cadastrado!' : 'Contrato atualizado!')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar contrato', 'error')
    }
  }

  const salvando = salvarContrato.isPending || salvarProdutos.isPending

  return (
    <Modal
      title={isNovo ? 'Novo Contrato' : `Editar Contrato — ${header.fornecedorNome}`}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="contrato-form" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar contrato'}
          </Button>
        </>
      }
    >
      <form id="contrato-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Cabeçalho */}
        <section>
          <h4 className={sectionTitleClass}>Cabeçalho</h4>
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
                <input type="text" className={`${inputClass} flex-1`} value={header.fornecedorCnpj} onChange={(e) => set('fornecedorCnpj', e.target.value)} placeholder="00.000.000/0000-00" />
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

        {/* Produtos */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className={sectionTitleClass}>Produtos</h4>
            <Button type="button" variant="outline" onClick={adicionarProduto}>
              + Produto
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-max text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 text-left">SKU</th>
                  <th className="px-2 py-1.5 text-left">Cód. SoulMV</th>
                  <th className="px-2 py-1.5 text-left">Descrição *</th>
                  <th className="px-2 py-1.5 text-left">Preço</th>
                  <th className="px-2 py-1.5 text-left">Unidade</th>
                  <th className="px-2 py-1.5 text-left">MOQ</th>
                  <th className="px-2 py-1.5 text-left">Capacidade</th>
                  <th className="px-2 py-1.5 text-left">Período</th>
                  <th className="px-2 py-1.5 text-left">Pagamento</th>
                  <th className="px-2 py-1.5 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-2 py-4 text-center text-slate-400">
                      Nenhum produto adicionado.
                    </td>
                  </tr>
                )}
                {produtos.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-1 py-1"><input className="w-20 rounded border border-slate-200 px-1 py-1" value={p.sku} onChange={(e) => setProduto(p.id, 'sku', e.target.value)} /></td>
                    <td className="px-1 py-1"><input className="w-20 rounded border border-slate-200 px-1 py-1" value={p.codSoulmv} onChange={(e) => setProduto(p.id, 'codSoulmv', e.target.value)} /></td>
                    <td className="px-1 py-1"><input className="w-40 rounded border border-slate-200 px-1 py-1" value={p.descricao} onChange={(e) => setProduto(p.id, 'descricao', e.target.value)} /></td>
                    <td className="px-1 py-1"><input type="number" step="0.01" className="w-20 rounded border border-slate-200 px-1 py-1" value={p.precoUnitario} onChange={(e) => setProduto(p.id, 'precoUnitario', Number(e.target.value) || 0)} /></td>
                    <td className="px-1 py-1"><input className="w-20 rounded border border-slate-200 px-1 py-1" value={p.unidade} onChange={(e) => setProduto(p.id, 'unidade', e.target.value)} /></td>
                    <td className="px-1 py-1"><input type="number" className="w-16 rounded border border-slate-200 px-1 py-1" value={p.moq ?? ''} onChange={(e) => setProduto(p.id, 'moq', e.target.value ? Number(e.target.value) : null)} /></td>
                    <td className="px-1 py-1"><input type="number" className="w-16 rounded border border-slate-200 px-1 py-1" value={p.capacidadeFornecimento ?? ''} onChange={(e) => setProduto(p.id, 'capacidadeFornecimento', e.target.value ? Number(e.target.value) : null)} /></td>
                    <td className="px-1 py-1">
                      <select className="rounded border border-slate-200 px-1 py-1" value={p.capacidadePeriodo} onChange={(e) => setProduto(p.id, 'capacidadePeriodo', e.target.value as CapacidadePeriodo)}>
                        {CAPACIDADE_PERIODOS.map((per) => (
                          <option key={per} value={per}>{per === 'mes' ? '/mês' : '/semana'}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1"><input className="w-24 rounded border border-slate-200 px-1 py-1" value={p.meioPagamento} onChange={(e) => setProduto(p.id, 'meioPagamento', e.target.value)} /></td>
                    <td className="px-1 py-1">
                      <button type="button" onClick={() => removerProduto(p.id)} className="text-status-red hover:underline">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Comercial */}
        <section>
          <h4 className={sectionTitleClass}>Condições Comerciais e Renovação</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
      </form>
    </Modal>
  )
}
