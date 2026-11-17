import { Document, pdf, Text, View } from '@react-pdf/renderer'
import type { Fornecedor, OC, Solicitacao } from '@/types'
import { parseDMY } from '@/utils/date'
import { cicloInterno, desempenhoPorFornecedor, formatarDias, formatarPct, ordenarPorRisco, resumir, type AvaliacaoOC } from '@/utils/kpis'
import { isPrevisaoDescumprida } from '@/utils/oc'
import {
  Barras,
  CabecalhoTabela,
  CaixaNumero,
  Campos,
  Ciencia,
  contarNomes,
  COR,
  est,
  LinhaTabela,
  PaginaCapa,
  PaginaCorrida,
  ParNumeros,
  Secao,
  TituloPagina,
  type ColunaTabela,
} from './identidade'

/**
 * Relatório gerencial mensal de OCs no padrão FUSVE (item 113) — mesmos
 * números do Desempenho de Entrega (`kpis.ts`). Sem valor em reais: OC não
 * tem preço no portal.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const BARRA = 'Relatório mensal · Ordens de compra'

export interface DadosOcsMensal {
  mes: number
  ano: number
  ocs: OC[]
  sols: Solicitacao[]
  forns: Fornecedor[]
  avaliacoes: AvaliacaoOC[]
}

const COLUNAS_FORN: ColunaTabela[] = [
  { titulo: 'Fornecedor' },
  { titulo: 'Nota', largura: 40 },
  { titulo: 'OTIF', largura: 60, direita: true },
  { titulo: 'No prazo', largura: 60, direita: true },
  { titulo: 'Completas', largura: 64, direita: true },
  { titulo: 'Lead time', largura: 64, direita: true },
  { titulo: 'OCs avaliadas', largura: 74, direita: true },
]

function RelatorioOcs({ mes, ano, ocs, sols, forns, avaliacoes }: DadosOcsMensal) {
  const periodo = `${MESES[mes]} de ${ano}`
  const documento = `OCs — ${periodo}`
  const noMes = (d: string | null) => {
    const x = parseDMY(d)
    return !!x && x.getMonth() === mes && x.getFullYear() === ano
  }
  const ocsDoMes = ocs.filter((o) => noMes(o.dataSolic))
  const ids = new Set(ocsDoMes.map((o) => o.id))
  const avDoMes = avaliacoes.filter((a) => ids.has(a.oc.id))
  const r = resumir(avDoMes)
  const ciclo = cicloInterno(ocsDoMes, sols)
  const fora = avDoMes.filter((a) => a.status === 'aberta_vencida' || a.status === 'atrasada').length
  const descumpridas = ocsDoMes.filter(isPrevisaoDescumprida).length
  const porForn = ordenarPorRisco(desempenhoPorFornecedor(avDoMes, forns)).filter((d) => d.classe)
  const criticos = porForn.filter((d) => d.classe?.classe === 'C' || d.classe?.classe === 'D')
  const motivos = contarNomes(ocsDoMes.filter((o) => o.motivoAtraso).map((o) => o.motivoAtraso as string), 8)
  const frase = ocsDoMes.length
    ? `Em ${periodo} foram emitidas ${ocsDoMes.length} ordens de compra. ` +
      (r.avaliadas
        ? `Das ${r.avaliadas} já avaliáveis, ${r.perfeitas} chegaram no prazo e completas (OTIF ${formatarPct(r.otif)}); o tempo típico entre a OC e a entrada foi de ${formatarDias(r.leadTimeMediana)}. `
        : 'Ainda não há entregas avaliáveis neste mês. ') +
      `${fora} OC${fora === 1 ? '' : 's'} ${fora === 1 ? 'passou' : 'passaram'} da data prometida e ${descumpridas} ${descumpridas === 1 ? 'teve' : 'tiveram'} previsão descumprida.` +
      (criticos.length ? ` ${criticos.length} fornecedor${criticos.length === 1 ? '' : 'es'} ficou com nota C ou D.` : '')
    : `Nenhuma ordem de compra emitida em ${periodo}.`

  return (
    <Document title={documento} author="FUSVE · Setor de Compras">
      <PaginaCapa
        barra={BARRA}
        documento={documento}
        rotulo="Compras · Ordens de compra"
        titulo="Relatório mensal de OCs"
        subtitulo={periodo[0].toUpperCase() + periodo.slice(1)}
        coluna={
          <>
            <CaixaNumero rotulo="OCs emitidas" valor={String(ocsDoMes.length)} detalhe={`${r.avaliadas} avaliadas na entrega`} />
            <ParNumeros
              a={{ rotulo: 'OTIF', valor: r.avaliadas ? formatarPct(r.otif) : '—', detalhe: 'no prazo e completas' }}
              b={{ rotulo: 'Lead time', valor: formatarDias(r.leadTimeMediana), detalhe: `P90 ${formatarDias(r.leadTimeP90)}` }}
            />
            <ParNumeros a={{ rotulo: 'Fora do prazo', valor: String(fora) }} b={{ rotulo: 'Previsão descumprida', valor: String(descumpridas) }} />
          </>
        }
      >
        <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Visão geral</Text>
        <Text style={[est.texto, { marginBottom: 12 }]}>{frase}</Text>

        <Secao numero="01" titulo="Indicadores do mês">
          <Campos
            colunas={4}
            itens={[
              ['No prazo (On Time)', formatarPct(r.onTime)],
              ['Completas (In Full)', formatarPct(r.inFull)],
              ['Ciclo interno Sol. → OC', ciclo.total ? `${formatarDias(ciclo.mediana)} · ${formatarPct(ciclo.pct)} na meta` : '—'],
              ['Datas de entrega confirmadas', formatarPct(r.cobertura)],
            ]}
          />
        </Secao>

        <Secao numero="02" titulo={`Fornecedores com nota C ou D (${criticos.length})`}>
          {criticos.length ? (
            criticos.slice(0, 5).map((d) => (
              <View key={d.fornecedorNome} style={{ flexDirection: 'row', paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: COR.fio }}>
                <Text style={{ width: 22, fontSize: 9.5, fontWeight: 800, color: d.classe?.classe === 'D' ? COR.vinho : COR.ambar }}>{d.classe?.classe}</Text>
                <Text style={{ flex: 1, fontSize: 8.5 }}>{d.fornecedorNome}</Text>
                <Text style={{ width: 150, fontSize: 8, color: COR.suave, textAlign: 'right' }}>{`OTIF ${formatarPct(d.resumo.otif)} · ${d.resumo.avaliadas} OCs`}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: COR.suave }}>Nenhum fornecedor com nota C ou D (a nota exige ao menos 5 OCs avaliadas).</Text>
          )}
        </Secao>
      </PaginaCapa>

      <PaginaCorrida barra={BARRA} documento={documento} tabela={COLUNAS_FORN}>
        <TituloPagina texto="Desempenho por fornecedor" contagem={`(${porForn.length} com nota)`} />
        <CabecalhoTabela colunas={COLUNAS_FORN} />
        {porForn.map((d, i) => (
          <LinhaTabela
            key={d.fornecedorNome}
            indice={i}
            colunas={COLUNAS_FORN}
            celulas={[
              d.fornecedorNome,
              { texto: d.classe?.classe ?? '—', negrito: true, cor: d.classe?.classe === 'D' ? COR.vinho : d.classe?.classe === 'C' ? COR.ambar : COR.azul },
              formatarPct(d.resumo.otif),
              formatarPct(d.resumo.onTime),
              formatarPct(d.resumo.inFull),
              formatarDias(d.resumo.leadTimeMediana),
              String(d.resumo.avaliadas),
            ]}
          />
        ))}
        {!porForn.length ? <Text style={{ color: COR.suave, marginTop: 8 }}>Nenhum fornecedor com OCs suficientes para nota neste mês.</Text> : null}

        <View wrap={false} style={{ flexDirection: 'row', gap: 40, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <Barras titulo="Principais motivos de ocorrência" itens={motivos} cor={COR.vinho} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={est.rotulo}>Como os números são calculados</Text>
            <Text style={[est.texto, { fontSize: 7.8, marginTop: 3 }]}>
              Data prometida = data da OC + prazo médio do contrato ativo do fornecedor (ou o prazo padrão). OTIF = OCs entregues no prazo e em uma só entrada,
              dividido pelas avaliadas (entregues e abertas além do prazo). Lead time = mediana de dias entre a OC e a entrada no MV. Nota A ≥ 90%, B ≥ 75%, C ≥ 60%,
              D abaixo, com no mínimo 5 OCs.
            </Text>
          </View>
        </View>
        <Ciencia />
      </PaginaCorrida>
    </Document>
  )
}

export async function gerarRelatorioOcsPDF(dados: DadosOcsMensal): Promise<Blob> {
  return pdf(<RelatorioOcs {...dados} />).toBlob()
}
