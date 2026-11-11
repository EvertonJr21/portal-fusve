/** Iniciais pro avatar: primeiro e último nome, ou as 2 primeiras letras do e-mail. */
export function iniciais(nomeOuEmail: string): string {
  const base = nomeOuEmail.split('@')[0]
  const partes = base.split(/[\s._-]+/).filter(Boolean)
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : base.slice(0, 2)
  return letras.toUpperCase()
}
