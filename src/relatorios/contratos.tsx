import { Circle, Document, Line, Page, pdf, Polygon, Rect, Svg, Text, View } from '@react-pdf/renderer'
import { HOSPITAIS, type HospitalId } from '@/constants'
import type { ContratoComodato, ContratoHeader, ContratoProduto } from '@/types'
import {
  dataCurta,
  eixoTempo,
  fraseCarteira,
  marcasDeMes,
  ROTULO_FAIXA,
  ROTULO_UNIDADE,
  textoDias,
  type Carteira,
  type FaixaPrazo,
  type LinhaCarteira,
} from '@/utils/carteiraContratos'
import { marcosVigencia, pontosDeAtencaoContrato, statusVigencia, textoVigencia } from '@/utils/contrato'
import { fmt, getHoje } from '@/utils/date'
import {
  Barra,
  CabecalhoTabela,
  CaixaAtencao,
  CaixaNumero,
  Campos,
  COR,
  est,
  LinhaTabela,
  Rodape,
  Secao,
  Selo,
  type ColunaTabela,
} from './identidade'

/**
 * Relatórios de contratos em PDF (itens 110–112), no padrão visual da FUSVE
 * (`identidade.tsx`). Carregado sob demanda — só quando alguém pede o PDF.
 */

const FUSVE_NOME = 'FUSVE — Fundação Educacional Severino Sombra'
const FUSVE_CNPJ = '32.410.037/0001-84'
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const COR_FAIXA: Record<FaixaPrazo, string> = {
  vencido: '#5E1416',
  critico: COR.vinho,
  atencao: '#C27C0E',
  normal: COR.azul,
  sem_data: COR.suave,
}

const dataBR = (iso: string | null) => {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}
const ou = (v: string | number | null | undefined, sufixo = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${sufixo}`)
const nomeUnidade = (h: ContratoHeader['hospitalId']) => (h === 'ambos' ? 'HUV e HMK' : HOSPITAIS[h].sigla)

function corVigencia(c: ContratoHeader): string {
  const s = statusVigencia(c)
  return s === 'vencido' || s === 'critico' ? COR.vinho : s === 'atencao' ? COR.ambar : s === 'ok' ? COR.verdeEscuro : COR.suave
}

// ───────────────────────── Resumo de um contrato ─────────────────────────

export interface DadosResumoContrato {
  contrato: ContratoHeader
  produtos: ContratoProduto[]
  comodatos: ContratoComodato[]
}

/** Linha do tempo da vigência de um contrato: início, decidir renovação, hoje, término. */
function LinhaVigencia({ c, largura }: { c: ContratoHeader; largura: number }) {
  const m = marcosVigencia(c, getHoje())
  if (!m.inicio || !m.fim || m.pctDecorrido === null) return <Text style={{ fontSize: 8.5, color: COR.suave }}>Vigência sem datas de início e término.</Text>
  const x0 = 6
  const x1 = largura - 6
  const pos = (d: Date) => x0 + Math.min(1, Math.max(0, (d.getTime() - m.inicio!.getTime()) / (m.fim!.getTime() - m.inicio!.getTime()))) * (x1 - x0)
  const xh = pos(getHoje())
  const xa = m.avisoEm && m.avisoEm > m.inicio ? pos(m.avisoEm) : null
  return (
    <View>
      <Svg width={largura} height={30}>
        <Rect x={x0} y={14} width={x1 - x0} height={4} rx={2} fill={COR.fio} />
        {m.pctDecorrido > 0 ? <Rect x={x0} y={14} width={xh - x0} height={4} rx={2} fill={corVigencia(c)} /> : null}
        {xa !== null ? <Polygon points={`${xa},11 ${xa - 4},4 ${xa + 4},4`} fill={COR.ambar} /> : null}
        <Circle cx={x0} cy={16} r={4} fill="#fff" stroke={COR.azul} strokeWidth={1.5} />
        <Circle cx={x1} cy={16} r={4} fill="#fff" stroke={COR.azul} strokeWidth={1.5} />
        {m.pctDecorrido > 0 && m.pctDecorrido < 100 ? <Circle cx={xh} cy={16} r={3} fill={COR.tinta} /> : null}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 7.5, color: COR.suave }}>{`Início ${fmt(m.inicio)}`}</Text>
        <Text style={{ fontSize: 7.5, color: COR.ambar, fontWeight: 600 }}>
          {m.avisoEm ? `Decidir a renovação até ${fmt(m.avisoEm)}` : ''}
          <Text style={{ color: COR.suave, fontWeight: 400 }}>{`   ·   ${m.pctDecorrido}% da vigência decorrida (${m.duracaoDias} dias)`}</Text>
        </Text>
        <Text style={{ fontSize: 7.5, color: COR.suave }}>{`Término ${fmt(m.fim)}`}</Text>
      </View>
    </View>
  )
}

const COLUNAS_PRODUTOS: ColunaTabela[] = [
  { titulo: '#', largura: 24, direita: true },
  { titulo: 'Código', largura: 56 },
  { titulo: 'Descrição' },
  { titulo: 'Unidade', largura: 64 },
  { titulo: 'Preço unit.', largura: 72, direita: true },
  { titulo: 'Ped. mín.', largura: 54, direita: true },
  { titulo: 'Capacidade', largura: 66, direita: true },
]

const COLUNAS_COMODATOS: ColunaTabela[] = [
  { titulo: 'Equipamento' },
  { titulo: 'Fabricante / modelo', largura: 130 },
  { titulo: 'Série / patrimônio', largura: 110 },
  { titulo: 'Qtd.', largura: 34, direita: true },
  { titulo: 'Local', largura: 90 },
  { titulo: 'Instalação', largura: 62 },
  { titulo: 'Valor est.', largura: 72, direita: true },
]

function ResumoContrato({ contrato: c, produtos, comodatos }: DadosResumoContrato) {
  const nome = c.titulo || c.fornecedorNome
  const tipoDoc = c.tipo === 'Acordo Comercial' ? 'Resumo executivo de acordo comercial' : 'Resumo executivo de contrato'
  const semPreco = produtos.filter((p) => !p.precoUnitario).length
  const qtdComodato = comodatos.reduce((s, x) => s + x.quantidade, 0)
  const valorComodato = comodatos.reduce((s, x) => s + (x.valorEstimado ?? 0) * x.quantidade, 0)
  const m = marcosVigencia(c, getHoje())
  const pontos = pontosDeAtencaoContrato(c, { produtos, temPdfAssinado: !!c.pdfPath })
  const temAlto = pontos.some((p) => p.nivel === 'alto')
  const ordenados = [...produtos].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR', { numeric: true }))
  const resumo =
    `${c.tipo === 'Acordo Comercial' ? 'Acordo comercial' : 'Contrato'} com ${c.fornecedorNome}` +
    `${produtos.length ? `, com ${produtos.length} produto${produtos.length === 1 ? '' : 's'} de referência de preço` : ''}. ` +
    (c.vigenciaFim ? `A vigência vai até ${dataBR(c.vigenciaFim)} (${textoVigencia(c.vigenciaFim).toLowerCase()})` : 'O contrato não tem data de término cadastrada') +
    (m.avisoEm ? ` e a decisão sobre a renovação ${m.avisoEm < getHoje() ? 'deveria ter sido tomada' : 'deve ser tomada'} até ${fmt(m.avisoEm)}.` : '.') +
    (qtdComodato ? ` Há ${qtdComodato} equipamento${qtdComodato === 1 ? '' : 's'} em comodato vinculado${qtdComodato === 1 ? '' : 's'} a este contrato.` : '')

  return (
    <Document title={`${tipoDoc} — ${nome}`} author="FUSVE · Setor de Compras">
      {/* Página 1 — capa-resumo */}
      <Page size="A4" orientation="landscape" style={[est.pagina, { flexDirection: 'row' }]}>
        <Barra texto={`${tipoDoc} · Setor de Compras`} />
        <View style={{ width: 236, backgroundColor: COR.azul, paddingHorizontal: 20, paddingTop: 24, marginBottom: -34 }}>
          <Text style={{ color: COR.azulClaro, fontSize: 7, letterSpacing: 1, fontWeight: 700 }}>
            {[c.tipo, nomeUnidade(c.hospitalId), c.classificacao].filter(Boolean).join(' · ').toUpperCase()}
          </Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 300, marginTop: 6, lineHeight: 1.15 }}>{nome}</Text>
          {c.titulo ? <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: 600, marginTop: 6 }}>{c.fornecedorNome}</Text> : null}
          {c.fornecedorCnpj ? <Text style={{ color: COR.azulClaro, fontSize: 8, marginTop: 2 }}>{`CNPJ ${c.fornecedorCnpj}`}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginBottom: 12 }}>
            <Selo texto={c.status} cor="#fff" />
            <Selo texto={textoVigencia(c.vigenciaFim)} cor={corVigencia(c)} cheio />
          </View>
          <CaixaNumero rotulo="Término da vigência" valor={dataBR(c.vigenciaFim)} detalhe={`desde ${dataBR(c.vigenciaInicio)} · renovação ${c.renovacaoAutomatica ? 'automática' : 'manual'}`} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <CaixaNumero rotulo="Produtos" valor={String(produtos.length)} detalhe={produtos.length ? (semPreco ? `${semPreco} sem preço` : 'todos com preço') : 'nenhum'} />
            </View>
            <View style={{ flex: 1 }}>
              <CaixaNumero rotulo="Comodato" valor={qtdComodato ? String(qtdComodato) : '—'} detalhe={qtdComodato ? 'equipamentos' : 'nenhum'} />
            </View>
          </View>
          <CaixaNumero
            rotulo="Prazo de entrega"
            valor={c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : '—'}
            detalhe={[c.freteTipo && `Frete ${c.freteTipo}`, c.origemEmbarque].filter(Boolean).join(' · ') || undefined}
          />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 22 }}>
          <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Visão geral</Text>
          <Text style={[est.texto, { marginBottom: 12 }]}>{resumo}</Text>

          <Secao numero="01" titulo="Vigência">
            <LinhaVigencia c={c} largura={550} />
          </Secao>

          {pontos.length ? (
            <CaixaAtencao
              titulo={`Pontos de atenção (${pontos.length})`}
              itens={pontos.map((p) => ({ texto: p.texto, cor: p.nivel === 'alto' ? COR.vinho : COR.ambar }))}
              cor={temAlto ? COR.vinho : COR.ambar}
              fundo={temAlto ? COR.fundoVinho : COR.fundoAmbar}
            />
          ) : (
            <CaixaAtencao
              titulo="Pontos de atenção"
              itens={[{ texto: 'Nenhum: vigência em dia, preços e cadastro completos, contrato assinado anexado.', cor: COR.verdeEscuro }]}
              cor={COR.verdeEscuro}
              fundo={COR.fundoVerde}
            />
          )}

          <Secao numero="02" titulo="Partes">
            <Campos
              colunas={2}
              itens={[
                ['Contratante', FUSVE_NOME],
                ['Contratada', c.fornecedorNome],
                ['CNPJ', FUSVE_CNPJ],
                ['CNPJ', ou(c.fornecedorCnpj)],
                ['Unidade', c.hospitalId === 'ambos' ? 'HUV e HMK' : HOSPITAIS[c.hospitalId].nomeCompleto],
                ['Contato comercial', [c.contatoNome, c.contatoEmail, c.contatoWhatsapp].filter(Boolean).join(' · ')],
              ]}
            />
          </Secao>

          <Secao numero="03" titulo="Condições comerciais e logística">
            <Campos
              colunas={4}
              itens={[
                ['Pagamento', c.condicaoPagamento],
                ['Reajuste', c.reajusteRegra],
                ['Desconto por volume', c.gatilhoDesconto],
                ['Contrato assinado', c.pdfPath ? 'Anexado ao portal' : 'Não anexado'],
                ['Frete', c.freteTipo],
                ['Prazo médio', ou(c.prazoMedioDias, ' dias')],
                ['Tolerância de atraso', ou(c.toleranciaAtrasoDias, ' dias')],
                ['Horário de corte', c.horarioCutoff],
              ]}
            />
          </Secao>
        </View>
        <Rodape documento={nome} esquerda={262} />
      </Page>

      {/* Produtos — o cabeçalho da tabela repete em cada página */}
      <Page size="A4" orientation="landscape" style={est.paginaCorrida}>
        <Barra texto={`${tipoDoc} · ${nome}`} />
        <Text style={est.tituloPagina}>
          {`Produtos contratados `}
          <Text style={{ color: COR.suave }}>{`(${produtos.length}${semPreco ? ` · ${semPreco} sem preço` : ''})`}</Text>
        </Text>
        {ordenados.length ? (
          <>
            <CabecalhoTabela colunas={COLUNAS_PRODUTOS} fixo />
            {ordenados.map((p, i) => (
              <LinhaTabela
                key={p.id}
                indice={i}
                colunas={COLUNAS_PRODUTOS}
                celulas={[
                  { texto: String(i + 1), cor: COR.suave },
                  p.codSoulmv || '—',
                  p.descricao,
                  p.unidade || '—',
                  p.precoUnitario ? MOEDA.format(p.precoUnitario) : { texto: 'sem preço', cor: COR.vinho, negrito: true },
                  p.moq ? String(p.moq) : '—',
                  p.capacidadeFornecimento ? `${p.capacidadeFornecimento}/${p.capacidadePeriodo === 'semana' ? 'sem.' : 'mês'}` : '—',
                ]}
              />
            ))}
          </>
        ) : (
          <Text style={{ color: COR.suave }}>Nenhum produto cadastrado neste contrato.</Text>
        )}
        <Rodape documento={nome} />
      </Page>

      {/* Comodatos e observações */}
      <Page size="A4" orientation="landscape" style={est.paginaCorrida}>
        <Barra texto={`${tipoDoc} · ${nome}`} />
        <Text style={est.tituloPagina}>
          {`Equipamentos em comodato `}
          <Text style={{ color: COR.suave }}>{`(${qtdComodato})`}</Text>
        </Text>
        {comodatos.length ? (
          <View style={{ marginBottom: 16 }}>
            <CabecalhoTabela colunas={COLUNAS_COMODATOS} />
            {comodatos.map((q, i) => (
              <LinhaTabela
                key={q.id}
                indice={i}
                colunas={COLUNAS_COMODATOS}
                celulas={[
                  q.equipamento,
                  q.fabricanteModelo || '—',
                  [q.numeroSerie, q.patrimonio].filter(Boolean).join(' / ') || '—',
                  String(q.quantidade),
                  q.localInstalacao || '—',
                  dataBR(q.dataInstalacao),
                  q.valorEstimado ? MOEDA.format(q.valorEstimado * q.quantidade) : '—',
                ]}
              />
            ))}
            {valorComodato ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 5, paddingRight: 12 }}>
                <Text style={{ fontWeight: 700 }}>{`Total estimado  ${MOEDA.format(valorComodato)}`}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={{ color: COR.suave, marginBottom: 16 }}>Nenhum equipamento em comodato registrado para este contrato.</Text>
        )}

        {c.observacoes.trim() ? (
          <Secao titulo="Observações" quebra>
            <Text style={est.texto}>{c.observacoes.trim()}</Text>
          </Secao>
        ) : null}

        <Rodape documento={nome} />
      </Page>
    </Document>
  )
}

// ───────────────────────── Carteira de contratos ─────────────────────────

/** Linha do tempo de vencimentos: uma linha por unidade, um círculo por contrato no fim da vigência. */
function TimelineVencimentos({ linhas, largura }: { linhas: LinhaCarteira[]; largura: number }) {
  const comData = linhas.filter((l) => l.dias !== null)
  const unidades = (['huv', 'mkr', 'ambos'] as const).filter((u) => comData.some((l) => l.contrato.hospitalId === u))
  if (!unidades.length) return <Text style={{ color: COR.suave }}>Nenhum contrato ativo com data de término.</Text>
  const { min, max } = eixoTempo(comData)
  const esq = 62
  const W = largura
  const faixaH = 30
  const H = unidades.length * faixaH + 24
  const x = (d: number) => esq + ((d - min) / (max - min)) * (W - esq - 6)
  const maxItens = Math.max(1, ...comData.map((l) => l.itens ?? 0))
  const raio = (l: LinhaCarteira) => (l.itens === null ? 4.5 : 3.2 + 6 * Math.sqrt((l.itens || 0) / maxItens))
  const marcas = marcasDeMes(getHoje(), min, max)
  return (
    <Svg width={W} height={H}>
      {/* faixas de 0–30 e 31–90 dias */}
      <Rect x={x(Math.max(min, 0))} y={0} width={x(30) - x(Math.max(min, 0))} height={H - 20} fill={COR.fundoVinho} />
      <Rect x={x(30)} y={0} width={x(90) - x(30)} height={H - 20} fill={COR.fundoAmbar} />
      {unidades.map((u, i) => (
        <Line key={u} x1={esq} x2={W - 6} y1={i * faixaH + faixaH / 2} y2={i * faixaH + faixaH / 2} stroke={COR.fio} strokeWidth={0.8} />
      ))}
      {marcas.map((mk) => (
        <Line key={mk.dias} x1={x(mk.dias)} x2={x(mk.dias)} y1={H - 22} y2={H - 18} stroke={COR.suave} strokeWidth={0.6} />
      ))}
      <Line x1={x(0)} x2={x(0)} y1={0} y2={H - 18} stroke={COR.tinta} strokeWidth={1} />
      {comData.map((l) => {
        const i = unidades.indexOf(l.contrato.hospitalId as (typeof unidades)[number])
        const cx = x(l.dias as number)
        const cy = i * faixaH + faixaH / 2
        if (l.faixa === 'vencido') {
          const r = raio(l) * 1.25
          return <Polygon key={l.contrato.id} points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill={COR_FAIXA.vencido} stroke="#fff" strokeWidth={0.8} />
        }
        return (
          <Circle
            key={l.contrato.id}
            cx={cx}
            cy={cy}
            r={raio(l)}
            fill={COR_FAIXA[l.faixa]}
            fillOpacity={0.85}
            stroke="#fff"
            strokeWidth={0.8}
          />
        )
      })}
    </Svg>
  )
}

function RotulosTimeline({ linhas, largura }: { linhas: LinhaCarteira[]; largura: number }) {
  const comData = linhas.filter((l) => l.dias !== null)
  const unidades = (['huv', 'mkr', 'ambos'] as const).filter((u) => comData.some((l) => l.contrato.hospitalId === u))
  if (!unidades.length) return null
  const { min, max } = eixoTempo(comData)
  const esq = 62
  const x = (d: number) => esq + ((d - min) / (max - min)) * (largura - esq - 6)
  const marcas = marcasDeMes(getHoje(), min, max)
  return (
    <View style={{ position: 'relative', height: 0 }}>
      {unidades.map((u, i) => (
        <Text key={u} style={{ position: 'absolute', left: 0, top: -(unidades.length * 30 + 24) + i * 30 + 10, fontSize: 7.5, fontWeight: 700, color: COR.tinta }}>
          {ROTULO_UNIDADE[u]}
        </Text>
      ))}
      {marcas.map((mk) => (
        <Text key={mk.dias} style={{ position: 'absolute', left: x(mk.dias) - 12, width: 24, textAlign: 'center', top: -16, fontSize: 6.5, color: COR.suave }}>
          {mk.rotulo}
        </Text>
      ))}
      <Text style={{ position: 'absolute', left: x(0) - 15, width: 30, textAlign: 'center', top: -16, fontSize: 6.5, fontWeight: 700, color: COR.tinta }}>hoje</Text>
    </View>
  )
}

function Legenda({ comItens }: { comItens: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {(['vencido', 'critico', 'atencao', 'normal'] as const).map((f) => (
        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
          <View style={{ width: 7, height: 7, borderRadius: f === 'vencido' ? 0 : 4, transform: f === 'vencido' ? 'rotate(45deg) scale(0.85)' : undefined, backgroundColor: COR_FAIXA[f], marginRight: 4 }} />
          <Text style={{ fontSize: 7, color: COR.suave }}>{ROTULO_FAIXA[f]}</Text>
        </View>
      ))}
      {comItens ? <Text style={{ fontSize: 7, color: COR.suave }}>· tamanho do círculo = nº de produtos</Text> : null}
    </View>
  )
}

function Barras({ titulo, itens }: { titulo: string; itens: { nome: string; quantidade: number; pct: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.quantidade))
  return (
    <View style={{ flex: 1 }} wrap={false}>
      <Text style={[est.rotulo, { marginBottom: 6 }]}>{titulo}</Text>
      {itens.map((i) => (
        <View key={i.nome} style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 8 }}>{i.nome}</Text>
            <Text style={{ fontSize: 8, color: COR.suave }}>{`${i.quantidade} · ${Math.round(i.pct * 100)}%`}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: COR.claro }}>
            <View style={{ height: 5, width: `${(i.quantidade / max) * 100}%`, backgroundColor: COR.azul }} />
          </View>
        </View>
      ))}
    </View>
  )
}

const COLUNAS_CARTEIRA: ColunaTabela[] = [
  { titulo: 'Contrato / acordo' },
  { titulo: 'Fornecedor' },
  { titulo: 'Unidade', largura: 58 },
  { titulo: 'Classificação', largura: 74 },
  { titulo: 'Término', largura: 58 },
  { titulo: 'Dias', largura: 72, direita: true },
  { titulo: 'Renovação', largura: 62 },
  { titulo: 'Produtos', largura: 46, direita: true },
  { titulo: 'Comod.', largura: 40, direita: true },
]

function linhaCarteira(l: LinhaCarteira) {
  const c = l.contrato
  return [
    c.titulo || '—',
    c.fornecedorNome,
    ROTULO_UNIDADE[c.hospitalId],
    c.classificacao || '—',
    dataBR(c.vigenciaFim),
    { texto: textoDias(l.dias), cor: l.faixa === 'normal' ? COR.tinta : COR_FAIXA[l.faixa], negrito: l.faixa !== 'normal' },
    c.renovacaoAutomatica ? 'Automática' : 'Manual',
    l.itens === null ? '—' : String(l.itens),
    l.comodatos ? String(l.comodatos) : '—',
  ]
}

export interface DadosCarteira {
  carteira: Carteira
  unidade: 'todas' | HospitalId
}

function CarteiraContratos({ carteira, unidade }: DadosCarteira) {
  const t = carteira.totais
  const nomeUn = unidade === 'todas' ? 'HUV e HMK' : HOSPITAIS[unidade].sigla
  const comItens = carteira.linhas.some((l) => l.itens !== null)
  const hoje = getHoje()
  const frase = fraseCarteira(carteira, unidade)
  const documento = `Carteira de contratos — ${nomeUn}`

  return (
    <Document title={documento} author="FUSVE · Setor de Compras">
      <Page size="A4" orientation="landscape" style={[est.pagina, { flexDirection: 'row' }]}>
        <Barra texto="Relatório gerencial · Contratos e acordos comerciais" />
        <View style={{ width: 220, backgroundColor: COR.azul, paddingHorizontal: 20, paddingTop: 24, marginBottom: -34 }}>
          <Text style={{ color: COR.azulClaro, fontSize: 7, letterSpacing: 1, fontWeight: 700 }}>{`CONTRATOS ATIVOS · ${nomeUn}`}</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 300, marginTop: 6, lineHeight: 1.15 }}>Carteira de contratos</Text>
          <Text style={{ color: COR.azulClaro, fontSize: 8.5, marginTop: 4, marginBottom: 14 }}>{`Posição em ${dataCurta(hoje)}`}</Text>
          <CaixaNumero rotulo="Contratos e acordos ativos" valor={String(t.ativos)} detalhe={`${t.fornecedores} fornecedor${t.fornecedores === 1 ? '' : 'es'}`} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <CaixaNumero rotulo="Decidir em 90 dias" valor={String(t.decidir)} detalhe={`${t.criticos} em até 30 dias`} />
            </View>
            <View style={{ flex: 1 }}>
              <CaixaNumero rotulo="Vencidos" valor={String(t.vencidos)} detalhe="ainda ativos" />
            </View>
          </View>
          {comItens ? <CaixaNumero rotulo="Produtos de referência" valor={String(t.produtos)} /> : null}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 22 }}>
          <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Visão geral</Text>
          <Text style={[est.texto, { marginBottom: 12 }]}>{frase}</Text>

          <Secao numero="01" titulo="Linha do tempo de vencimentos">
            <TimelineVencimentos linhas={carteira.linhas} largura={566} />
            <RotulosTimeline linhas={carteira.linhas} largura={566} />
            <Legenda comItens={comItens} />
          </Secao>

          <Secao numero="02" titulo={`Precisam de decisão nos próximos 90 dias (${carteira.decidir.length})`}>
            {carteira.decidir.length ? (
              carteira.decidir.slice(0, 7).map((l) => (
                <View key={l.contrato.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: COR.fio }}>
                  <Text style={{ width: 82, fontSize: 9, fontWeight: 800, color: COR_FAIXA[l.faixa] }}>{textoDias(l.dias)}</Text>
                  <Text style={{ flex: 1, fontSize: 8.5 }}>
                    <Text style={{ fontWeight: 700 }}>{l.contrato.titulo || l.contrato.fornecedorNome}</Text>
                    {l.contrato.titulo ? <Text style={{ color: COR.suave }}>{`  ${l.contrato.fornecedorNome}`}</Text> : null}
                  </Text>
                  <Text style={{ width: 60, fontSize: 8, color: COR.suave }}>{ROTULO_UNIDADE[l.contrato.hospitalId]}</Text>
                  <Text style={{ width: 60, fontSize: 8, color: COR.suave, textAlign: 'right' }}>{dataBR(l.contrato.vigenciaFim)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: COR.suave }}>{`Nenhum contrato ${unidade === 'todas' ? '' : 'desta unidade '}vence nos próximos 90 dias.`}</Text>
            )}
            {carteira.decidir.length > 7 ? (
              <Text style={{ fontSize: 7.5, color: COR.suave, marginTop: 4 }}>{`+ ${carteira.decidir.length - 7} na tabela completa, nas páginas seguintes.`}</Text>
            ) : null}
          </Secao>
        </View>
        <Rodape documento={documento} esquerda={246} />
      </Page>

      <Page size="A4" orientation="landscape" style={est.paginaCorrida}>
        <Barra texto="Relatório gerencial · Contratos e acordos comerciais" />
        <Text style={est.tituloPagina}>
          {'Todos os contratos ativos '}
          <Text style={{ color: COR.suave }}>{`(${carteira.linhas.length})`}</Text>
        </Text>
        <CabecalhoTabela colunas={COLUNAS_CARTEIRA} fixo />
        {carteira.linhas.map((l, i) => (
          <LinhaTabela key={l.contrato.id} indice={i} colunas={COLUNAS_CARTEIRA} celulas={linhaCarteira(l)} />
        ))}
        {!carteira.linhas.length ? <Text style={{ color: COR.suave, marginTop: 8 }}>Nenhum contrato ativo.</Text> : null}
        <View wrap={false} style={{ marginTop: 22 }}>
          <Text style={est.tituloPagina}>Onde estão os contratos</Text>
          <View style={{ flexDirection: 'row', gap: 40, marginBottom: 18 }}>
            <Barras titulo="Por classificação" itens={carteira.porClassificacao} />
            <Barras titulo="Por unidade" itens={carteira.porUnidade} />
          </View>
          <Text style={est.rotulo}>Como os números são calculados</Text>
          <Text style={[est.texto, { fontSize: 8, marginTop: 3 }]}>
            Entram os contratos e acordos com status Ativo da unidade escolhida (os de "HUV e HMK" contam nas duas). Dias restantes = fim da vigência menos hoje,
            em dias corridos. Faixas: até 30 dias, de 31 a 90 dias, acima de 90 dias e vencido. Produtos = itens cadastrados no contrato como referência de
            preço; o relatório não soma valores, porque os pedidos não são vinculados aos contratos.
          </Text>
        </View>
        <Rodape documento={documento} />
      </Page>
    </Document>
  )
}

export async function gerarResumoContratoPDF(dados: DadosResumoContrato): Promise<Blob> {
  return pdf(<ResumoContrato {...dados} />).toBlob()
}

export async function gerarCarteiraContratosPDF(dados: DadosCarteira): Promise<Blob> {
  return pdf(<CarteiraContratos {...dados} />).toBlob()
}
