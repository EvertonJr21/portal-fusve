import { Document, pdf, Text, View } from '@react-pdf/renderer'
import { dataCurta } from '@/utils/carteiraContratos'
import { getHoje } from '@/utils/date'
import { CabecalhoTabela, COR, est, LinhaTabela, PaginaCorrida, type Celula, type ColunaTabela } from './identidade'

/**
 * Relatório de lista genérico no padrão FUSVE (item 113): usado pelas
 * exportações em PDF (OCs em atraso, sem previsão, cobranças…) e pela lista
 * de contas da Administração. Uma página corrida: título, números, tabela
 * com o cabeçalho repetido nas páginas seguintes.
 */
export interface DadosTabela {
  barra: string
  rotulo: string
  titulo: string
  subtitulo?: string
  numeros?: { rotulo: string; valor: string }[]
  colunas: ColunaTabela[]
  linhas: (string | Celula)[][]
  nota?: string
}

function RelatorioTabela({ barra, rotulo, titulo, subtitulo, numeros, colunas, linhas, nota }: DadosTabela) {
  return (
    <Document title={titulo} author="FUSVE · Setor de Compras">
      <PaginaCorrida barra={barra} documento={titulo} tabela={colunas}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COR.azul, fontSize: 7, letterSpacing: 1, fontWeight: 700 }}>{rotulo.toUpperCase()}</Text>
            <Text style={{ fontSize: 20, fontWeight: 300, marginTop: 3 }}>{titulo}</Text>
            <Text style={{ fontSize: 8.5, color: COR.suave, marginTop: 3 }}>
              {[subtitulo, `Posição em ${dataCurta(getHoje())}`, `${linhas.length} registro${linhas.length === 1 ? '' : 's'}`].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          {numeros?.length ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {numeros.map((n) => (
                <View key={n.rotulo} style={{ backgroundColor: COR.azul, paddingVertical: 7, paddingHorizontal: 11, minWidth: 82 }}>
                  <Text style={{ color: COR.azulClaro, fontSize: 6.8 }}>{n.rotulo}</Text>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginTop: 1 }}>{n.valor}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ height: 3, flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 58, backgroundColor: COR.azul }} />
          <View style={{ flex: 22, backgroundColor: COR.vinho }} />
          <View style={{ flex: 20, backgroundColor: COR.verde }} />
        </View>
        <CabecalhoTabela colunas={colunas} />
        {linhas.map((l, i) => (
          <LinhaTabela key={i} indice={i} colunas={colunas} celulas={l} />
        ))}
        {!linhas.length ? <Text style={{ color: COR.suave, marginTop: 8 }}>Nenhum registro.</Text> : null}
        {nota ? <Text style={[est.texto, { fontSize: 7.5, color: COR.suave, marginTop: 10 }]}>{nota}</Text> : null}
      </PaginaCorrida>
    </Document>
  )
}

export async function gerarRelatorioTabelaPDF(dados: DadosTabela): Promise<Blob> {
  return pdf(<RelatorioTabela {...dados} />).toBlob()
}

/**
 * Larguras automáticas pra uma exportação de colunas livres: proporcionais ao
 * tamanho típico do conteúdo e ajustadas pra caber na largura da página.
 */
export function colunasAutomaticas(chaves: string[], linhas: Record<string, unknown>[], larguraPagina = 770): ColunaTabela[] {
  const amostra = linhas.slice(0, 200)
  const media = (k: string) => amostra.reduce((s, l) => s + Math.min(60, String(l[k] ?? '').length), 0) / Math.max(1, amostra.length)
  const brutas = chaves.map((k) => Math.max(34, Math.max(media(k), Math.min(k.length, 14)) * 4.4 + 14))
  const fator = Math.min(1.6, larguraPagina / brutas.reduce((s, x) => s + x, 0))
  return chaves.map((k, i) => {
    const numerico = amostra.slice(0, 50).every((l) => l[k] === '' || l[k] === null || l[k] === undefined || /^-?[\d.,%]+$/.test(String(l[k])))
    return { titulo: k, largura: Math.floor(brutas[i] * fator), direita: numerico }
  })
}
