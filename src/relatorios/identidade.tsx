import { Font, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import mulish300 from '@fontsource/mulish/files/mulish-latin-300-normal.woff?url'
import mulish400 from '@fontsource/mulish/files/mulish-latin-400-normal.woff?url'
import mulish600 from '@fontsource/mulish/files/mulish-latin-600-normal.woff?url'
import mulish700 from '@fontsource/mulish/files/mulish-latin-700-normal.woff?url'
import mulish800 from '@fontsource/mulish/files/mulish-latin-800-normal.woff?url'
import { fmt, getHoje } from '@/utils/date'

/**
 * Identidade visual dos relatórios em PDF (item 112), tirada do Relatório
 * Integrado da FUSVE: A4 deitado, faixa taupe no topo com a marca, faixa
 * azul/vinho/verde no rodapé, títulos em peso leve, painel azul com números
 * em branco. A FUSVE usa Museo Sans (fonte paga); a Mulish (livre) é a mais
 * próxima — trocar aqui se a comunicação fornecer os arquivos da Museo.
 */

Font.register({
  family: 'Mulish',
  fonts: [
    { src: mulish300, fontWeight: 300 },
    { src: mulish400, fontWeight: 400 },
    { src: mulish600, fontWeight: 600 },
    { src: mulish700, fontWeight: 700 },
    { src: mulish800, fontWeight: 800 },
  ],
})
// Sem hifenização automática (quebrava palavras em português no meio).
Font.registerHyphenationCallback((palavra) => [palavra])

export const COR = {
  azul: '#0F63AD',
  vinho: '#811D20',
  verde: '#2EBD92',
  verdeEscuro: '#3A9C7F',
  ambar: '#A15C07',
  taupe: '#A59C97',
  tinta: '#2B2B2B',
  suave: '#6B7280',
  fio: '#E3E7EC',
  claro: '#F3F6FA',
  azulClaro: '#DCE8F5',
  fundoVinho: '#FBF2F2',
  fundoAmbar: '#FFF6E6',
  fundoVerde: '#ECF8F3',
}

export const est = StyleSheet.create({
  pagina: { fontFamily: 'Mulish', fontSize: 9, color: COR.tinta, paddingTop: 22, paddingBottom: 34 },
  paginaCorrida: { fontFamily: 'Mulish', fontSize: 9, color: COR.tinta, paddingTop: 40, paddingBottom: 40, paddingHorizontal: 30 },
  rotulo: { fontSize: 6.3, letterSpacing: 0.7, fontWeight: 700, color: COR.suave, textTransform: 'uppercase' },
  tituloPagina: { fontSize: 17, fontWeight: 300, marginBottom: 10 },
  texto: { fontSize: 9, lineHeight: 1.45, color: '#444', textAlign: 'justify' },
})

/** Faixa taupe do topo, igual à navegação do relatório da FUSVE. */
export function Barra({ texto }: { texto: string }) {
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 22,
        backgroundColor: COR.taupe,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 6.5, letterSpacing: 0.8, fontWeight: 600 }}>{texto.toUpperCase()}</Text>
      <Text style={{ color: '#fff', fontSize: 9, letterSpacing: 1.2, fontWeight: 800 }}>FUSVE</Text>
    </View>
  )
}

/** Faixa azul/vinho/verde do rodapé e a linha de emissão com a paginação. */
/** `esquerda`: início do texto (na 1ª página fica depois da coluna azul). */
export function Rodape({ documento, esquerda = 30 }: { documento: string; esquerda?: number }) {
  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  return (
    <>
      <View
        fixed
        style={{ position: 'absolute', bottom: 15, left: esquerda, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: COR.suave }}
      >
        <Text>{`Documento de uso interno · FUSVE · Setor de Compras · emitido em ${fmt(getHoje())} às ${hora} · ${documento}`}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
      <View fixed style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 9, flexDirection: 'row' }}>
        <View style={{ flex: 58, backgroundColor: COR.azul }} />
        <View style={{ flex: 22, backgroundColor: COR.vinho }} />
        <View style={{ flex: 20, backgroundColor: COR.verde }} />
      </View>
    </>
  )
}

/** Caixa de número do painel azul (contorno branco fino, número grande). */
export function CaixaNumero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <View style={{ borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.55)', padding: 9, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontSize: 7.5 }}>{rotulo}</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 1 }}>{valor}</Text>
      {detalhe ? <Text style={{ color: COR.azulClaro, fontSize: 7.5 }}>{detalhe}</Text> : null}
    </View>
  )
}

/** Selo em pílula: contorno branco (sobre azul) ou preenchido com a cor. */
export function Selo({ texto, cor, cheio }: { texto: string; cor: string; cheio?: boolean }) {
  return (
    <Text
      style={{
        color: '#fff',
        borderWidth: cheio ? 0 : 0.8,
        borderColor: cor,
        backgroundColor: cheio ? cor : undefined,
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        fontSize: 7,
        fontWeight: 700,
        marginRight: 5,
        marginBottom: 4,
      }}
    >
      {texto.toUpperCase()}
    </Text>
  )
}

/** Seção numerada: número azul, título e fio fino embaixo. */
export function Secao({ numero, titulo, children, quebra = false }: { numero?: string; titulo: string; children: ReactNode; quebra?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }} wrap={quebra}>
      <View
        minPresenceAhead={40}
        style={{ flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: 0.8, borderBottomColor: COR.fio, paddingBottom: 4, marginBottom: 8 }}
      >
        {numero ? <Text style={{ color: COR.azul, fontWeight: 800, fontSize: 10, marginRight: 7 }}>{numero}</Text> : null}
        <Text style={{ fontSize: 11.5, fontWeight: 600 }}>{titulo}</Text>
      </View>
      {children}
    </View>
  )
}

/** Campos em grade: rótulo pequeno em cima, valor embaixo. */
export function Campos({ itens, colunas = 3 }: { itens: [string, string][]; colunas?: number }) {
  const w = `${100 / colunas}%`
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {itens.map(([r, v], i) => (
        <View key={i} style={{ width: w, marginBottom: 9, paddingRight: 10 }}>
          <Text style={est.rotulo}>{r}</Text>
          <Text style={{ fontSize: 9.5, marginTop: 2.5 }}>{v || '—'}</Text>
        </View>
      ))}
    </View>
  )
}

export interface ColunaTabela {
  titulo: string
  /** Largura fixa em pt; sem largura, a coluna ocupa o resto. */
  largura?: number
  direita?: boolean
}

/** Cabeçalho de tabela azul; com `fixo`, repete em cada página (precisa ser o 1º bloco da página). */
export function CabecalhoTabela({ colunas, fixo }: { colunas: ColunaTabela[]; fixo?: boolean }) {
  return (
    <View fixed={fixo} style={{ flexDirection: 'row', backgroundColor: COR.azul, paddingVertical: 5, paddingHorizontal: 6 }}>
      {colunas.map((c) => (
        <Text
          key={c.titulo}
          style={{
            width: c.largura,
            flex: c.largura ? undefined : 1,
            color: '#fff',
            fontSize: 6.8,
            fontWeight: 700,
            letterSpacing: 0.6,
            textAlign: c.direita ? 'right' : 'left',
            paddingRight: 6,
          }}
        >
          {c.titulo.toUpperCase()}
        </Text>
      ))}
    </View>
  )
}

export interface Celula {
  texto: string
  cor?: string
  negrito?: boolean
}

export function LinhaTabela({ colunas, celulas, indice }: { colunas: ColunaTabela[]; celulas: (string | Celula)[]; indice: number }) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: indice % 2 ? COR.claro : '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: COR.fio,
      }}
    >
      {celulas.map((cel, i) => {
        const c = typeof cel === 'string' ? { texto: cel } : cel
        const col = colunas[i]
        return (
          <Text
            key={i}
            style={{
              width: col.largura,
              flex: col.largura ? undefined : 1,
              textAlign: col.direita ? 'right' : 'left',
              paddingRight: 6,
              color: c.cor ?? COR.tinta,
              fontWeight: c.negrito ? 700 : 400,
              fontSize: 8,
            }}
          >
            {c.texto}
          </Text>
        )
      })}
    </View>
  )
}

/** Caixa de pontos de atenção com faixa lateral colorida. */
export function CaixaAtencao({ titulo, itens, cor, fundo }: { titulo: string; itens: { texto: string; cor: string }[]; cor: string; fundo: string }) {
  return (
    <View wrap={false} style={{ borderLeftWidth: 3, borderLeftColor: cor, backgroundColor: fundo, padding: 9, marginBottom: 12 }}>
      <Text style={[est.rotulo, { color: cor, marginBottom: 4 }]}>{titulo}</Text>
      {itens.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2.5 }}>
          <View style={{ width: 4, height: 4, backgroundColor: p.cor, marginRight: 6 }} />
          <Text style={{ fontSize: 8.8 }}>{p.texto}</Text>
        </View>
      ))}
    </View>
  )
}
