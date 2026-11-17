import { Document, pdf, Text, View } from '@react-pdf/renderer'
import { HOSPITAIS, type HospitalId } from '@/constants'
import type { Fornecedor, Opme } from '@/types'
import { fmt, getHoje, parseDMY } from '@/utils/date'
import { STATUS_OPME_LABEL } from '@/utils/opme'
import {
  Barras,
  CabecalhoTabela,
  CaixaAtencao,
  CaixaNumero,
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

/** Relatório mensal de OPME no padrão FUSVE (item 113) — o que sai do calendário para a coordenação. */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export interface DadosOpme {
  mes: number
  ano: number
  hospitalId: HospitalId
  opmes: Opme[]
  fornecedores: Fornecedor[]
}

const COLUNAS: ColunaTabela[] = [
  { titulo: 'Data', largura: 74 },
  { titulo: 'Paciente', largura: 180 },
  { titulo: 'Fornecedor', largura: 190 },
  { titulo: 'Status', largura: 70 },
  { titulo: 'Observação' },
]

function RelatorioOpme({ mes, ano, hospitalId, opmes, fornecedores }: DadosOpme) {
  const nomeForn = (id: number | null) => fornecedores.find((f) => f.id === id)?.nome ?? 'Sem fornecedor'
  const ordenados = [...opmes].sort((a, b) => (parseDMY(a.dataCirurgia)?.getTime() ?? 0) - (parseDMY(b.dataCirurgia)?.getTime() ?? 0))
  const pendentes = ordenados.filter((o) => o.status === 'pendente')
  const finalizados = ordenados.length - pendentes.length
  const hoje = getHoje()
  const atrasados = pendentes.filter((o) => (parseDMY(o.dataCirurgia)?.getTime() ?? 0) < hoje.getTime())
  const proximos = pendentes.filter((o) => (parseDMY(o.dataCirurgia)?.getTime() ?? 0) >= hoje.getTime()).slice(0, 6)
  const porFornecedor = contarNomes(ordenados.map((o) => nomeForn(o.fornecedorId)), 6)
  const periodo = `${MESES[mes]} de ${ano}`
  const sigla = HOSPITAIS[hospitalId].sigla
  const documento = `OPME — ${periodo} — ${sigla}`
  const barra = 'Relatório mensal · OPME'
  const pct = ordenados.length ? Math.round((finalizados / ordenados.length) * 100) : 0
  const frase = ordenados.length
    ? `Em ${periodo}, o ${sigla} teve ${ordenados.length} cirurgia${ordenados.length === 1 ? '' : 's'} com OPME, com ${porFornecedor.length} fornecedor${porFornecedor.length === 1 ? '' : 'es'}. ` +
      `${finalizados} já ${finalizados === 1 ? 'está finalizada' : 'estão finalizadas'} (${pct}%) e ${pendentes.length} ${pendentes.length === 1 ? 'segue pendente' : 'seguem pendentes'}` +
      (atrasados.length ? `, sendo ${atrasados.length} com a data da cirurgia já passada.` : '.')
    : `Nenhuma cirurgia com OPME registrada em ${periodo} no ${sigla}.`
  const dia = (o: Opme) => {
    const d = parseDMY(o.dataCirurgia)
    return d ? `${fmt(d)} ${DIAS[d.getDay()]}` : o.dataCirurgia
  }

  return (
    <Document title={documento} author="FUSVE · Setor de Compras">
      <PaginaCapa
        barra={barra}
        documento={documento}
        rotulo={`OPME · ${sigla}`}
        titulo="Cirurgias com OPME"
        subtitulo={periodo[0].toUpperCase() + periodo.slice(1)}
        coluna={
          <>
            <CaixaNumero rotulo="Cirurgias no mês" valor={String(ordenados.length)} detalhe={`${porFornecedor.length} fornecedor${porFornecedor.length === 1 ? '' : 'es'}`} />
            <ParNumeros a={{ rotulo: 'Finalizados', valor: String(finalizados), detalhe: `${pct}%` }} b={{ rotulo: 'Pendentes', valor: String(pendentes.length), detalhe: atrasados.length ? `${atrasados.length} já passaram` : 'em dia' }} />
          </>
        }
      >
        <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Visão geral</Text>
        <Text style={[est.texto, { marginBottom: 12 }]}>{frase}</Text>

        {atrasados.length ? (
          <CaixaAtencao
            titulo={`Cirurgia já realizada e OPME ainda pendente (${atrasados.length})`}
            itens={atrasados.slice(0, 5).map((o) => ({ texto: `${dia(o)} · ${o.paciente} · ${nomeForn(o.fornecedorId)}`, cor: COR.vinho }))}
            cor={COR.vinho}
            fundo={COR.fundoVinho}
          />
        ) : null}

        <Secao numero="01" titulo={`Próximas pendentes (${proximos.length})`}>
          {proximos.length ? (
            proximos.map((o) => (
              <View key={o.id} style={{ flexDirection: 'row', paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: COR.fio }}>
                <Text style={{ width: 82, fontSize: 8.5, fontWeight: 700, color: COR.azul }}>{dia(o)}</Text>
                <Text style={{ flex: 1, fontSize: 8.5 }}>{o.paciente}</Text>
                <Text style={{ width: 200, fontSize: 8, color: COR.suave }}>{nomeForn(o.fornecedorId)}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: COR.suave }}>Nenhuma cirurgia pendente daqui para frente neste mês.</Text>
          )}
        </Secao>

        <Secao numero="02" titulo="Por fornecedor">
          <Barras titulo="Cirurgias por fornecedor" itens={porFornecedor} />
        </Secao>
      </PaginaCapa>

      <PaginaCorrida barra={barra} documento={documento} tabela={COLUNAS}>
        <TituloPagina texto="Todas as cirurgias do mês" contagem={`(${ordenados.length})`} />
        <CabecalhoTabela colunas={COLUNAS} />
        {ordenados.map((o, i) => (
          <LinhaTabela
            key={o.id}
            indice={i}
            colunas={COLUNAS}
            celulas={[
              dia(o),
              o.paciente,
              nomeForn(o.fornecedorId),
              { texto: STATUS_OPME_LABEL[o.status], cor: o.status === 'pendente' ? COR.ambar : COR.verdeEscuro, negrito: true },
              o.observacao || '—',
            ]}
          />
        ))}
        {!ordenados.length ? <Text style={{ color: COR.suave, marginTop: 8 }}>Nenhuma cirurgia registrada.</Text> : null}
        <Text style={[est.texto, { fontSize: 7.5, color: COR.suave, marginTop: 10 }]}>
          Dados de pacientes: uso interno, protegidos pela LGPD. Não compartilhar fora da instituição.
        </Text>
        <Ciencia />
      </PaginaCorrida>
    </Document>
  )
}

export async function gerarRelatorioOpmePDF(dados: DadosOpme): Promise<Blob> {
  return pdf(<RelatorioOpme {...dados} />).toBlob()
}
