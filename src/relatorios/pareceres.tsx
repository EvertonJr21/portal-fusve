import { Document, pdf, Text, View } from '@react-pdf/renderer'
import type { Parecer } from '@/types'
import { CATEGORIAS_MARCA, rotuloValidade, validadeParecer } from '@/utils/marcas'
import {
  Barras,
  CabecalhoTabela,
  CaixaAtencao,
  CaixaNumero,
  Campos,
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

/** Pareceres técnicos em PDF no padrão FUSVE (item 113): um parecer, ou a base inteira/filtrada. */

const BARRA = 'Parecer técnico · Setor de Compras'
const COR_CATEGORIA = { padrao: COR.azul, permitidas: COR.verdeEscuro, restritas: COR.ambar, proibidas: COR.vinho } as const
const juntar = (a: string[]) => (a.length ? a.join(', ') : '—')

function validade(p: Parecer) {
  const v = validadeParecer(p.dataParecer)
  return v ? { texto: rotuloValidade(v), cor: v.nivel === 'revisar' ? COR.vinho : v.nivel === 'atencao' ? COR.ambar : COR.tinta } : { texto: '—', cor: COR.suave }
}

// ───────────── Um parecer ─────────────

function ParecerUnico({ p }: { p: Parecer }) {
  const v = validade(p)
  const total = CATEGORIAS_MARCA.reduce((s, c) => s + p[c.key].length, 0)
  return (
    <Document title={`Parecer técnico — ${p.nome}`} author="FUSVE · Setor de Compras">
      <PaginaCapa
        barra={BARRA}
        documento={`Parecer ${p.cod}`}
        rotulo={`Parecer técnico · cód. ${p.cod}`}
        titulo={p.nome || `Produto ${p.cod}`}
        subtitulo={p.cat || undefined}
        coluna={
          <>
            <CaixaNumero rotulo="Data do parecer" valor={p.dataParecer || '—'} detalhe={v.texto !== '—' ? `idade: ${v.texto}` : undefined} />
            <ParNumeros a={{ rotulo: 'Marcas avaliadas', valor: String(total) }} b={{ rotulo: 'Proibidas', valor: String(p.proibidas.length) }} />
            <CaixaNumero rotulo="Responsável" valor={p.responsavel || '—'} />
          </>
        }
      >
        <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Orientação de compra</Text>
        <Text style={[est.texto, { marginBottom: 12 }]}>
          {total
            ? `Comprar preferencialmente as marcas padrão; as permitidas só se a padrão faltar; as restritas exigem consulta antes; as proibidas não devem ser compradas.`
            : 'Este parecer não restringe marca: qualquer marca serve, desde que atenda ao requisito técnico abaixo.'}
        </Text>
        {p.requisitoTecnico ? (
          <CaixaAtencao titulo="Requisito técnico de compra (vale para qualquer marca)" itens={[{ texto: p.requisitoTecnico, cor: COR.ambar }]} cor={COR.ambar} fundo={COR.fundoAmbar} />
        ) : null}
        <Secao numero="01" titulo="Marcas por categoria">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORIAS_MARCA.map((c) => (
              <View key={c.key} style={{ width: '50%', paddingRight: 12, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                  <View style={{ width: 7, height: 7, backgroundColor: COR_CATEGORIA[c.key], marginRight: 5 }} />
                  <Text style={{ fontSize: 9.5, fontWeight: 700, color: COR_CATEGORIA[c.key] }}>
                    {c.label}
                    <Text style={{ fontSize: 7.5, fontWeight: 400, color: COR.suave }}>{`   ${c.descricao}`}</Text>
                  </Text>
                </View>
                <Text style={{ fontSize: 9 }}>{juntar(p[c.key])}</Text>
              </View>
            ))}
          </View>
        </Secao>
        {p.observacao ? (
          <Secao numero="02" titulo="Observação">
            <Text style={est.texto}>{p.observacao}</Text>
          </Secao>
        ) : null}
        <Campos colunas={3} itens={[['Código SoulMV', p.cod], ['Categoria', p.cat], ['Validade', v.texto]]} />
      </PaginaCapa>
    </Document>
  )
}

// ───────────── Base de pareceres ─────────────

const COLUNAS: ColunaTabela[] = [
  { titulo: 'Cód.', largura: 38 },
  { titulo: 'Produto' },
  { titulo: 'Padrão', largura: 82 },
  { titulo: 'Permitidas', largura: 82 },
  { titulo: 'Restritas', largura: 70 },
  { titulo: 'Proibidas', largura: 82 },
  { titulo: 'Requisito / obs.', largura: 110 },
  { titulo: 'Validade', largura: 62 },
]

function BasePareceres({ lista, totalGeral }: { lista: Parecer[]; totalGeral?: number }) {
  const ordenados = [...lista].sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.nome.localeCompare(b.nome))
  const n = (f: (p: Parecer) => boolean) => lista.filter(f).length
  const revisar = n((p) => validadeParecer(p.dataParecer)?.nivel === 'revisar')
  const documento = 'Base de pareceres técnicos'
  const porCategoria = contarNomes(lista.map((p) => p.cat || 'Sem categoria'), 8)
  return (
    <Document title={documento} author="FUSVE · Setor de Compras">
      <PaginaCapa
        barra={BARRA}
        documento={documento}
        rotulo="Pareceres técnicos"
        titulo="Base de pareceres"
        subtitulo={totalGeral ? `Filtrado: ${lista.length} de ${totalGeral}` : 'Todos os pareceres'}
        coluna={
          <>
            <CaixaNumero rotulo="Pareceres" valor={String(lista.length)} detalhe={`${porCategoria.length} categorias`} />
            <ParNumeros a={{ rotulo: 'Com proibida', valor: String(n((p) => p.proibidas.length > 0)) }} b={{ rotulo: 'Com requisito', valor: String(n((p) => !!p.requisitoTecnico)) }} />
            <CaixaNumero rotulo="A revisar" valor={String(revisar)} detalhe="parecer com 18 meses ou mais" />
          </>
        }
      >
        <Text style={[est.tituloPagina, { fontSize: 19, marginBottom: 6 }]}>Visão geral</Text>
        <Text style={[est.texto, { marginBottom: 12 }]}>
          {`A base reúne ${lista.length} parecer${lista.length === 1 ? '' : 'es'} técnico${lista.length === 1 ? '' : 's'}: ${n((p) => p.padrao.length > 0)} com marca padrão definida, ${n((p) => p.proibidas.length > 0)} com ao menos uma marca proibida e ${n((p) => !!p.requisitoTecnico)} com requisito técnico de compra.`}
          {revisar ? ` ${revisar} ${revisar === 1 ? 'parecer tem' : 'pareceres têm'} 18 meses ou mais e ${revisar === 1 ? 'deve' : 'devem'} ser revisado${revisar === 1 ? '' : 's'}.` : ''}
        </Text>
        <Secao numero="01" titulo="Como ler">
          {CATEGORIAS_MARCA.map((c) => (
            <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ width: 7, height: 7, backgroundColor: COR_CATEGORIA[c.key], marginRight: 6 }} />
              <Text style={{ fontSize: 9, fontWeight: 700, width: 70, color: COR_CATEGORIA[c.key] }}>{c.label}</Text>
              <Text style={{ fontSize: 8.5, color: COR.suave }}>{c.descricao}</Text>
            </View>
          ))}
        </Secao>
        <Secao numero="02" titulo="Por categoria">
          <Barras titulo="Pareceres por categoria de produto" itens={porCategoria} />
        </Secao>
      </PaginaCapa>

      <PaginaCorrida barra={BARRA} documento={documento} tabela={COLUNAS}>
        <TituloPagina texto="Pareceres" contagem={`(${lista.length})`} />
        <CabecalhoTabela colunas={COLUNAS} />
        {ordenados.map((p, i) => {
          const v = validade(p)
          return (
            <LinhaTabela
              key={p.cod}
              indice={i}
              colunas={COLUNAS}
              celulas={[
                { texto: p.cod, negrito: true, cor: COR.azul },
                `${p.nome}${p.cat ? `\n${p.cat}` : ''}`,
                { texto: juntar(p.padrao), cor: COR.azul },
                { texto: juntar(p.permitidas), cor: COR.verdeEscuro },
                { texto: juntar(p.restritas), cor: COR.ambar },
                { texto: juntar(p.proibidas), cor: COR.vinho, negrito: p.proibidas.length > 0 },
                [p.requisitoTecnico && `Requisito: ${p.requisitoTecnico}`, p.observacao].filter(Boolean).join('\n').slice(0, 160) || '—',
                { texto: v.texto, cor: v.cor },
              ]}
            />
          )
        })}
      </PaginaCorrida>
    </Document>
  )
}

export async function gerarParecerPDF(p: Parecer): Promise<Blob> {
  return pdf(<ParecerUnico p={p} />).toBlob()
}

export async function gerarBasePareceresPDF(lista: Parecer[], totalGeral?: number): Promise<Blob> {
  return pdf(<BasePareceres lista={lista} totalGeral={totalGeral} />).toBlob()
}
