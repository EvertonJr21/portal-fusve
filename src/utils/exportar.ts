/**
 * Exportação em Excel — dynamic import do `xlsx` (SheetJS) pra não pesar o
 * bundle principal. Usamos só a API de escrita (json_to_sheet/write) sobre
 * dados que o próprio app já controla.
 *
 * Atualização (18/09/2026): `src/utils/acompXls.ts` passou a usar `XLSX.read`
 * pra ler o relatório "Acompanhamento de Compras" quando exportado como
 * planilha em vez de PDF — a nota antiga aqui dizia que o app nunca lia
 * arquivo de terceiro via `XLSX.read`, isso não é mais 100% verdade. Risco
 * avaliado como baixo mesmo assim: é sempre o Everton subindo um export que
 * ele mesmo tirou do SoulMV, nunca arquivo de origem remota/desconhecida —
 * ver nota completa em `acompXls.ts`.
 */

export interface AbaExcel {
  nome: string
  linhas: Record<string, unknown>[]
}

export async function exportarExcel(nomeArquivo: string, abas: AbaExcel[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const aba of abas) {
    const ws = XLSX.utils.json_to_sheet(aba.linhas)
    XLSX.utils.book_append_sheet(wb, ws, aba.nome.slice(0, 31))
  }
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}
