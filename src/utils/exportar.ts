/**
 * Exportação em Excel — dynamic import do `xlsx` (SheetJS) pra não pesar o
 * bundle principal. Usamos só a API de escrita (json_to_sheet/write) sobre
 * dados que o próprio app já controla — nunca lemos (`XLSX.read`) arquivo
 * enviado por terceiro, então a vulnerabilidade conhecida da versão do npm
 * (prototype pollution / ReDoS, explorável só ao parsear planilha não
 * confiável) não se aplica ao nosso uso.
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
