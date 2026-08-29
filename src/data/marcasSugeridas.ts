import marcasJson from './marcasSugeridas.json'

/** Marcas de mercado sugeridas por categoria — usadas quando um produto ainda não tem parecer. */
export const MARCAS_SUGERIDAS: Record<string, string[]> = marcasJson as Record<string, string[]>
