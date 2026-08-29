# CLAUDE.md — Portal FUSVE (fusve-portal)

Contexto completo do projeto para o Claude Code.
Leia este arquivo **inteiro** antes de qualquer alteração.
Atualizado sempre que a arquitetura mudar.

---

## IDENTIDADE DO PROJETO

| Campo | Valor |
|-------|-------|
| **Sistema** | Portal unificado de gestão de compras hospitalares |
| **Organização** | FUSVE — Fundação Educacional Severino Sombra (CNPJ 32.410.037/0001-84) |
| **Responsável** | Everton da Fonseca J Junior — Setor de Compras |
| **Hospitais** | HUV (Hospital Universitário de Vassouras) e HMK (Hospital Mario Kroeff) |
| **Financiamento** | 100% SUS — otimização contínua de custo sem comprometer a continuidade operacional |
| **URL produção** | https://fusve-portal.vercel.app (a definir) |
| **Repositório** | github.com/EvertonJr21/fusve-portal (privado) |
| **Supabase** | https://urruseycrvfajnnbupyd.supabase.co |

### Módulos do portal

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **OCs** | Fundação pronta, módulo a portar | Controle de Ordens de Compra pós-emissão |
| **Pareceres Técnicos** | Fundação pronta, módulo a portar (migrar do Firebase) | Marcas aprovadas/restritas/proibidas por produto |
| **Contratos** | Fundação pronta, construir do zero | Tabela mestre, alertas de vencimento, indicadores |

---

## STACK

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Frontend | React 19 + TypeScript | Componentes reutilizáveis, tipagem em compilação (scaffold gerou React 19; ver nota abaixo) |
| Build | Vite | HMR instantâneo, zero configuração |
| Banco | Supabase (PostgreSQL) | Já em uso nas OCs, SDK tipado, realtime |
| Dados | TanStack Query v5 | Cache, retry, error handling automático |
| Estilos | Tailwind CSS v4 (CSS-first, `@theme` em `index.css`) | Utilitários, responsivo desde o início |
| Deploy | Vercel | Auto-deploy via push no GitHub |
| Versionamento | GitHub | Branch main → deploy automático |

> **Nota:** a versão original deste documento previa React 18 e `tailwind.config.ts`.
> O scaffold rodado em 2026-08-28 resolveu React 19 e Tailwind v4 (que usa
> `@theme` dentro do CSS em vez de um arquivo de config JS/TS). Mantido assim
> por ser o que o ecossistema atual instala por padrão — sem motivo para
> forçar downgrade. Ajuste esta nota se decidir fixar versões específicas.

---

## ESTRUTURA DE ARQUIVOS

```
fusve-portal/
├── index.html
├── vite.config.ts                   ← alias "@" → src/, plugin Tailwind
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── CLAUDE.md                        ← este arquivo
├── .env.local                       ← credenciais reais (gitignored, nunca commitar)
├── .env.example                     ← placeholders, este SIM é commitado
├── .gitignore
├── .claude/launch.json              ← config do preview (npm run dev)
├── _legacy/                         ← projetos antigos extraídos, só leitura/referência
│   ├── parecer/Projeto-Parecer_Fusve-main/
│   └── controle-ocs/controle-ocs-huv-main/
└── src/
    ├── main.tsx                     ← entry point, monta os providers
    ├── App.tsx                      ← roteamento (react-router) e layout raiz
    ├── vite-env.d.ts                ← tipagem de import.meta.env
    ├── types/
    │   ├── database.ts              ← gerar com: supabase gen types typescript (AINDA NÃO GERADO)
    │   └── index.ts                 ← tipos de domínio (camelCase) — hoje manuais, conferir contra database.ts quando existir
    ├── constants/
    │   └── index.ts                 ← HOSPITAIS, PRAZO, FINAL_SIT, SIT_RANK, etc. [pronto]
    ├── lib/
    │   ├── supabase.ts              ← cliente Supabase tipado [pronto — falta o genérico <Database>]
    │   └── queryClient.ts           ← configuração TanStack Query [pronto]
    ├── hooks/
    │   ├── useHospital.ts           ← contexto de hospital ativo [pronto]
    │   ├── useToast.ts              ← contexto de toast [pronto]
    │   ├── useOCs.ts                ← useOCs, useSalvarOC, useAtualizarSituacaoOC, useExcluirOC [pronto — cobrança/vínculo/histórico ficam em hooks próprios na Fase 3]
    │   ├── useSols.ts               ← useSols (só leitura nesta fase) [pronto]
    │   ├── useFornecedores.ts       ← useFornecedores (só leitura nesta fase) [pronto]
    │   ├── useHistOC.ts             ← useHistOC, useRegistrarCobranca [pronto]
    │   ├── usePareceres.ts          ← usePareceres, useParecer, useSalvarParecer, useExcluirParecer [pronto — mas tabela não existe em produção ainda, item 20 do backlog]
    │   ├── useProdutos.ts           ← useProdutos, useMarcasSugeridas — dynamic import de src/data/ sob demanda [pronto]
    │   ├── useHistoricoConsultas.ts ← histórico de sessão do módulo Pareceres (não persiste) [pronto]
    │   └── useContratos.ts          ← CRUD de Contratos [a fazer]
    ├── components/
    │   ├── HospitalProvider.tsx     ← provider do useHospital, persiste em localStorage [pronto]
    │   ├── ui/                      ← componentes genéricos reutilizáveis
    │   │   ├── Sidebar.tsx          ← navegação agrupada por módulo, com link "← Módulos" [pronto]
    │   │   ├── Topbar.tsx           [pronto]
    │   │   ├── HospitalSwitch.tsx   [pronto]
    │   │   ├── Toast.tsx            [pronto]
    │   │   ├── Badge.tsx            [pronto]
    │   │   ├── Button.tsx           [pronto]
    │   │   ├── Table.tsx            ← wrapper + SortableTh genérico [pronto]
    │   │   ├── Modal.tsx            [pronto]
    │   │   └── KpiCard.tsx          [pronto]
    │   ├── ocs/                     ← módulo completo: Dashboard, KpisOC, OCFilters, OCTable,
    │   │                              OCForm, OCVincular, OCHistorico, OCCobrar, FornecedorForm,
    │   │                              SolForm, filters.ts [tudo pronto]
    │   ├── pareceres/                ← SearchProduto, MarcasEditor, MarcasBadge, ParecerCard, ParecerForm, HistoricoConsultasProvider [tudo pronto]
    │   └── contratos/                [a fazer: ContratoTable, ContratoForm, ContratoAlertas]
    ├── pages/
    │   ├── Modulos.tsx              ← tela inicial de seleção de módulo [pronto]
    │   ├── ocs/                     ← Dashboard, OrdensDeCompra, Solicitacoes, Resumo,
    │   │                              PorFornecedor, Fornecedores (cadastro), Metricas,
    │   │                              Importar [tudo pronto — falta só Backup]
    │   ├── pareceres/                ← Consultar, Cadastrar, Base, Bionexo, Dashboard [tudo pronto]
    │   └── contratos/
    │       └── TabelaMestre.tsx     ← placeholder [demais páginas a fazer: Alertas, Indicadores]
    └── utils/
        ├── date.ts                  ← getHoje, parseDMY, fmt, toInput, fromInput, addDias, diasEntre [pronto]
        ├── oc.ts                    ← statusPrazo (semáforo), riscoOC, diasSemMovimentacao, previsaoAtiva, KPIs puros [pronto]
        ├── cobranca.ts              ← templates de mensagem (individual/lote), links Outlook/WhatsApp [pronto]
        ├── csv.ts                   ← parseOCsCSV, parseSolsCSV [pronto]
        ├── pdf.ts                   ← extractPdfLines, parseAcompPDF (pdfjs-dist, carregado sob demanda) [pronto — ver nota abaixo]
        ├── bionexo.ts                ← parseBionexoText, parseItensManual [pronto]
        ├── marcas.ts                 ← CATEGORIAS_MARCA, statusBionexoDoParecer [pronto]
        ├── relatorioParecer.ts       ← gerarRelatorioPDF (jspdf+autotable, carregado sob demanda) [pronto]
        ├── validators.ts            [a fazer]
        └── formatters.ts            [a fazer]

    src/data/                        ← PRODUTOS_SOULMV (4.579 itens) e MARCAS_SUGERIDAS, carregados via
                                        dynamic import em useProdutos.ts — não pesam no bundle principal

    scripts/migrate-pareceres.ts     ← migração Firebase → Supabase, pronta, não executada (ver item 4 do backlog)
```

**Nota sobre `pdf.ts`:** só o parser de "Acompanhamento de Compras" (`parseAcompPDF`) foi portado — é o único fluxo de PDF sem equivalente em CSV (o vínculo automático OC↔Solicitação). Os parsers de OC e Solicitação via PDF do legado (`parseOC`/`parseSol` em `_legacy/.../pdf.js`) não foram portados: são dois parsers redundantes com o CSV (mesma informação, fonte menos confiável) e muito baseados em regex heurística de posição — portar sem um arquivo real do SoulMV pra testar contra é risco alto de corromper dados de compras reais silenciosamente.

**Importação não testada contra produção:** os parsers de CSV/PDF foram validados por `tsc`/build e por leitura manual do código legado, mas nunca rodados contra um arquivo real do SoulMV — teste com um arquivo pequeno antes de confiar neles com a base de 659 OCs.

---

## BANCO DE DADOS — SUPABASE

### Projeto
- **URL:** `https://urruseycrvfajnnbupyd.supabase.co`
- **Anon key:** no `.env.local` como `VITE_SUPABASE_ANON_KEY` (nunca em arquivo versionado)
- **Gerar tipos:** `npx supabase gen types typescript --project-id urruseycrvfajnnbupyd > src/types/database.ts`

> ⚠️ **RLS atual é `USING (true)` para o role anon em todas as tabelas** — qualquer
> pessoa com a URL do app e a anon key (visível no DevTools do navegador) pode
> ler e escrever todas as tabelas, sem autenticação. Aceitável enquanto o app
> roda só localmente. **Antes do primeiro deploy público em Vercel**, isso
> precisa de RLS real (policies por usuário autenticado) — ver item 12 do
> backlog. Não pular essa etapa por conveniência.

---

### Tabela `ocs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer PK | Número da OC no SoulMV |
| `data_solic` | text | DD/MM/YYYY — data da solicitação de origem |
| `fornecedor_nome` | text | Nome do fornecedor |
| `fornecedor_id` | integer | Código do fornecedor no SoulMV |
| `sit` | text | `Autorizada` \| `Parcialmente Atendida` \| `Atendida` \| `Cancelada` \| `Aberta` |
| `estoque` | text | Ex: `SUP CAF`, `SUP HEMODINAMICA` |
| `solicitacao_id` | integer | FK → `sols.id` |
| `cobrado` | boolean | Se já houve cobrança registrada |
| `previsao_forn` | text | DD/MM/YYYY prometida pelo fornecedor |
| `previsao_forn2` | text | DD/MM/YYYY segunda entrega (para parciais) |
| `data_entrega_real` | text | DD/MM/YYYY efetiva |
| `dias_atraso` | integer | Calculado pelo SoulMV |
| `hospital_id` | text | `'huv'` \| `'mkr'` |
| `proxima_acao` | text | Cobrar fornecedor \| Aguardar retorno \| etc. |
| `motivo_atraso` | text | Sem estoque \| Transportadora \| etc. |
| `ultima_movimentacao` | text | DD/MM/YYYY da última ação |
| `previsao_descumprida` | boolean | Previsão passou sem entrega |
| `deleted_at` | timestamptz | Soft delete — null = ativo |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### Tabela `sols`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer PK | Número da solicitação no SoulMV |
| `data` | text | DD/MM/YYYY |
| `produto` | text | Descrição do produto |
| `motivo` | text | COTACAO \| COMPRA NORMAL \| COMPRA PARA REPOSICAO ESTOQUE \| etc. |
| `solicitante` | text | Nome do solicitante |
| `qtd` | integer | Quantidade |
| `sit` | text | Aberta \| Fechada \| Cancelada \| Parcialmente Atendida |
| `hospital_id` | text | `'huv'` \| `'mkr'` |
| `deleted_at` | timestamptz | Soft delete |

### Tabela `forns`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer PK | Código do fornecedor no SoulMV |
| `nome` | text | Nome |
| `email` | text | E-mail para cobrança |
| `wpp` | text | WhatsApp: 55+DDD+número (só dígitos) |
| `deleted_at` | timestamptz | Soft delete |

### Tabela `hist_oc`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `hid` | integer PK AUTOINCREMENT | |
| `oc_id` | integer | FK → `ocs.id` |
| `ts` | bigint | Timestamp Unix ms |
| `canal` | text | `'mail'` \| `'wpp'` \| `'mail (lote)'` \| `'lembrete'` |
| `resposta` | text | Observação registrada |
| `tipo` | text | `'individual'` \| `'lote'` \| `'lembrete'` |

### Tabela `pareceres`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `cod` | text PK | Código do produto no SoulMV (ex: `"22045"`) |
| `nome` | text | Nome padronizado do produto |
| `cat` | text | Categoria (ex: `AGULHAS`, `CATETERES`) |
| `padrao` | text[] | Marcas padrão (aprovadas preferencialmente) |
| `permitidas` | text[] | Marcas permitidas (aceitas) |
| `restritas` | text[] | Marcas restritas (requerem justificativa) |
| `proibidas` | text[] | Marcas proibidas (não aceitar) |
| `observacao` | text | Observação técnica livre |
| `responsavel` | text | Nome do responsável pelo parecer |
| `data_parecer` | text | DD/MM/YYYY do parecer |
| `parecer` | text | Texto livre do parecer |
| `pdf_data_url` | text | PDF do parecer em base64 (pode ser null) |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### Tabela `contratos`

Redesenhada na Fase 5 (29/08/2026) a pedido do Everton — o desenho de uma linha
por item não comportava fornecedor estruturado, múltiplos produtos, logística
e regras de renovação. Como a tabela nunca chegou a ser criada em produção
(confirmado via API antes da Fase 5), essa foi uma substituição limpa, sem
migração de dados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `tipo` | text | `'Contrato'` \| `'Acordo Comercial'` |
| `status` | text | `'Ativo'` \| `'Inativo'` \| `'Em Negociação'` \| `'Suspenso'` |
| `fornecedor_nome` | text | Razão social / nome do fornecedor |
| `fornecedor_cnpj` | text | Autopreenchível via busca de CNPJ (BrasilAPI) |
| `contato_nome` / `contato_email` / `contato_whatsapp` | text | Contato operacional (vendedor/gerente de conta) |
| `frete_tipo` | text | `'CIF'` \| `'FOB'` |
| `prazo_medio_dias` | integer | Prazo médio de entrega |
| `origem_embarque` | text | Cidade/UF de origem — base pro cálculo de frete FOB |
| `tolerancia_atraso_dias` | integer | Dias de margem antes de virar "fornecedor crítico" |
| `horario_cutoff` | text | Horário limite pra pedido manter o prazo padrão |
| `gatilho_desconto` | text | Texto livre — regra de desconto por volume |
| `reajuste_regra` | text | Texto livre — Ex: "Anual pelo IPCA" |
| `vigencia_inicio` / `vigencia_fim` | date | Vigência do contrato |
| `aviso_renovacao_dias` | integer | Dias antes do vencimento pra alertar (30/60/90) |
| `renovacao_automatica` | boolean | Se o contrato se renova sozinho |
| `hospital_id` | text | `'huv'` \| `'mkr'` \| `'ambos'` |
| `classificacao` | text | `OPME` \| `CME` \| `Farmácia` \| `Infraestrutura` \| etc. |
| `observacoes` | text | |
| `deleted_at` / `created_at` / `updated_at` | timestamptz | |

### Tabela `contrato_produtos`

Produtos de um contrato — 1 contrato pode ter N produtos (relação 1:N via `contrato_id`).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `contrato_id` | uuid | FK → `contratos.id`, `ON DELETE CASCADE` |
| `sku` | text | Código interno pro app conversar com ERP/estoque no futuro |
| `descricao` | text | Nome do produto |
| `cod_soulmv` | text | Código no SoulMV |
| `preco_unitario` | numeric(12,2) | |
| `unidade` | text | Ex: `UNIDADE`, `CAIXA`, `KIT` |
| `moq` | integer | Quantidade mínima de pedido exigida pelo fornecedor |
| `capacidade_fornecimento` | integer | Quantidade máxima que o fornecedor entrega por período |
| `capacidade_periodo` | text | `'semana'` \| `'mes'` |
| `meio_pagamento` | text | |
| `deleted_at` / `created_at` / `updated_at` | timestamptz | |

---

### SQL de migração completo

```sql
-- ── OCs ──────────────────────────────────────────────────────────────
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS previsao_forn2    text;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS deleted_at        timestamptz DEFAULT NULL;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS created_at        timestamptz DEFAULT now();
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();

-- ── Solicitações ─────────────────────────────────────────────────────
ALTER TABLE sols ADD COLUMN IF NOT EXISTS deleted_at       timestamptz DEFAULT NULL;
ALTER TABLE sols ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now();

-- ── Fornecedores ─────────────────────────────────────────────────────
ALTER TABLE forns ADD COLUMN IF NOT EXISTS deleted_at      timestamptz DEFAULT NULL;

-- ── Pareceres (nova tabela) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pareceres (
  cod           text PRIMARY KEY,
  nome          text NOT NULL DEFAULT '',
  cat           text NOT NULL DEFAULT '',
  padrao        text[] NOT NULL DEFAULT '{}',
  permitidas    text[] NOT NULL DEFAULT '{}',
  restritas     text[] NOT NULL DEFAULT '{}',
  proibidas     text[] NOT NULL DEFAULT '{}',
  observacao    text NOT NULL DEFAULT '',
  responsavel   text NOT NULL DEFAULT '',
  data_parecer  text NOT NULL DEFAULT '',
  parecer       text NOT NULL DEFAULT '',
  pdf_data_url  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── Contratos (novo desenho — Fase 5, 2 tabelas) ────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                    text NOT NULL DEFAULT 'Contrato',
  status                  text NOT NULL DEFAULT 'Ativo',
  fornecedor_nome         text NOT NULL,
  fornecedor_cnpj         text DEFAULT '',
  contato_nome            text DEFAULT '',
  contato_email           text DEFAULT '',
  contato_whatsapp        text DEFAULT '',
  frete_tipo              text DEFAULT '',
  prazo_medio_dias        integer,
  origem_embarque         text DEFAULT '',
  tolerancia_atraso_dias  integer,
  horario_cutoff          text DEFAULT '',
  gatilho_desconto        text DEFAULT '',
  reajuste_regra          text DEFAULT '',
  vigencia_inicio         date,
  vigencia_fim            date,
  aviso_renovacao_dias    integer DEFAULT 60,
  renovacao_automatica    boolean DEFAULT false,
  hospital_id             text NOT NULL DEFAULT 'ambos',
  classificacao           text DEFAULT '',
  observacoes             text DEFAULT '',
  deleted_at              timestamptz DEFAULT NULL,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contrato_produtos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id               uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  sku                       text DEFAULT '',
  descricao                 text NOT NULL,
  cod_soulmv                text DEFAULT '',
  preco_unitario            numeric(12,2) NOT NULL DEFAULT 0,
  unidade                   text DEFAULT 'UNIDADE',
  moq                       integer,
  capacidade_fornecimento   integer,
  capacidade_periodo        text DEFAULT 'mes',
  meio_pagamento            text DEFAULT '',
  deleted_at                timestamptz DEFAULT NULL,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ocs_hospital        ON ocs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ocs_deleted         ON ocs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sols_hospital       ON sols(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contratos_hospital  ON contratos(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contratos_vigencia  ON contratos(vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_contrato ON contrato_produtos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pareceres_cat       ON pareceres(cat);

-- ── RLS ──────────────────────────────────────────────────────────────
-- ATENÇÃO: policies abaixo liberam tudo para o role anon. Ver aviso no
-- topo da seção "BANCO DE DADOS" — trocar por policies reais antes do
-- deploy público.
ALTER TABLE ocs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sols       ENABLE ROW LEVEL SECURITY;
ALTER TABLE forns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hist_oc    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pareceres        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_ocs"             ON ocs             FOR ALL USING (true);
CREATE POLICY "anon_sols"            ON sols            FOR ALL USING (true);
CREATE POLICY "anon_forns"           ON forns           FOR ALL USING (true);
CREATE POLICY "anon_hist_oc"         ON hist_oc         FOR ALL USING (true);
CREATE POLICY "anon_pareceres"       ON pareceres       FOR ALL USING (true);
CREATE POLICY "anon_contratos"       ON contratos       FOR ALL USING (true);
CREATE POLICY "anon_contrato_produtos" ON contrato_produtos FOR ALL USING (true);
```

---

## CONSTANTES DE DOMÍNIO

Já implementadas em `src/constants/index.ts` — ver o arquivo, não duplicar
aqui. Contém `HOSPITAIS`, `PRAZO`, `FINAL_SIT`, `SIT_RANK`, `SITUACOES_OC`,
`TIPOS_CONTRATO`, `CLASSIFICACOES_CONTRATO`, `ALERTA_VENCIMENTO_DIAS`,
`ALERTA_CRITICO_DIAS`.

---

## REGRAS DE ARQUITETURA — INEGOCIÁVEIS

### 1. Sem escopo global
Nenhuma variável fora de um componente ou hook. Estado compartilhado via Context (`useHospital`, `useToast`) ou TanStack Query.

### 2. Sem magic strings
Toda string que se repete vai em `src/constants/index.ts`.

### 3. Tipos gerados do banco
```bash
npx supabase gen types typescript --project-id urruseycrvfajnnbupyd > src/types/database.ts
```
Rodar sempre que o schema mudar. **Ainda não rodado neste projeto** — `src/types/index.ts` hoje é escrito manualmente e precisa ser conferido contra o schema real assim que o CLI rodar.

### 4. Um hook por entidade
Todo acesso ao Supabase passa por um hook TanStack Query. Nenhum componente faz fetch diretamente.

```typescript
// Exemplo correto
export function useOCs(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['ocs', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null)
        .order('id', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
```

### 5. Tratamento de erro obrigatório
Todo hook tem `onError`. Todo componente exibe estado de erro visível.

### 6. Soft delete sempre
`DELETE` físico nunca. Sempre `PATCH { deleted_at: new Date().toISOString() }`.

### 7. Multi-hospital
Toda query de OCs e Solicitações filtra por `hospital_id`. Fornecedores e Pareceres são compartilhados.

### 8. Hierarquia de situações
Parsers nunca retrocedem situação. Usar `SIT_RANK` para comparar.

### 9. Responsividade desde o início
Tailwind responsivo em todos os componentes. Nunca adicionar responsividade depois como correção.

### 10. `getHoje()` sempre
Já implementado em `src/utils/date.ts`. Nunca `new Date()` diretamente para comparações de prazo.

---

## REGRAS DE NEGÓCIO CRÍTICAS

### OCs
1. **Prazo institucional:** 15 dias a partir da **data da solicitação** (não da OC) — `dataPrazo()` em `src/utils/oc.ts`
2. **Prazo do fornecedor:** medido da data da OC
3. **Semáforo** (`statusPrazo()` em `src/utils/oc.ts`):
   - `vencida` → mais de 15 dias sem entrega
   - `urgente` → ≤ 3 dias restantes
   - `atendida` → situação final
4. **Risco da OC** (`riscoOC()` em `src/utils/oc.ts`):
   - `alto` → vencida OU previsão descumprida OU 10+ dias sem movimentação
   - `medio` → urgente OU 5+ dias sem movimentação
   - `baixo` → demais casos
5. **Fornecedores** são compartilhados entre HUV e HMK

### Pareceres Técnicos
6. **Hierarquia de marcas:** Padrão > Permitida > Restrita > Proibida
7. **Base de produtos:** 4.579 produtos do SoulMV (importados de `_legacy/parecer/Projeto-Parecer_Fusve-main/js/data.js` — 380 KB, ainda não portado)
8. **Parecer por código:** o `cod` é o código do produto no SoulMV — chave primária
9. **Marcas:** arrays de strings. Uma marca pode estar em apenas uma categoria por produto

### Contratos
10. **Alerta de vencimento:** 90 dias antes — amarelo. 30 dias — vermelho
11. **Preço médio ponderado:** sempre `valor total ÷ quantidade total`, nunca média simples
12. **Excluir transferências internas FUSVE** dos cálculos de compra
13. **OPME:** exige campos e sinalização distintos
14. **Compra fora do contrato vigente:** sinalizar quando existe contrato ativo e OC foi feita spot

---

## IMPORTAÇÃO DE DADOS DO SOULMV

### 1. R_ORD_COM_FOR.csv — Ordens de Compra
- Encoding: `latin-1` (detectar automaticamente)
- Campos: id, data_ordem, situação, fornecedor_id, fornecedor_nome, estoque, previsão, dias_atraso
- Nunca regredir situação (usar `SIT_RANK`)

### 2. R_SOL_PEND_DATA.csv — Solicitações
- Encoding: `latin-1`
- Campos: id, data, produto, motivo, solicitante, setor, estoque, situação, qtd

### 3. Acompanhamento de Compras (PDF obrigatório)
- Vincula OCs às Solicitações de origem automaticamente
- Parser usa PDF.js — a lógica de referência é `_legacy/controle-ocs/controle-ocs-huv-main/src/js/pdf.js` (`parseAcomp`), ainda não portada para `src/utils/pdf.ts`

---

## MIGRAÇÃO DO FIREBASE → SUPABASE (Pareceres)

O projeto `_legacy/parecer/Projeto-Parecer_Fusve-main` usa Firebase Firestore
(config real em `_legacy/parecer/Projeto-Parecer_Fusve-main/js/firebase.js`
— **não commitar esse arquivo do jeito que está, tem o `apiKey` do Firebase
em texto puro**). Script de migração a criar em `scripts/migrate-pareceres.ts`,
lendo as credenciais do Firebase via variáveis de ambiente, não hardcoded:

```typescript
// scripts/migrate-pareceres.ts
// Rodar UMA VEZ com: npx ts-node scripts/migrate-pareceres.ts
// Requer no .env (ou .env.local): FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN,
// FIREBASE_PROJECT_ID, SUPABASE_SERVICE_KEY

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { createClient } from '@supabase/supabase-js'

const firebase = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
})
const firestoreDb = getFirestore(firebase)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // usar service_role, não anon
)

const snap = await getDocs(collection(firestoreDb, 'pareceres'))
const pareceres = snap.docs.map(d => ({
  cod:          d.id,
  nome:         d.data().nome         || '',
  cat:          d.data().cat          || '',
  padrao:       d.data().padrao        || [],
  permitidas:   d.data().permitidas    || [],
  restritas:    d.data().restritas     || [],
  proibidas:    d.data().proibidas     || [],
  observacao:   d.data().observacao    || '',
  responsavel:  d.data().responsavel   || '',
  data_parecer: d.data().data_parecer  || '',
  parecer:      d.data().parecer       || '',
  pdf_data_url: d.data().pdf_data_url  || null,
}))

const { error } = await supabase.from('pareceres').upsert(pareceres)
if (error) throw error
console.log(`Migrados: ${pareceres.length} pareceres`)
```

---

## FUNCIONALIDADES POR MÓDULO

### Módulo OCs
- Central de Pendências com KPIs (Vencidas, Sem Previsão, Sem Movimentação, Prev. Descumprida, Parciais)
- Tabela de OCs com filtros avançados (situação, prazo, estoque, vínculo, data de previsão)
- Filtros rápidos (chips): Vencidas, Urgentes, Sem previsão, Sem movimentação, Parciais
- Semáforo de prazo com dias restantes/vencidos
- Coluna Risco com dias sem movimentação
- Badges de previsão (1ª = roxo, 2ª = âmbar para parciais)
- Cobrança por e-mail (Outlook Web) e WhatsApp Web
- Cobrança em lote por fornecedor
- Histórico de cobranças por OC
- Vínculo OC ↔ Solicitação
- Importação CSV (OCs e Solicitações) e PDF (Acompanhamento de Compras)
- Métricas: lead time, taxa de cumprimento, taxa de parciais, índice de reincidência

### Evolução do módulo OCs — roadmap (registrado 29/08/2026, spec completa do Everton)

O objetivo é o comprador conseguir responder, ao abrir o sistema: o que precisa da minha
atenção agora, o que está atrasado, o que está prestes a atrasar, quais fornecedores estão
com problema ou sem responder, quais previsões foram descumpridas, onde estão os gargalos,
como está o SLA. Fluxo do sistema: **Solicitação → Cotação → Negociação → OC → Previsão →
Cobrança → Resposta → Entrega → Análise do fornecedor**. O sistema não deve tentar substituir
outros setores/sistemas do hospital.

**Fora do escopo, deliberadamente** (não implementar sem justificativa explícita nova):
histórico de preços (já dá pra ver no MV), controle de consumo (é de outra equipe), cálculo
de estoque/cobertura/ruptura (fora da responsabilidade do comprador), permissões/aprovação/
auditoria multiusuário (só o Everton opera o sistema hoje — revisar arquitetura só se isso
mudar).

**Antes de implementar qualquer coisa nova**, checar: pertence ao fluxo de compras? já existe
no MV? é responsabilidade de outro setor? reduz trabalho do comprador? melhora acompanhamento
de OC ou gestão de fornecedor? Se a resposta apontar pra "não", não implementar.

**Roadmap (ordem de prioridade do Everton):**

- **Fase 1 — Operação** (prioridade máxima): central "O que preciso fazer hoje?" com
  priorização automática (não só o status da OC — considerar prazo, previsão, atraso,
  existência de cobrança, resposta do fornecedor, descumprimento de previsão, tempo desde a
  última movimentação) em 4 níveis (🔴 Crítica / 🟠 Alta / 🟡 Média / 🟢 Normal); cada
  pendência mostra OC, fornecedor, data, prazo, previsão, dias restantes/atraso, última
  movimentação, última cobrança, status, prioridade e **ação recomendada**; ações rápidas
  inline (registrar cobrança, atualizar previsão, registrar resposta, registrar entrega, abrir
  OC, mudar status) sem navegar de tela; histórico de cobrança como **linha do tempo** da OC
  (não lista solta); registro explícito de previsão prometida × entrega real, com o desvio em
  dias.
- **Fase 2 — Fornecedores**: score 0–100 por fornecedor (35pts cumprimento de prazo, 25pts
  taxa de atraso, 15pts cumprimento de previsões, 15pts responsividade, 10pts tempo de
  resposta — pesos configuráveis no futuro), acompanhado por período; ranking com filtro por
  período/hospital/fornecedor/qtd mínima de OCs; ficha individual do fornecedor (resumo +
  histórico de ocorrências); indicador de responsividade (% de cobranças respondidas) e tempo
  médio de resposta (cobrança→resposta: média, mediana, min, max); confiabilidade da previsão
  como indicador **separado** do cumprimento do prazo original (um fornecedor pode cumprir o
  prazo mas não a previsão, ou vice-versa — preservar a diferença); identificação automática de
  fornecedores problemáticos (comparar taxa de atraso individual vs. média geral).
- **Fase 3 — Gestão**: motivo da ocorrência classificado (atraso do fornecedor, falta de
  produto, logística, transportadora, entrega parcial, sem resposta, previsão alterada,
  cancelamento, outro) + painel de causas mais frequentes; painel de SLA separando **SLA
  interno** (Solicitação→OC) de **SLA do fornecedor** (OC→entrega) — nunca misturar os dois;
  indicadores de tempo por etapa do processo (Solicitação→Cotação→Negociação→OC); dashboard
  executivo com os indicadores acionáveis (nada decorativo), cada um clicável pra abrir as OCs
  correspondentes.
- **Fase 4 — Produtividade**: busca global (nº de OC, fornecedor, nº de solicitação, produto,
  status); exportação segmentada (atrasadas, sem previsão, por fornecedor, cobranças, SLA,
  fornecedores, ocorrências, mensal) em Excel/PDF; relatório gerencial mensal automático
  (resumo, fornecedores críticos, principais ocorrências) baseado só em dados do sistema.

UX: poucos cliques, informação importante visível de cara, filtros persistentes, ações
rápidas, busca rápida, carregamento rápido — evitar telas complexas demais.


- Base de 4.579 produtos do SoulMV (importar de `_legacy/parecer/.../js/data.js`)
- Consulta por código, nome ou categoria
- Visualização de marcas por categoria (Padrão/Permitida/Restrita/Proibida)
- Cadastro e edição de pareceres
- Integração Bionexo: colar PDF da cotação → verificar marcas automaticamente (lógica de referência: `parseBionexoText` em `_legacy/parecer/.../js/engine.js`, é pura e porta quase 1:1 para TS)
- Histórico de consultas por sessão
- Geração de PDF do parecer

### Módulo Contratos
- Tabela mestre de itens (código SoulMV, fornecedor, preço, vigência)
- Alertas de vencimento (90 dias = amarelo, 30 dias = vermelho)
- Detecção de compra spot quando existe contrato ativo
- Preço médio ponderado por item/fornecedor/período
- Ranking de fornecedores por pontualidade e competitividade
- % de gasto sob contrato vs. spot
- Itens candidatos a contrato (spot recorrente)

### Integração entre módulos
- OC → clica no produto → abre parecer técnico correspondente
- OC com preço fora do contrato → alerta visual na tabela

---

## PADRÕES DE CÓDIGO

### Datas
```typescript
import { getHoje, parseDMY, fmt, toInput } from '@/utils/date'

parseDMY('26/05/2026')   // string DD/MM/YYYY → Date
fmt(date)                // Date → string DD/MM/YYYY
toInput('26/05/2026')    // DD/MM/YYYY → 'YYYY-MM-DD' (para input[type=date])
getHoje()                // Date com horas zeradas
```

### Componentes
```typescript
// Props sempre tipadas com interface
interface OCTableProps {
  hospitalId: HospitalId
  onEdit: (id: number) => void
}

// Erro e loading obrigatórios
const { data, error, isLoading } = useOCs(hospitalId)
if (isLoading) return <Spinner />
if (error) return <ErrorMessage message={error.message} />
```

### Tailwind
```tsx
// Responsivo desde o início
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
// Tokens do design system em src/index.css (@theme) — cores institucionais:
// --color-huv (#1A4A80), --color-hmk (#196030)
// Nunca estilos inline para layout
```

---

## CHECKLIST ANTES DE COMMITAR

- [ ] `npx tsc -b --noEmit` sem erros
- [ ] `npm run build` sem erros
- [ ] Nenhuma variável no escopo global
- [ ] Nenhuma magic string fora de `constants/`
- [ ] Todo acesso ao Supabase dentro de um hook
- [ ] Todo hook tem tratamento de erro
- [ ] Nenhum `any` sem justificativa comentada
- [ ] Componentes novos têm props tipadas com interface
- [ ] Nenhuma chave/segredo em arquivo versionado (`git grep -i "apikey\|anon.*key\|service_role"` limpo fora de `.env.local`)
- [ ] CLAUDE.md atualizado se a arquitetura mudou

---

## FLUXO DE DESENVOLVIMENTO

```
1. Everton descreve a mudança no Claude Code
2. Claude Code lê este CLAUDE.md na íntegra
3. Claude Code edita os arquivos
4. Claude Code valida: npx tsc -b --noEmit && npm run build
5. Everton faz push no GitHub
6. Vercel detecta → deploy automático (~30s)
7. Dados no Supabase intactos
```

---

## O QUE APRENDEMOS NO PROJETO VANILLA (não repetir)

| Bug encontrado | Causa raiz | Solução na nova stack |
|---|---|---|
| `const` duplicado quebrando tudo | Dois arquivos declaravam as mesmas vars no escopo global | TypeScript detecta em compilação |
| Boot executava antes das funções existirem | Ordem de `<script>` errada | Vite resolve imports automaticamente |
| `getElementById('cpn')` quebrando silenciosamente | ID errado, sem verificação de null | TypeScript obriga tratar null |
| `excluirForn` registrada duas vezes | Listener adicionado a cada re-render | React re-renders não duplicam listeners |
| 32 chamadas sem `try/catch` | Adicionado aos poucos sem padrão | TanStack Query trata erros por padrão |
| OCs voltando para "Autorizada" no import | Parser não verificava hierarquia | `SIT_RANK` no parser CSV |
| CSS quebrando em resoluções diferentes | Larguras fixas em px | Tailwind responsivo desde o início |
| Dados de dois hospitais misturados | `dbClear` sem filtro de hospital | Sempre filtrar `hospital_id` nas queries |
| `hoje` estático para o dia inteiro | `const hoje = new Date()` no carregamento | `getHoje()` sempre retorna data atual |
| `AppState` mutado de qualquer arquivo | Escopo global sem controle | `useState` / Context isolados por componente |
| Credenciais Firebase/Supabase hardcoded em `config.js`/`firebase.js`, versionadas no GitHub | Sem hábito de `.env` no projeto vanilla | `.env.local` (gitignored) + `.env.example` (placeholders); RLS ainda pendente antes do deploy público |

---

## BACKLOG

| # | Item | Módulo | Prioridade | Status |
|---|------|--------|-----------|--------|
| 1 | Setup inicial React + TypeScript + Vite + Tailwind + Supabase | Base | Alta | ✅ Feito |
| 2 | Tipos gerados do banco (`supabase gen types`) | Base | Alta | Pendente |
| 3 | Layout base: sidebar, topbar, troca de hospital, toast | Base | Alta | ✅ Feito |
| 4 | Script de migração Firebase → Supabase (Pareceres) | Pareceres | Alta | ✅ Feito (29/08/2026) — `npm run migrate:pareceres` rodado, **98 pareceres** migrados do Firestore (`parecer-tecnico-huv`) pra tabela `pareceres`, confirmado via API |
| 5 | Migrar lógica de OCs do vanilla para hooks React | OCs | Alta | ✅ Feito — módulo OCs completo |
| 6 | Dashboard de Pendências (KPIs + fila de cobrança) | OCs | Alta | ✅ Feito (fila sequencial simplificada para "cobrar todos visíveis" em lote, sem o painel passo-a-passo do legado) |
| 7 | Tabela de OCs com filtros e importação CSV | OCs | Alta | ✅ Feito, inclui importação CSV |
| 8 | Módulo de Pareceres: consulta + cadastro + Bionexo | Pareceres | Média | ✅ Feito (Consultar, Cadastrar, Base, Bionexo, Dashboard) — **mas não testado com dados reais**, ver item 20 |
| 9 | Tabela mestre de Contratos + alertas de vencimento | Contratos | Média | ✅ Feito (schema redesenhado a pedido do Everton — cabeçalho + produtos, contato, logística, comercial, renovação; ver item 20) — Alertas/Indicadores como páginas separadas ficaram de fora, entram como badge/KPI na própria tabela mestre |
| 10 | Integração OC → Parecer (clique no produto) | Integração | Média | Pendente (depende do módulo Pareceres existir) |
| 11 | Métricas expandidas (lead time, reincidência, etc.) | OCs | Média | ✅ Lead time feito (bug do legado corrigido — ver seção "Aprendemos"); índice de reincidência não implementado (não existia no legado) |
| 14 | Cobrança individual/lote, vínculo OC↔Solicitação, histórico | OCs | Alta | ✅ Feito |
| 15 | Fornecedores agrupados + Cadastro de Fornecedores | OCs | Média | ✅ Feito |
| 16 | Solicitações (tela própria) + Resumo Diário | OCs | Média | ✅ Feito |
| 17 | Importação PDF (Acompanhamento de Compras) | OCs | Média | ✅ Feito — únicos parsers de PDF portados; ver nota abaixo |
| 18 | Backup (exportar/importar JSON) | OCs | — | ❌ Não necessário — só existia pra migrar dados antes de o app usar o Supabase, já feito manualmente |
| 12 | RLS real (policies por usuário autenticado) — pré-requisito do primeiro deploy público | Base | **Alta antes do deploy** | Pendente |
| 13 | Autenticação real (3 usuários) | Base | Baixa (a não ser que a 12 suba a prioridade) | Pendente |
| 19 | **Grandes melhorias visuais/UX no frontend** — Everton achou o visual atual muito básico (28/08/2026), pediu "fluido e bonito como sites mais novos" (29/08/2026). Redesenhei os componentes compartilhados (`src/components/ui/*`): tipografia própria (Plus Jakarta Sans + JetBrains Mono via Google Fonts), sombras em camadas, `Modal`/`Toast` com animação de entrada/saída, `Sidebar` com barra de destaque animada no item ativo, transição de rota, `KpiCard`/`Button`/`Table` com microinterações, `Skeleton`/`EmptyState` novos (aplicados nas telas de maior tráfego: Central de Pendências, Ordens de Compra, Base de Pareceres, Contratos). Por afetar os componentes de base, o visual novo já se propaga pro app inteiro — mas telas específicas (Solicitações, Por Fornecedor, Métricas, etc.) ainda usam texto simples pra loading/vazio em vez de Skeleton/EmptyState. | Base/Todos módulos | Alta | ✅ Fundação feita (29/08/2026) — aplicar Skeleton/EmptyState nas telas restantes fica pra quando fizer sentido |
| 20 | Criar as tabelas `pareceres`, `contratos` e `contrato_produtos` no Supabase de produção | Pareceres, Contratos | Alta | ✅ Feito (29/08/2026) — Everton rodou o SQL no SQL Editor; confirmado via API que as 3 tabelas existem e estão vazias, prontas pra uso |
| 21 | **Bug real corrigido**: `queryClient` (TanStack Query) com `retry: 2` deixava queries que falham (ex: tabela inexistente) presas em `fetchStatus: 'paused'` pra sempre em vez de reportar o erro — reproduzido testando o módulo Contratos contra a tabela ausente. Troquei pra `retry: false` + `networkMode: 'always'` em `src/lib/queryClient.ts`. Efeito colateral aceito: sem retry automático em falhas de rede transitórias (raro numa rede de hospital com Wi-Fi/cabo estável; prefiro um erro visível a uma tela travada em "carregando") | Base | — | ✅ Corrigido |
| 22 | **Evolução do módulo OCs** — spec completa do Everton (29/08/2026), ver seção "Evolução do módulo OCs — roadmap" acima. 4 fases: Operação (central "o que fazer hoje" com priorização automática + ações rápidas + timeline de cobrança + previsão×entrega), Fornecedores (score/ranking/ficha), Gestão (causas/SLA interno×fornecedor/indicadores de processo/dashboard executivo), Produtividade (busca global/exportação segmentada/relatório mensal) | OCs | **Alta** | **Fase 1 ✅ Feita (29/08/2026)** — motor de priorização de 4 níveis (`src/utils/prioridade.ts`), Central de Pendências redesenhada, timeline de OC, ação rápida "marcar como respondida". Fases 2–4 pendentes |
| 23 | Adicionar `respondido_em timestamptz` em `hist_oc` | OCs | Alta | ✅ Feito (29/08/2026) — Everton rodou o SQL, confirmado via API. Ação "✓ Marcar como respondida" 100% funcional em produção |
