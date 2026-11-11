import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HOSPITAIS, type HospitalId } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useContratos } from '@/hooks/useContratos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useOpmes } from '@/hooks/useOpmes'
import { usePareceres } from '@/hooks/usePareceres'
import { useMeuPerfil, usePermissaoModulo } from '@/hooks/usePermissoes'
import { useSols } from '@/hooks/useSols'
import { useTema } from '@/hooks/useTema'

/** Evento pra abrir a paleta de fora (botão de busca do topo). */
export const EVENTO_ABRIR_PALETA = 'fusve:abrir-paleta'

interface Item {
  chave: string
  grupo: string
  titulo: string
  detalhe: string
  executar: () => void
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Todas as palavras digitadas precisam aparecer, em qualquer ordem, sem acento. */
function casa(texto: string, palavras: string[]): boolean {
  const t = norm(texto)
  return palavras.every((p) => t.includes(p))
}

const POR_GRUPO = 6

/**
 * Busca e comandos por teclado (Ctrl+K) — item 3 da revisão. Uma busca só pra
 * OC, solicitação, fornecedor, contrato, parecer e paciente de OPME do hospital
 * ativo, mais os comandos de navegação.
 */
export function PaletaComandos() {
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberta((v) => !v)
      }
    }
    const abrir = () => setAberta(true)
    document.addEventListener('keydown', tecla)
    window.addEventListener(EVENTO_ABRIR_PALETA, abrir)
    return () => {
      document.removeEventListener('keydown', tecla)
      window.removeEventListener(EVENTO_ABRIR_PALETA, abrir)
    }
  }, [])

  // Os dados só são consultados com a paleta aberta.
  return aberta ? <Paleta onFechar={() => setAberta(false)} /> : null
}

function Paleta({ onFechar }: { onFechar: () => void }) {
  const navigate = useNavigate()
  const { hospitalId, setHospitalId } = useHospital()
  const { signOut } = useAuth()
  const { tema, alternar } = useTema()
  const { data: perfil } = useMeuPerfil()
  const pOcs = usePermissaoModulo('ocs')
  const pPareceres = usePermissaoModulo('pareceres')
  const pContratos = usePermissaoModulo('contratos')
  const pOpmes = usePermissaoModulo('opmes')

  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const { data: contratos = [] } = useContratos(hospitalId)
  const { data: pareceres = [] } = usePareceres()
  const { data: opmes = [] } = useOpmes(hospitalId)

  const [texto, setTexto] = useState('')
  const [indice, setIndice] = useState(0)
  const listaRef = useRef<HTMLUListElement>(null)

  const comandos = useMemo<Item[]>(() => {
    const ir = (titulo: string, to: string, detalhe = 'Abrir'): Item => ({
      chave: `cmd-${to}`,
      grupo: 'Ir para',
      titulo,
      detalhe,
      executar: () => navigate(to),
    })
    const outro = (Object.keys(HOSPITAIS) as HospitalId[]).find((h) => h !== hospitalId)
    return [
      ir('Início — resumo do dia', '/'),
      ...(pOcs.podeVer
        ? [
            ir('Ordens de Compra', '/ocs/ordens'),
            ir('OCs que precisam de ação', '/ocs/ordens?visao=acao'),
            ir('OCs vencidas', '/ocs/ordens?visao=vencidas'),
            ir('Solicitações', '/ocs/solicitacoes'),
            ir('Importar relatórios do MV', '/ocs/importar'),
            ir('Exportar', '/ocs/exportar'),
            ir('Desempenho de Entrega', '/ocs/metricas'),
            ir('Ranking de Fornecedores', '/ocs/ranking'),
            ir('Cadastro de Fornecedores', '/ocs/cadastro-fornecedores'),
          ]
        : []),
      ...(pPareceres.podeVer
        ? [ir('Consultar parecer técnico', '/pareceres'), ir('Cadastrar parecer', '/pareceres/cadastrar'), ir('Base de Pareceres', '/pareceres/base')]
        : []),
      ...(pContratos.podeVer ? [ir('Contratos — Tabela Mestre', '/contratos'), ir('Contratos vencendo', '/contratos?vigencia=vencendo')] : []),
      ...(pOpmes.podeVer ? [ir('OPME — Calendário', '/opmes'), ir('OPME — Gestão', '/opmes/gestao')] : []),
      ...(perfil?.role === 'admin' ? [ir('Admin — usuários e permissões', '/admin')] : []),
      ...(outro
        ? [
            {
              chave: 'cmd-hospital',
              grupo: 'Ações',
              titulo: `Trocar para ${HOSPITAIS[outro].sigla}`,
              detalhe: `Hospital ativo: ${HOSPITAIS[hospitalId].sigla}`,
              executar: () => setHospitalId(outro),
            },
          ]
        : []),
      {
        chave: 'cmd-tema',
        grupo: 'Ações',
        titulo: tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro',
        detalhe: 'Aparência',
        executar: alternar,
      },
      { chave: 'cmd-sair', grupo: 'Ações', titulo: 'Sair da conta', detalhe: '', executar: () => void signOut() },
    ]
  }, [navigate, hospitalId, setHospitalId, pOcs.podeVer, pPareceres.podeVer, pContratos.podeVer, pOpmes.podeVer, perfil?.role, tema, alternar, signOut])

  const itens = useMemo<Item[]>(() => {
    const palavras = norm(texto).split(/\s+/).filter(Boolean)
    if (!palavras.length) return comandos
    const achados: Item[] = []
    const juntar = (lista: Item[]) => achados.push(...lista.slice(0, POR_GRUPO))

    juntar(comandos.filter((c) => casa(`${c.titulo} ${c.detalhe}`, palavras)))
    juntar(
      ocs
        .filter((o) => casa(`${o.id} ${o.fornecedorNome} ${o.sit} ${o.estoque ?? ''}`, palavras))
        .map((o) => ({
          chave: `oc-${o.id}`,
          grupo: 'Ordens de Compra',
          titulo: `OC ${o.id}`,
          detalhe: `${o.fornecedorNome} · ${o.sit}`,
          executar: () => navigate(`/ocs/ordens?visao=todas&q=${o.id}`),
        })),
    )
    juntar(
      sols
        .filter((s) => casa(`${s.id} ${s.produto} ${s.solicitante}`, palavras))
        .map((s) => ({
          chave: `sol-${s.id}`,
          grupo: 'Solicitações',
          titulo: `Solicitação ${s.id}`,
          detalhe: s.produto,
          executar: () => navigate(`/ocs/solicitacoes?q=${s.id}`),
        })),
    )
    juntar(
      contratos
        .filter((c) => casa(`${c.titulo} ${c.fornecedorNome} ${c.fornecedorCnpj} ${c.classificacao}`, palavras))
        .map((c) => ({
          chave: `contrato-${c.id}`,
          grupo: 'Contratos',
          titulo: c.titulo || c.fornecedorNome,
          detalhe: c.titulo ? `${c.fornecedorNome} · ${c.status}` : c.status,
          executar: () => navigate(`/contratos?q=${encodeURIComponent(c.titulo || c.fornecedorNome)}`),
        })),
    )
    juntar(
      pareceres
        .filter((p) => casa(`${p.cod} ${p.nome} ${p.cat}`, palavras))
        .map((p) => ({
          chave: `parecer-${p.cod}`,
          grupo: 'Pareceres',
          titulo: p.nome,
          detalhe: `Cód. ${p.cod}${p.cat ? ` · ${p.cat}` : ''}`,
          executar: () => navigate(`/pareceres?produto=${encodeURIComponent(p.cod)}`),
        })),
    )
    juntar(
      opmes
        .filter((o) => casa(o.paciente, palavras))
        .map((o) => ({
          chave: `opme-${o.id}`,
          grupo: 'OPME',
          titulo: o.paciente,
          detalhe: `Cirurgia em ${o.dataCirurgia.split('-').reverse().join('/')} · ${o.status}`,
          executar: () => navigate(`/opmes/gestao?q=${encodeURIComponent(o.paciente)}`),
        })),
    )
    juntar(
      forns
        .filter((f) => casa(`${f.id} ${f.nome} ${f.cnpj ?? ''}`, palavras))
        .map((f) => ({
          chave: `forn-${f.id}`,
          grupo: 'Fornecedores',
          titulo: f.nome,
          detalhe: f.cnpj ? `CNPJ ${f.cnpj}` : `Cód. ${f.id}`,
          executar: () => navigate(`/ocs/ranking/${f.id}`),
        })),
    )
    return achados
  }, [texto, comandos, ocs, sols, contratos, pareceres, opmes, forns, navigate])

  const ativo = Math.min(indice, Math.max(itens.length - 1, 0))

  useEffect(() => {
    listaRef.current?.querySelector('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  const executar = (item: Item | undefined) => {
    if (!item) return
    onFechar()
    item.executar()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[10vh] animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div role="dialog" aria-label="Busca e comandos" className="flex max-h-[70vh] w-full max-w-xl animate-scale-in flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft-lg">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setIndice(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndice(Math.min(ativo + 1, itens.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndice(Math.max(ativo - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                executar(itens[ativo])
              } else if (e.key === 'Escape') {
                onFechar()
              }
            }}
            placeholder={`Buscar OC, fornecedor, contrato, parecer, paciente… (${HOSPITAIS[hospitalId].sigla})`}
            className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">Esc</kbd>
        </div>
        <ul ref={listaRef} className="overflow-y-auto py-1">
          {itens.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">Nada encontrado.</li>}
          {itens.map((item, i) => (
            <li key={item.chave}>
              {(i === 0 || itens[i - 1].grupo !== item.grupo) && (
                <div className="px-4 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.grupo}</div>
              )}
              <button
                type="button"
                data-ativo={i === ativo}
                onMouseEnter={() => setIndice(i)}
                onClick={() => executar(item)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left ${i === ativo ? 'bg-blue-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-medium ${i === ativo ? 'text-blue-700' : 'text-slate-700'}`}>{item.titulo}</span>
                  {item.detalhe && <span className="block truncate text-xs text-slate-400">{item.detalhe}</span>}
                </span>
                {i === ativo && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-blue-700" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 px-4 py-1.5 text-[11px] text-slate-400">↑ ↓ para escolher · Enter para abrir · Ctrl+K abre de qualquer tela</div>
      </div>
    </div>
  )
}
