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
| **URL produção** | https://portal-fusve.vercel.app (no ar desde 30/08/2026) |
| **Repositório** | github.com/EvertonJr21/portal-fusve (privado) — nome corrigido em 30/08/2026, o CLAUDE.md tinha "fusve-portal" por engano |
| **Supabase** | https://urruseycrvfajnnbupyd.supabase.co |

### Módulos do portal

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **OCs** | Fundação pronta, módulo a portar | Controle de Ordens de Compra pós-emissão |
| **Pareceres Técnicos** | Fundação pronta, módulo a portar (migrar do Firebase) | Marcas aprovadas/restritas/proibidas por produto |
| **Contratos** | Fundação pronta, construir do zero | Tabela mestre, alertas de vencimento, indicadores |
| **OPME** | Construído em 15/09/2026 | Calendário de cirurgias com OPME — paciente, data, fornecedor, status de entrega |

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
├── .env.test                        ← valores fictícios (não são credenciais reais) só pra `npm test`
│                                        não quebrar — `src/lib/supabase.ts` lança erro se as env vars
│                                        estiverem ausentes, e os testes nunca chamam a rede de verdade
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
    ├── repositories/
    │   ├── ocRepository.ts          ← acesso Supabase + mapeamento snake↔camel de `ocs` (novo, 16/09/2026 —
    │   │                              Hardening P2, primeira entidade migrada do padrão "hook faz tudo" pro
    │   │                              padrão repository/hook-adaptador). Também concentra `criarOCImportada`
    │   │                              (insert com os defaults específicos da importação, diferentes dos do
    │   │                              formulário manual — não reaproveita `salvarOC` de propósito) [pronto]
    │   ├── solRepository.ts         ← idem pra `sols`, incluindo `atualizarCamposSol` usado na reconciliação
    │   │                              de importação [pronto, 16/09/2026]
    │   ├── fornecedorRepository.ts  ← idem pra `forns` [pronto, 16/09/2026]
    │   ├── contratoRepository.ts    ← idem pra `contratos`/`contrato_produtos`, incluindo o diff/soft-delete
    │   │                              de `salvarProdutosContrato` (sub-tabela) [pronto, 16/09/2026]
    │   ├── parecerRepository.ts     ← idem pra `pareceres` — nota: `excluirParecer` usa DELETE físico, não
    │   │                              soft delete, comportamento pré-existente preservado tal como estava
    │   │                              (mudar é decisão de produto separada) [pronto, 16/09/2026]
    │   ├── marcaSugeridaRepository.ts ← idem pra `marcas_sugeridas` [pronto, 16/09/2026]
    │   ├── opmeRepository.ts        ← idem pra `opmes` [pronto, 16/09/2026]
    │   └── histOcRepository.ts      ← idem pra `hist_oc` [pronto, 16/09/2026]
    │                                  — as 8 tabelas do projeto estão todas no padrão repository agora
    ├── hooks/
    │   ├── useHospital.ts           ← contexto de hospital ativo [pronto]
    │   ├── useToast.ts              ← contexto de toast [pronto]
    │   ├── useOCs.ts                ← useOCs, useSalvarOC, useAtualizarSituacaoOC, useExcluirOC — adaptador
    │   │                              fino sobre `ocRepository.ts`, sem SQL/mapeamento aqui [pronto — cobrança/vínculo/histórico ficam em hooks próprios na Fase 3]
    │   ├── useSols.ts               ← adaptador fino sobre `solRepository.ts` (só leitura nesta fase) [pronto]
    │   ├── useFornecedores.ts       ← adaptador fino sobre `fornecedorRepository.ts` (só leitura nesta fase) [pronto]
    │   ├── useHistOC.ts             ← adaptador fino sobre `histOcRepository.ts` (useHistOC, useHistoricoRecentePorOC,
    │   │                              useHistoricoTodos, useRegistrarCobranca, useMarcarRespondida) [pronto]
    │   ├── usePareceres.ts          ← adaptador fino sobre `parecerRepository.ts` [pronto]
    │   ├── useProdutos.ts           ← useProdutos (base SoulMV) — dynamic import de src/data/ sob demanda [pronto]
    │   ├── useMarcasSugeridas.ts    ← adaptador fino sobre `marcaSugeridaRepository.ts` — tabela `marcas_sugeridas`,
    │   │                              editável em /pareceres/marcas-sugeridas (antes era src/data/marcasSugeridas.json
    │   │                              estático, exigia deploy pra mudar) [pronto]
    │   ├── useHistoricoConsultas.ts ← histórico de sessão do módulo Pareceres (não persiste) [pronto]
    │   ├── useScoreReset.ts         ← data de corte do score/ranking de fornecedores, em localStorage [pronto]
    │   ├── useContratos.ts          ← adaptador fino sobre `contratoRepository.ts` [pronto]
    │   └── useOpmes.ts              ← adaptador fino sobre `opmeRepository.ts` [pronto]
    ├── components/
    │   ├── HospitalProvider.tsx     ← provider do useHospital, persiste em localStorage [pronto]
    │   ├── ui/                      ← componentes genéricos reutilizáveis
    │   │   ├── Sidebar.tsx          ← navegação agrupada por módulo, com link "← Módulos" e botão
    │   │   │                          de recolher/expandir (preferência salva em localStorage,
    │   │   │                          `fusve:sidebarColapsada`) — pedido do Everton pra liberar
    │   │   │                          espaço horizontal em tabelas largas (ex: Base de Pareceres) [pronto]
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
    │   └── contratos/                ← ContratoForm (modal xl, seções Cabeçalho/Fornecedor/Logística/
    │   │                                Produtos/Condições Comerciais, busca CNPJ via BrasilAPI),
    │   │                                ContratoStatusBadge (StatusContratoBadge + VigenciaBadge) [tudo pronto]
    ├── pages/
    │   ├── Modulos.tsx              ← tela inicial de seleção de módulo [pronto]
    │   ├── ocs/                     ← Dashboard, OrdensDeCompra, Solicitacoes,
    │   │                              PorFornecedor, Fornecedores (cadastro), Metricas,
    │   │                              Importar [tudo pronto — falta só Backup]. "Resumo Diário"
    │   │                              removido (01/09/2026) — Dashboard Executivo cobre a mesma função
    │   ├── pareceres/                ← Consultar, Cadastrar, Base, MarcasSugeridas, Dashboard [tudo pronto].
    │   │                              Bionexo removido (01/09/2026, pedido do Everton — não usa mais)
    │   └── contratos/
    │       └── TabelaMestre.tsx     ← KPIs (Total/Ativos/Vencendo/Vencidos), filtros (status/tipo/
    │                                  busca), tabela, CRUD completo — alertas de vencimento e
    │                                  indicadores vivem aqui mesmo, não em páginas separadas
    │                                  (decisão consciente, ver item 9 do backlog) [pronto, testado
    │                                  contra produção em 30/08/2026: criar/editar/filtrar/excluir
    │                                  e busca de CNPJ, tudo funcionando]
    └── utils/
        ├── date.ts                  ← getHoje, parseDMY, fmt, toInput, fromInput, addDias, diasEntre [pronto]
        ├── oc.ts                    ← statusPrazo (semáforo), riscoOC, diasSemMovimentacao, previsaoAtiva, KPIs puros [pronto]
        ├── cobranca.ts              ← templates de mensagem (individual/lote), links Outlook/WhatsApp [pronto]
        ├── csv.ts                   ← parseOCsCSV, parseSolsCSV [pronto]
        ├── pdf.ts                   ← extractPdfLines, parseAcompPDF (pdfjs-dist, carregado sob demanda) [pronto — ver nota abaixo]
        ├── acompXls.ts              ← extractXlsRows, parseAcompXLS — Acompanhamento de Compras via planilha
        │                              em vez de PDF (novo, 18/09/2026), mesmo formato de saída (`VinculoAcomp`) [pronto]
        ├── marcas.ts                 ← CATEGORIAS_MARCA, temAlgumaMarca [pronto]
        ├── relatorioParecer.ts       ← gerarRelatorioPDF (jspdf+autotable, carregado sob demanda) [pronto]
        ├── exportarPdf.ts            ← exportarPDF genérico (jsPDF+autoTable), usado em Exportar.tsx [pronto]
        ├── scoreFornecedor.ts        ← calcularScoreFornecedor(Todos), fornecedoresProblematicos, filtrarDesdeReset [pronto]
        ├── contrato.ts               ← diasParaVencer, statusVigencia (vencido/critico/atencao/ok) [pronto]
        ├── cnpj.ts                   ← consultarCNPJ (BrasilAPI), formatarCNPJ [pronto]
        ├── validators.ts            ← validação Zod na fronteira da importação (ocImportadaSchema,
        │                              solImportadaSchema, vinculoAcompSchema, validarLote) — separa
        │                              itens válidos dos inválidos em vez de travar o lote inteiro
        │                              [pronto, 16/09/2026 — Hardening P1]
        └── formatters.ts            [a fazer]

    src/data/                        ← PRODUTOS_SOULMV (4.579 itens), dynamic import em useProdutos.ts —
                                        não pesa no bundle principal. marcasSugeridas.json/.ts ficaram só
                                        como seed de `scripts/migrate-marcas-sugeridas.ts` (01/09/2026) —
                                        os dados agora vivem na tabela `marcas_sugeridas`, editável em
                                        /pareceres/marcas-sugeridas

    scripts/migrate-pareceres.ts     ← migração Firebase → Supabase, pronta, não executada (ver item 4 do backlog)

supabase/migrations/                 ← schema versionado (novo, 15/09/2026 — ver CLAUDE_ENGINEERING.md
                                        e supabase/migrations/README.md). 0001-202609160004 são reconstruções
                                        do histórico já aplicado; toda alteração nova ganha um arquivo aqui
                                        ANTES de rodar. Desde 202609170001 (17/09/2026), aplicada via
                                        `mcp__supabase__apply_migration` em vez de colar no SQL Editor — é a
                                        primeira migration realmente rastreada pelo Supabase
                                        (`supabase_migrations.schema_migrations`/`list_migrations`); as
                                        anteriores continuam sendo só reconstrução em texto, ver item 30 do
                                        backlog

tests/fixtures/                      ← fixtures sintéticas (não são os CSVs reais do Everton) pros testes
                                        de src/utils/csv.test.ts

.github/workflows/ci.yml             ← lint + typecheck + testes + build em todo push/PR (novo, 15/09/2026)
                                        — não bloqueia push direto em main ainda, é só visibilidade
```

**Nota sobre `pdf.ts`:** só o parser de "Acompanhamento de Compras" (`parseAcompPDF`) foi portado — é o único fluxo de PDF sem equivalente em CSV (o vínculo automático OC↔Solicitação). Os parsers de OC e Solicitação via PDF do legado (`parseOC`/`parseSol` em `_legacy/.../pdf.js`) não foram portados: são dois parsers redundantes com o CSV (mesma informação, fonte menos confiável) e muito baseados em regex heurística de posição — portar sem um arquivo real do SoulMV pra testar contra é risco alto de corromper dados de compras reais silenciosamente.

**Importação de CSV testada contra dados reais do SoulMV (31/08/2026)**: Everton mandou `R_ORD_COM_FOR.csv` (665 OCs reais) e `R_SOL_PEND_DATA.csv` (3 solicitações). Rodei os parsers direto (fora do navegador, via `tsx`) contra os arquivos reais e **achei um bug real em `splitCsvLine`** (`src/utils/csv.ts`): o split era ingênuo por vírgula, sem respeitar campos entre aspas — e os valores em R$ do export vêm como `"748,80"` (vírgula decimal brasileira, por isso entre aspas). Isso cortava esses campos ao meio e desalinhava as colunas seguintes, silenciosamente: `diasAtraso` de algumas OCs saía errado (ex: 748 em vez de 3, pegando o valor de "Vl Total" cortado) e descrições de produto com vírgula (medidas, "10CM X10M USO: ..., PRONGAS NASAIS, ...") ficavam truncadas no meio. Corrigido com um tokenizer que respeita aspas. **Segundo bug achado**: o arquivo de OCs tem dois formatos de coluna diferentes entre blocos de `Estoque:` (alguns têm uma coluna vazia a mais antes de "Tipo Pagamento", outros não) — os índices fixos `cols[10]`/`cols[11]` para `previsaoForn`/`diasAtraso` só funcionavam num dos dois formatos. Trocado por busca de padrão (primeira data `DD/MM/AAAA` depois do nome do fornecedor = Dt. Prevista, primeiro inteiro puro depois dela = dias em atraso) — funciona nos dois formatos. **Resultado depois da correção**: 665/665 OCs parseadas, 0 sem fornecedor, 0 duplicatas, 0 com `diasAtraso` > 250 (suspeito), 0 sem `previsaoForn`; solicitações 3/3, 0 com produto não identificado. `parseSolsCSV` não teve bug próprio, só se beneficiou do mesmo fix de aspas. **Ainda faltando pro Everton**: o PDF de "Acompanhamento de Compras" que faz o vínculo OC↔Solicitação — sem ele dá pra importar OCs e Solicitações separadamente, mas não linkadas.

**Importação real rodada em produção (31/08/2026)**: Everton importou os dois CSVs pela tela `/ocs/importar`, logado. Base de OCs foi de 659 pra **845** (186 novas). **Achado durante a verificação pós-import**: 16 OCs já existentes na base tinham `dias_atraso` corrompido (valores tipo 949, 944, 926 dias) — sobra de uma importação anterior à correção do bug de aspas (a lógica de `importarOCsCSV`/`useAtualizarOC` nunca sobrescreve `dias_atraso` de OC já existente, de propósito, então o dado ruim nunca era corrigido sozinho num re-import). Cruzei os 16 IDs contra o CSV real: **14 corrigidos** via `UPDATE` direto no SQL Editor com os valores corretos extraídos do arquivo; **2 (74463, 75521) não estavam no CSV** (mais antigos que o período do arquivo) — deixados como estão, sem inventar dado. Confirmado via `information_schema`: 0 → 2 OCs com `dias_atraso` > 250 depois da correção (as 2 sem fonte de dado).

**Log de progresso adicionado (31/08/2026)**: o Everton achou que a importação tinha travado — na real, `Importar.tsx` só escrevia uma linha de log **no final** das ~665 chamadas sequenciais ao Supabase, sem feedback durante o processo. Primeira tentativa foi uma linha de progresso só (`⏳ 412/665...`) que ficava se atualizando no lugar; o Everton pediu explicitamente **uma linha nova por item**, no estilo do log da versão vanilla antiga (`OC 78842 — Atendida`, `OC 78843 — Cancelada`, ...). Trocado por `addLog` chamado a cada OC/Solicitação/vínculo processado, nos três fluxos (OCs CSV, Solicitações CSV, Acompanhamento PDF) — Acompanhamento só loga quando algo de fato muda (OC criada ou vínculo alterado), não quando já estava correto. Caixa de log ganhou `max-h-96 overflow-y-auto` + auto-scroll (`useEffect` + `logRef`) pra acompanhar centenas de linhas sem a tela crescer sem limite; linhas de resumo (começam com "─") ficam destacadas em verde.

---

## BANCO DE DADOS — SUPABASE

### Projeto
- **URL:** `https://urruseycrvfajnnbupyd.supabase.co`
- **Anon key:** no `.env.local` como `VITE_SUPABASE_ANON_KEY` (nunca em arquivo versionado)
- **Gerar tipos:** `npx supabase gen types typescript --project-id urruseycrvfajnnbupyd > src/types/database.ts`

> ✅ **RLS fechado e verificado (30/08/2026)** — todas as 9 tabelas exigem
> `auth.role() = 'authenticated'`. Testado direto na API com `fetch` usando só
> a anon key (sem sessão): retorna array vazio em todas as tabelas. Logado,
> os dados carregam normalmente. Ver item 12 do backlog pro histórico
> (inclusive um achado de policies antigas com nomes não documentados que
> escaparam do primeiro script e precisaram ser removidas manualmente).
>
> **Hardening do advisor do Supabase (17/09/2026)** — auditoria completa via
> MCP (`get_advisors`) achou 2 problemas reais: a função `update_updated_at()`
> (trigger de `updated_at`) tinha `search_path` mutável (classe de risco de
> schema injection) e as 9 policies de RLS reavaliavam `auth.role()` **por
> linha** em vez de `(select auth.role())` (Postgres não conseguia cachear
> como InitPlan — não escalaria bem). Corrigido em
> `202609170001_hardening_advisors_p0.sql`: `search_path = ''` na função,
> policies recriadas com `(select auth.role())`, e nomenclatura padronizada —
> todas as 9 agora se chamam `authenticated_<tabela>` (antes
> `marcas_sugeridas`/`opmes` usavam `auth_<tabela>`, inconsistente com as
> outras 7). Nenhuma regra de acesso mudou, só a forma de avaliação.
> Verificado via advisor de novo depois: os 2 warnings sumiram. Essa foi
> também a primeira migration aplicada via `mcp__supabase__apply_migration`
> em vez de colar no SQL Editor — o schema `supabase_migrations` (rastreio
> real de migrations do Supabase) não existia até então; os arquivos
> `0001`–`202609160004` em `supabase/migrations/` continuam sendo só
> reconstrução em texto (ver `supabase/migrations/README.md`), mas daqui pra
> frente dá pra usar `list_migrations`/`apply_migration` como fonte de
> verdade de verdade. **Pendente, não é SQL**: "Leaked Password Protection"
> (checagem contra HaveIBeenPwned) está desligada em Authentication →
> Providers → Email — é toggle de Dashboard, Everton precisa ativar manualmente.

---

### Tabela `ocs`

> **Migração de datas texto→date (16/09/2026)**: as 5 colunas de data desta
> tabela viraram `date` nativo (`*_date`) — ver seção "Migração de Datas
> Texto → Date". As colunas texto antigas (`data_solic`/`previsao_forn`/
> `previsao_forn2`/`data_entrega_real`/`ultima_movimentacao`) já não são
> lidas nem escritas pelo app desde a Fase 2, e o `DROP COLUMN`
> (`202609160004_remove_colunas_texto_datas.sql`) **já foi executado em
> produção** — confirmado por inspeção direta do schema live em 17/09/2026
> (auditoria via MCP do Supabase), as 5 colunas texto não existem mais na
> tabela. A tabela abaixo já reflete o schema real, não só o alvo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer PK | Número da OC no SoulMV |
| `data_solic_date` | date | Data da solicitação de origem (era `data_solic` text DD/MM/YYYY) |
| `fornecedor_nome` | text | Nome do fornecedor |
| `fornecedor_id` | integer | Código do fornecedor no SoulMV |
| `sit` | text | `Autorizada` \| `Parcialmente Atendida` \| `Atendida` \| `Cancelada` \| `Aberta` |
| `estoque` | text | Ex: `SUP CAF`, `SUP HEMODINAMICA` |
| `solicitacao_id` | integer | FK → `sols.id` |
| `cobrado` | boolean | Se já houve cobrança registrada |
| `previsao_forn_date` | date | Previsão prometida pelo fornecedor (era `previsao_forn` text) |
| `previsao_forn2_date` | date | Segunda entrega, para parciais (era `previsao_forn2` text) |
| `data_entrega_real_date` | date | Entrega efetiva (era `data_entrega_real` text) |
| `dias_atraso` | integer | Calculado pelo SoulMV |
| `hospital_id` | text | `'huv'` \| `'mkr'` |
| `proxima_acao` | text | Cobrar fornecedor \| Aguardar retorno \| etc. |
| `motivo_atraso` | text | Sem estoque \| Transportadora \| etc. |
| `ultima_movimentacao_date` | date | Última ação (era `ultima_movimentacao` text) |
| `previsao_descumprida` | boolean | Previsão passou sem entrega |
| `deleted_at` | timestamptz | Soft delete — null = ativo |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### Tabela `sols`

> Mesma migração de datas — `data_date` (native `date`) substitui `data`
> (text), ver nota acima. `DROP COLUMN` de `data` já foi executado em
> produção (migration `202609160004_remove_colunas_texto_datas.sql`,
> confirmado via auditoria do schema live em 17/09/2026).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer PK | Número da solicitação no SoulMV |
| `data_date` | date | Data da solicitação (era `data` text DD/MM/YYYY) |
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

> Mesma migração de datas — `data_parecer_date` (native `date`) substitui
> `data_parecer` (text), ver nota na tabela `ocs` acima. `DROP COLUMN` de
> `data_parecer` já foi executado em produção (migration
> `202609160004_remove_colunas_texto_datas.sql`, confirmado via auditoria
> do schema live em 17/09/2026) — sem perda real, os 98 pareceres históricos
> migrados do Firebase já tinham esse campo vazio na fonte original, ver
> item 29 do backlog.
>
> **PDF pra Storage (16/09/2026)**: PDF novo vai pro Supabase Storage
> (bucket `pareceres-pdfs`, privado) em vez de base64 no Postgres — ver
> seção "Storage pra PDF" e backlog item 31. `pdf_data_url` (base64) fica
> só como fallback de leitura pra parecer antigo que ainda não migrou
> (`pdf_path` nulo) — nenhum dado existente foi tocado, migration é aditiva.

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
| `data_parecer_date` | date | Data do parecer (era `data_parecer` text DD/MM/YYYY) |
| `parecer` | text | Texto livre do parecer (nome do arquivo do PDF, hoje) |
| `pdf_data_url` | text | PDF em base64 — **legado**, só fallback de leitura, não escrito mais em parecer novo |
| `pdf_path` | text | Caminho do PDF no bucket `pareceres-pdfs` do Storage (novo, ver item 31 do backlog) |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

---

## STORAGE PRA PDF (Hardening, CLAUDE_ENGINEERING.md seção 12)

`pareceres.pdf_data_url` guardava o PDF inteiro em base64 dentro do Postgres —
viola a regra de que binário grande não deve morar em coluna de banco
relacional (infla o tamanho da tabela/backup, não tem CDN/cache). Trocado
por Supabase Storage, seguindo o mesmo espírito aditivo/sem-big-bang da
migração de datas:

- **Migration `202609160005_storage_pareceres_pdf.sql`** — cria o bucket
  `pareceres-pdfs` (privado) com policies de RLS pra usuário autenticado
  (select/insert/update/delete, mesmo padrão do resto do banco) e adiciona
  `pareceres.pdf_path` (coluna nova, aditiva). **Pendente de execução por
  Everton no SQL Editor.**
- **`parecerRepository.ts`** ganhou `uploadPdf(cod, file)` (sobe o arquivo
  pro bucket, devolve o `path`) e `obterUrlAssinadaPdf(path)` (URL temporária
  de 5 min pra abrir/baixar — bucket é privado, não tem URL pública fixa).
  `toParecer`/`toRow` passam os dois campos (`pdfPath`/`pdfDataUrl`) sem
  escolher um — quem decide qual usar é a UI.
- **`ParecerForm.tsx`** não lê mais o arquivo como base64 (`FileReader` +
  `readAsDataURL`) — o arquivo escolhido fica em memória (`File`) até o
  submit, aí sobe pro Storage via `uploadPdf`. Editar um parecer sem trocar o PDF preserva o
  que já estava salvo (path ou base64 legado), nunca apaga.
- **`useAbrirPdfParecer()`** (`usePareceres.ts`) centraliza a lógica de abrir
  o PDF — prefere `pdfPath` (gera URL assinada), cai pro `pdfDataUrl` legado
  (`abrirPdfDataUrl`, que já resolvia o bloqueio do Chrome pra `data:` URL
  em nova aba) só pra parecer que ainda não migrou. Usado em `ParecerCard`,
  `Base.tsx` e no próprio `ParecerForm`.
- **Backfill opcional** — `scripts/backfill-pareceres-pdf-storage.ts`
  (`npm run backfill:pareceres-pdf-storage`, dry-run por padrão, `--apply`
  grava) migra pareceres que já tinham PDF em base64 pro Storage, sem apagar
  `pdf_data_url` (compatibilidade temporária). Não é obrigatório rodar agora
  — os PDFs antigos continuam abrindo normalmente pelo fallback.

### Tabela `parecer_anexos`

Nova em 21/09/2026 — pedido do Everton: `pareceres.pdf_path`/`pdf_data_url`
(o "PDF geral") só suporta **um** arquivo pra todo o parecer, mas na prática
cada marca proibida/restrita costuma ter sua própria justificativa em PDF
diferente (ex: parecer do Zelara ≠ parecer do Polymed, mesmo produto, marcas
diferentes barradas por motivos diferentes). Essa tabela permite **N PDFs por
parecer, cada um explicitamente vinculado a uma marca + categoria** — não um
anexo solto. Reaproveita o bucket `pareceres-pdfs` já existente (políticas de
Storage são por bucket, não por caminho dentro dele) — caminho no Storage é
`<cod>/<categoria>/<marca>/<timestamp>-<nome>`, só pra organização, não é lido
de volta (o `pdf_path` salvo na linha é a fonte de verdade).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `parecer_cod` | text | FK → `pareceres.cod`, `ON DELETE CASCADE` |
| `categoria` | text | `'padrao'` \| `'permitidas'` \| `'restritas'` \| `'proibidas'` |
| `marca` | text | Nome da marca (mesmo texto que aparece em `pareceres.padrao`/etc.) |
| `pdf_path` | text | Caminho no bucket `pareceres-pdfs` do Storage |
| `nome_arquivo` | text | Nome original do arquivo, pra exibição |
| `deleted_at` / `created_at` / `updated_at` | timestamptz | Soft delete — diferente de `excluirParecer` (regra 6 violada, pré-existente), este repository segue a regra desde o início |

O "PDF geral do parecer" (`pareceres.pdf_path`/`pdf_data_url`) continua
existindo exatamente como antes, sem nenhuma migração de dado — os dois
mecanismos coexistem. `ParecerForm.tsx` deixou isso explícito na UI: o campo
antigo agora tem o rótulo "PDF geral do parecer" com a nota "Não vinculado a
uma marca específica — pra isso, use o '+ PDF' de cada marca acima". Cada
marca dentro de `MarcasEditor.tsx` ganhou seu próprio controle de anexo
(existentes + pendentes até o Salvar) — arquivos pendentes só sobem pro
Storage/Supabase depois que o `upsert` do parecer já rodou (senão a FK
`parecer_cod → pareceres.cod` falharia pra um parecer novo ainda não salvo).
`MarcasBadge.tsx` (usado em `ParecerCard.tsx` e `Base.tsx`) mostra um 📎 ao
lado de cada marca com anexo — clique abre direto se só tiver 1, ou um menu
(`Dropdown`) se tiver mais de 1. `Base.tsx` busca todos os anexos de uma vez
(`useTodosAnexos`, mesmo padrão de `usePareceres` sem paginação — dataset
pequeno) e agrupa por `parecer_cod` no cliente, evitando N+1 queries por
linha da tabela.

Migration `202609210001_parecer_anexos.sql` — **executada em produção por
Everton no SQL Editor (21/09/2026)**, confirmada via `SELECT count(*) FROM
parecer_anexos` (0, tabela criada vazia). Funcionalidade ativa.

### Tabela `marcas_sugeridas`

Nova em 01/09/2026 — antes vivia em `src/data/marcasSugeridas.json` (estático,
exigia alterar código e fazer deploy pra mudar uma recomendação). Migrada com
`npm run migrate:marcas-sugeridas` (idempotente, upsert por `cat`). Editável
em `/pareceres/marcas-sugeridas`.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `cat` | text PK | Categoria de produto (ex: `AGULHAS`) — mesmo valor de `pareceres.cat` |
| `marcas` | text[] | Marcas de mercado recomendadas pra essa categoria (histórico: sempre 3, mas o campo aceita qualquer quantidade) |
| `updated_at` | timestamptz | Auto |

SQL pra criar (RLS já no padrão fechado, igual as outras 7 tabelas — ver item 12 do backlog):

```sql
CREATE TABLE IF NOT EXISTS marcas_sugeridas (
  cat        text PRIMARY KEY,
  marcas     text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE marcas_sugeridas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_marcas_sugeridas" ON marcas_sugeridas
  FOR ALL USING (auth.role() = 'authenticated');
```

Depois de rodar isso, `npm run migrate:marcas-sugeridas` carrega as 39 categorias
que já existiam em `src/data/marcasSugeridas.json` (precisa de `SUPABASE_KEY`
service_role no `.env` — RLS exige autenticado, o script roda fora de sessão logada).

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

### Tabela `opmes`

Nova em 15/09/2026 — módulo de controle de OPME (Órtese/Prótese/Material Especial),
pedido do Everton pra lembrar se o OPME de uma cirurgia já foi entregue ou não.
Fornecedor reaproveita a tabela `forns` (compartilhada com o módulo OCs) em vez de
lista própria. Deliberadamente **sem campo de material/produto** — o pedido foi só
lembrar entrega sim/não por paciente/cirurgia, não repetir o controle de item que já
existe em OCs/Pareceres/Contratos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `paciente` | text | Nome do paciente — dado sensível (LGPD), mesma proteção de RLS das demais tabelas |
| `data_cirurgia` | date | Data prevista da cirurgia — base do calendário |
| `fornecedor_id` | integer | FK → `forns.id`, nullable (pode não ter fornecedor definido ainda) |
| `hospital_id` | text | `'huv'` \| `'mkr'` |
| `status` | text | `'pendente'` \| `'entregue'` |
| `observacao` | text | Observação livre |
| `deleted_at` / `created_at` / `updated_at` | timestamptz | |

SQL pra criar (RLS no mesmo padrão fechado das outras tabelas):

```sql
CREATE TABLE IF NOT EXISTS opmes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente       text NOT NULL,
  data_cirurgia  date NOT NULL,
  fornecedor_id  integer REFERENCES forns(id),
  hospital_id    text NOT NULL,
  status         text NOT NULL DEFAULT 'pendente',
  observacao     text DEFAULT '',
  deleted_at     timestamptz DEFAULT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opmes_hospital ON opmes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_opmes_data     ON opmes(data_cirurgia);
ALTER TABLE opmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_opmes" ON opmes
  FOR ALL USING (auth.role() = 'authenticated');
```

---

### SQL de migração completo

O bloco de SQL do setup inicial (29/08/2026, antes de `supabase/migrations/`
existir como fonte de verdade) foi **removido daqui em 16/09/2026** — regra 42
do `CLAUDE_ENGINEERING.md` ("SQL antigo não pode permanecer como instrução
ativa"): continha as policies antigas de RLS anônimo (`USING (true)`, já
substituídas — ver backlog item 12) e a coluna `pareceres.data_parecer` como
`text` (já removida — ver "Migração de Datas Texto → Date"). Rodar aquele
bloco de novo reabriria acesso anônimo e recriaria uma coluna obsoleta.

Preservado só como registro histórico em
[`docs/history/202608290001_setup_inicial_pre_migrations.sql`](../docs/history/202608290001_setup_inicial_pre_migrations.sql)
(marcado como "NÃO EXECUTAR" no cabeçalho). A fonte de verdade real do schema
é `supabase/migrations/` — ver `supabase/migrations/README.md`.

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

> **Padrão desde 16/09/2026 (Hardening P2 — completo):** SQL e mapeamento
> snake↔camel vão em `src/repositories/<entidade>Repository.ts`; o hook vira
> um adaptador fino que só chama o repository dentro de `queryFn`/`mutationFn`
> (ver `ocRepository.ts` + `useOCs.ts` como referência). Migrado em etapas
> (Strangler Pattern, CLAUDE_ENGINEERING.md seção 64), uma entidade por vez —
> as 8 tabelas do projeto (`ocs`, `sols`, `forns`, `contratos`/`contrato_produtos`,
> `pareceres`, `marcas_sugeridas`, `opmes`, `hist_oc`) já estão nesse padrão.
> Todo hook novo (ou tabela nova) segue esse padrão desde já — não existe
> mais "padrão antigo" válido pra copiar.

```typescript
// Exemplo do padrão: hook adaptador + repository
// src/repositories/exemploRepository.ts
export async function listarExemplos(hospitalId: HospitalId): Promise<Exemplo[]> {
  const { data, error } = await supabase
    .from('exemplos')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('id', { ascending: false })
  if (error) throw error
  return (data as ExemploRow[]).map(toExemplo)
}

// src/hooks/useExemplos.ts
export function useExemplos(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['exemplos', hospitalId],
    queryFn: () => exemploRepository.listarExemplos(hospitalId),
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
- **Entrega real (18/09/2026, item 34 do backlog):** o relatório não tem campo de entrega
  efetiva — quando uma OC vira `Atendida` nesta importação (nova ou transição de OC
  existente) e ainda não tem `dataEntregaReal`, o import registra a data de hoje como
  aproximação. Só daqui pra frente, sem backfill retroativo. Previsão do fornecedor
  (`previsaoForn`) deixou de vir preenchida automaticamente em **OC nova** (não confiável);
  em OC existente sem previsão, continua aceitando a do relatório como valor inicial

### 2. R_SOL_PEND_DATA.csv — Solicitações
- Encoding: `latin-1`
- Campos: id, data, produto, motivo, solicitante, setor, estoque, situação, qtd

### 3. Acompanhamento de Compras (PDF ou planilha)
- Vincula OCs às Solicitações de origem automaticamente
- Parser de PDF usa PDF.js, portado pra `src/utils/pdf.ts` (`parseAcompPDF`) a partir da lógica de referência em `_legacy/controle-ocs/controle-ocs-huv-main/src/js/pdf.js` (`parseAcomp`)
- **Planilha (.xls/.xlsx) — novo, 18/09/2026**: `src/utils/acompXls.ts` (`extractXlsRows`/`parseAcompXLS`), pedido do Everton depois que um relatório PDF real veio com o fornecedor extraído vazio (heurística de posição de texto do PDF.js quebrou nesse layout). A planilha tem cada valor numa célula própria, então não depende de heurística — mesmo princípio de robustez do parser de CSV, busca por *padrão de conteúdo* na célula (um número de 5 dígitos = OC, uma data `DD/MM/AAAA` = data da OC, um texto que não é número nem data = fornecedor), nunca índice fixo de coluna, porque o layout de export do SoulMV varia. `Importar.tsx` detecta a extensão do arquivo (`importarAcomp`, renomeado de `importarAcompPDF`) e escolhe o parser certo — o card de upload aceita `.pdf`, `.xls` e `.xlsx`. **Testado contra um relatório real do Everton (18/09/2026)**: 33/33 vínculos extraídos corretamente, nenhum fornecedor vazio (o mesmo arquivo que falhava 100% via PDF). **Achado a confirmar com o Everton**: o cabeçalho "Solicitação de Compra" só aparece uma vez nesse arquivo, e as 33 OCs (espalhadas por 2 semanas) ficaram todas associadas à mesma solicitação — comportamento herdado do parser de PDF (nunca reseta a solicitação atual até achar um cabeçalho novo, porque o relatório não repete o cabeçalho a cada quebra de página), mas vale confirmar se esse arquivo específico representa mesmo uma solicitação com muitas OCs ou é um "resumo geral" de várias solicitações. 5 testes novos em `acompXls.test.ts` (fixtures sintéticas, não o arquivo real) — total do projeto: **93 testes**. **Nota de segurança atualizada**: `exportar.ts` documentava que o app nunca lia planilha de terceiro via `XLSX.read` (só escrevia); isso deixou de ser 100% verdade — risco avaliado como baixo mesmo assim, é sempre o Everton subindo um export que ele mesmo tirou do SoulMV, nunca arquivo de origem remota/desconhecida (ver nota completa em `acompXls.ts`)

### 4. Validação antes de gravar (Hardening P1, 16/09/2026)

O que sai de `parseOCsCSV`/`parseSolsCSV`/`parseAcompPDF` passa por `validarLote()`
(`src/utils/validators.ts`, Zod) antes de qualquer `insert`/`update` no Supabase —
`Importar.tsx` chama isso logo depois do parse, nos três fluxos. Checa formato
estrutural mínimo (id positivo, data em `DD/MM/AAAA`, quantidade/dias de atraso
não-negativos, nome de fornecedor não vazio, `hospital_id` em `huv`/`mkr`) — **não**
julga plausibilidade de negócio (ex: não rejeita um atraso de 300 dias, só um
negativo, que é impossível por definição).

Uma linha inválida no meio de centenas não trava as outras: `validarLote` separa
válidas de inválidas, e cada inválida vira uma linha `⚠` no log de importação com
o motivo, sem interromper o processamento das demais (mesmo princípio do log de
progresso item a item já existente). O resumo final de cada card mostra quantas
foram ignoradas, se houver alguma.

Deliberadamente **sem** validar `sit`/`situação` contra uma lista fechada — mesmo
motivo da migration de `CHECK` constraints (`normalizeSit()` tem fallback
intencional pra situação não reconhecida do SoulMV; travar isso quebraria
importação real por um valor novo/inesperado do export).

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

## MIGRAÇÃO DE DATAS TEXTO → DATE (Hardening, item de maior risco do plano)

Hoje `ocs.data_solic/previsao_forn/previsao_forn2/data_entrega_real/ultima_movimentacao`,
`sols.data` e `pareceres.data_parecer` são `text` em `DD/MM/AAAA` — violação da regra de
CLAUDE_ENGINEERING.md seções 8-9 ("datas não devem ser texto"). É o item de maior risco do
roadmap de hardening porque toca dado de produção real, então segue o processo de 6 passos
que o doc exige (seção 9), **nunca** um `ALTER COLUMN` direto:

1. criar coluna nova (`_date`, tipo `date`)
2. converter dados (`to_date()`, só onde o texto já bate `DD/MM/AAAA`)
3. validar 100% (query de contagem, tem que dar 0 discrepâncias)
4. atualizar aplicação (ler/escrever a coluna nova)
5. manter compatibilidade temporária
6. remover coluna antiga

**Fase 1 (aditiva, sem risco) — ✅ aplicada em produção (16/09/2026), verificações deram 0:**
`202609160001_datas_ocs_date.sql`, `202609160002_datas_sols_date.sql`,
`202609160003_datas_pareceres_date.sql` (`supabase/migrations/`) — cada uma só fez
`ADD COLUMN IF NOT EXISTS` + `UPDATE` de backfill via `to_date()`, sem tocar nas colunas
texto originais. Everton rodou as 3 e confirmou 0 discrepâncias nas queries de verificação.

**Fase 2 (troca de código) — ✅ completa (16/09/2026)**, nas 3 tabelas (`pareceres.data_parecer`,
`sols.data`, as 5 colunas de `ocs`), uma coluna por vez, começando pelas de menor risco.
Diferente do previsto inicialmente, `src/utils/date.ts` **não precisou mudar** — a
estratégia adotada foi mais simples: o tipo de domínio de cada campo continua `string`
em `DD/MM/AAAA` (nenhuma mudança em formulários/telas/`src/utils/oc.ts`), e só o
repository de cada entidade passou a ler preferencialmente a coluna `_date` nativa
(convertendo pra `DD/MM/AAAA` com `fromInput()` pra manter o domínio igual) e a escrever
nas duas colunas — texto (compatibilidade temporária, passo 5) e `_date` (via `toInput()`).

**Passo 6 (remover colunas texto) — ✅ completo e confirmado em produção
(17/09/2026).** Depois da Fase 2 confirmada estável, os 3 repositories
(`ocRepository.ts`, `solRepository.ts`, `parecerRepository.ts`) pararam de
ler/escrever de vez as 7 colunas texto (5 de `ocs`, 1 de `sols`, 1 de
`pareceres`) — agora só tocam as colunas `_date`. `src/types/database.ts`
também teve as colunas texto removidas dos tipos `Row`/`Insert`/`Update` das
3 tabelas. Everton rodou a migration `202609160004_remove_colunas_texto_datas.sql`
(`DROP COLUMN IF EXISTS` das 7 colunas) no SQL Editor em 16/09/2026, depois
de confirmar o deploy no ar — **confirmado via auditoria direta do schema
live em 17/09/2026** (inspeção por MCP do Supabase: as 7 colunas texto não
existem mais em nenhuma das 3 tabelas). Não ficou registrado no histórico de
quem/quando exatamente rodou no SQL Editor (era antes do rastreio real de
migrations existir, ver nota de RLS/advisor em "Banco de Dados"), mas o
estado final bate 100% com o que a migration descreve.

**Incidente durante a execução, investigado e encerrado sem perda de dado real**: a
query de verificação pós-`DROP` mostrou `0/98` pareceres com `data_parecer_date`
preenchida — parecia que o backfill da Fase 1 tinha falhado silenciosamente pra
`pareceres` (hipótese inicial: formato de data do Firebase diferente de `DD/MM/AAAA`)
e que o `DROP` teria apagado esse dado sem chance de recuperação, já que a coluna
texto `data_parecer` não existe mais. Investigação: como a migração original de
pareceres (`scripts/migrate-pareceres.ts`, item 4 do backlog) só **leu** do Firestore
(`parecer-tecnico-huv`, coleção `pareceres`) e nunca apagou nada de lá, dava pra
conferir a fonte original — criado `scripts/repair-pareceres-data-parecer-date.ts`
(dry-run por padrão, `--apply` grava) pra buscar o campo direto no Firestore via REST
API v1 (`fetch`, não o SDK client — o SDK abre um canal de listen via gRPC mesmo em
leitura única e isso quebra com erro enganoso em ambientes tipo Codespaces,
independente de `experimentalForceLongPolling`) e recuperar `data_parecer_date` por
`cod`. **Resultado da investigação**: rodado com `--debug` contra os documentos reais,
o campo `data_parecer` já estava **vazio (`""`) na própria fonte original do Firebase**
— não é bug de formato, o dado nunca foi preenchido nesses 98 registros históricos.
Confirmado: **nenhum dado real foi perdido no `DROP`**, a coluna já não carregava
nenhuma informação útil pra nenhum dos 98 pareceres migrados. Script de reparo mantido
no repositório (`npm run repair:pareceres-data`) como ferramenta, embora não tenha
sido necessário desta vez — serve de referência se um caso parecido aparecer numa
tabela diferente. Pareceres criados/editados depois desta mudança já gravam
`data_parecer_date` normalmente pelo formulário. **O processo de 6 passos está
completo.**

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


- Base de 17.733 produtos do SoulMV (expandida em 15/09/2026 com `R_PRODUTO.csv`, ver `src/data/produtos.ts`)
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

### Módulo OPME

Novo em 15/09/2026. Fluxo real (visto nos e-mails do Centro Cirúrgico/fornecedores):
Centro Cirúrgico solicita OPME pra uma cirurgia → Everton cota com fornecedor → aprova
→ acompanha até a entrega antes da data da cirurgia. O módulo cobre só a última parte
desse fluxo — lembrar se o OPME já chegou ou não —, não a cotação em si (isso continua
por e-mail).

- Calendário mensal (`/opmes`) — cada dia mostra as cirurgias com OPME daquele dia,
  com uma bolinha colorida por status (🟡 pendente / 🟢 entregue)
- Clicar num dia vazio abre o formulário já com a data preenchida; clicar num OPME
  existente abre pra editar
- Cadastro: paciente, data da cirurgia, fornecedor (lista de `forns`, compartilhada
  com OCs), hospital, status (pendente/entregue), observação livre
- **Sem campo de material/produto** — decisão consciente do Everton, o objetivo é só
  controlar entrega por paciente/cirurgia, não duplicar o controle de item que já
  existe em OCs/Pareceres/Contratos
- KPIs do mês (total, pendentes, entregues) + lista de pendentes nos próximos 7 dias
- Soft delete, mesmo padrão do resto do sistema

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
- [ ] `npm test` sem falhas (Vitest — cobre parsers de importação e regras de prazo)
- [ ] `npm run build` sem erros
- [ ] Alteração de schema tem migration em `supabase/migrations/` (ver README lá dentro)
- [ ] Dado vindo de CSV/PDF/input externo passa por validação (`src/utils/validators.ts`) antes de persistir
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
| 2 | Tipos gerados do banco (`supabase gen types`) | Base | Alta | ✅ Feito (30/08/2026), **e regenerado pra valer em 17/09/2026** — a CLI (`npx supabase gen types typescript`) exige `supabase login` interativo, que não funciona neste ambiente (sem TTY); em 30/08 gerei `src/types/database.ts` manualmente a partir do schema real (`information_schema.columns` consultado direto via SQL Editor), no mesmo formato que a CLI produziria. Em 17/09/2026, como parte da auditoria do item 30, descobri que o MCP do Supabase expõe `generate_typescript_types` — o mesmo resultado da CLI, sem precisar de login interativo — e troquei o arquivo manual pelo gerado de verdade. **Achado na troca**: a versão manual documentava uma FK `ocs.solicitacao_id → sols.id` que **não existe de verdade no banco** (só é mantida pela aplicação) — o gerado real não tem essa `Relationship`. Rodei `npx tsc -b --noEmit`, `npm test` (87/87) e `npm run build` depois da troca — só precisou ajustar 1 fixture de teste (`parecerRepository.test.ts`, faltava `pdf_path: null`) pra bater com a coluna nova. Ativado `createClient<Database>` em `src/lib/supabase.ts`. Isso pegou 3 pontos com `Record<string, unknown>` genérico demais pro client tipado (`useAtualizarOC` em `useOCs.ts`, os dois `patch` de `Importar.tsx`) — trocados pelo tipo `Update` real de cada tabela |
| 3 | Layout base: sidebar, topbar, troca de hospital, toast | Base | Alta | ✅ Feito |
| 4 | Script de migração Firebase → Supabase (Pareceres) | Pareceres | Alta | ✅ Feito (29/08/2026) — `npm run migrate:pareceres` rodado, **98 pareceres** migrados do Firestore (`parecer-tecnico-huv`) pra tabela `pareceres`, confirmado via API |
| 5 | Migrar lógica de OCs do vanilla para hooks React | OCs | Alta | ✅ Feito — módulo OCs completo |
| 6 | Dashboard de Pendências (KPIs + fila de cobrança) | OCs | Alta | ✅ Feito (fila sequencial simplificada para "cobrar todos visíveis" em lote, sem o painel passo-a-passo do legado) |
| 7 | Tabela de OCs com filtros e importação CSV | OCs | Alta | ✅ Feito, inclui importação CSV |
| 8 | Módulo de Pareceres: consulta + cadastro + Bionexo | Pareceres | Média | ✅ Feito (Consultar, Cadastrar, Base, Bionexo, Dashboard) — **mas não testado com dados reais**, ver item 20 |
| 9 | Tabela mestre de Contratos + alertas de vencimento | Contratos | Média | ✅ Feito (schema redesenhado a pedido do Everton — cabeçalho + produtos, contato, logística, comercial, renovação; ver item 20) — Alertas/Indicadores como páginas separadas ficaram de fora, entram como badge/KPI na própria tabela mestre. **Testado contra produção (30/08/2026)**: criar contrato com produtos, busca de CNPJ via BrasilAPI (preenche razão social automaticamente), editar status e produtos, filtro por status/tipo/busca, excluir — tudo funcionando, nenhum bug encontrado |
| 10 | Integração OC → Parecer (clique no produto) | Integração | Média | ✅ Feito (30/08/2026) — **achado**: OCs não têm campo de produto no schema, só a Solicitação vinculada tem (`sols.produto`, texto livre, sem código); não existe nenhum campo `cod` em `ocs`/`sols` pra casar exato com `pareceres.cod` — implementar um link exato seria inventar dado que não existe. Solução: quando a OC tem Solicitação vinculada, um botão 🩺 na coluna Ações de `OCTable.tsx` leva pra `/pareceres?produto=<texto>`, que `Consultar.tsx` lê da URL e passa como `valorInicial` pro `SearchProduto` (já existente, já casa por nome/código) — a pessoa escolhe o produto certo entre os resultados, sem link forçado quando não há Solicitação vinculada. Build/typecheck limpos; teste end-to-end em produção ainda pendente (perdi a sessão de teste no meio da sessão, ver nota abaixo) |
| 11 | Métricas expandidas (lead time, reincidência, etc.) | OCs | Média | ✅ Lead time feito (bug do legado corrigido — ver seção "Aprendemos"); índice de reincidência não implementado (não existia no legado) |
| 14 | Cobrança individual/lote, vínculo OC↔Solicitação, histórico | OCs | Alta | ✅ Feito |
| 15 | Fornecedores agrupados + Cadastro de Fornecedores | OCs | Média | ✅ Feito |
| 16 | Solicitações (tela própria) + Resumo Diário | OCs | Média | ✅ Feito |
| 17 | Importação PDF (Acompanhamento de Compras) | OCs | Média | ✅ Feito — únicos parsers de PDF portados; ver nota abaixo |
| 18 | Backup (exportar/importar JSON) | OCs | — | ❌ Não necessário — só existia pra migrar dados antes de o app usar o Supabase, já feito manualmente |
| 12 | RLS real (policies por usuário autenticado) — pré-requisito do primeiro deploy público | Base | **Alta antes do deploy** | ✅ Feito e verificado (30/08/2026) — `rls-autenticado.sql` rodado no SQL Editor. **Achado durante a verificação**: o script inicial só trocou as policies com os nomes documentados neste arquivo (`anon_ocs`, `anon_sols`, etc.), mas existiam policies antigas com **nomes diferentes** (`anon_read_ocs`/`anon_write_ocs`, `anon_read_sols`/`anon_write_sols`, `anon_read_forns`/`anon_write_forns`, `anon_hist`) que não constavam na documentação e continuaram liberando acesso anônimo mesmo depois do script rodar — só apareceram ao consultar `pg_policies` direto. Apagadas manualmente em seguida. **Testado com `fetch` direto na API usando só a anon key (sem token de sessão)**: as 7 tabelas retornam array vazio (RLS filtra as linhas, não dá erro — comportamento correto do Postgres). Testado logado: dados carregam normalmente. RLS agora está de fato fechado — ver aviso atualizado na seção "Banco de Dados" |
| 13 | Autenticação real (3 usuários) | Base | Alta (subiu de prioridade — decisão do Everton em 30/08/2026, antes do deploy público) | ✅ Código feito (30/08/2026) — `src/hooks/useAuth.ts` + `src/components/AuthProvider.tsx` (Context/Provider, mesmo padrão do `useHospital`/`HospitalProvider`), `src/pages/Login.tsx` (e-mail/senha, sem cadastro público, "esqueci minha senha" via `resetPasswordForEmail`), `AuthGate` em `src/main.tsx` bloqueia toda a UI (nenhuma query ao Supabase dispara) até ter sessão, botão de logout no `Topbar`. Testado: sem sessão → só a tela de login renderiza, nenhuma chamada a `rest/v1/*`; login com credencial errada → "E-mail ou senha inválidos." vindo do Supabase Auth real. **Sem diferenciação de permissão entre os 3 usuários** — qualquer autenticado tem acesso igual, mesmo modelo de uso atual. **Deploy em produção confirmado (30/08/2026)**: `https://portal-fusve.vercel.app` está no ar, login testado contra o Supabase Auth real (credencial errada → "E-mail ou senha inválidos." vindo do servidor). **Fluxo de criação de conta definido**: sem cadastro público — Everton pediu "cadastro dentro do site", mas cadastro público reabriria o buraco que a autenticação fecha (RLS libera qualquer autenticado). Decisão: convite por e-mail (Everton clica "Send invitation" no Supabase Dashboard → Authentication → Users, sem infra nova) + `src/pages/DefinirSenha.tsx` (novo) — página com a cara do Portal FUSVE pra onde o link do convite redireciona, a pessoa só define a senha ali, nunca vê tela do Supabase. `AuthGate` em `main.tsx` detecta `type=invite`/`type=recovery` no hash/query da URL e mostra essa página antes do Login normal. `useAuth`/`AuthProvider` ganharam `setPassword()`. Testado: link de convite inválido/expirado mostra erro sem travar. **Configurado no Supabase** (Authentication → URL Configuration): Site URL = `https://portal-fusve.vercel.app`, Redirect URLs = `https://portal-fusve.vercel.app/**` e `http://localhost:5173/**` (antes apontava pro padrão `http://localhost:3000`, o que quebraria o redirect do convite). **Fluxo por e-mail abandonado como caminho principal (30/08/2026)**: na prática, o convite esbarrou no limite de envio do servidor de e-mail compartilhado do Supabase ("email rate limit exceeded") logo nas primeiras tentativas — inviável pra criar as 3 contas. Substituído por **Edge Function `create-user`** (Supabase Dashboard → Edge Functions, criada e publicada via "Via Editor", sem precisar de CLI): recebe `{ email, password }`, valida o JWT de quem chamou com `supabaseAuth.auth.getUser(jwt)` usando `SUPABASE_ANON_KEY` (só usuário já logado no Portal FUSVE passa — testado: sem header de autorização, a própria plataforma já barra com 401 `UNAUTHORIZED_NO_AUTH_HEADER` antes mesmo do código da function rodar), e só então cria a conta com `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })` usando `SUPABASE_SERVICE_ROLE_KEY` — sem mandar e-mail nenhum, sem limite de taxa. As duas chaves são secrets padrão de toda Edge Function do Supabase, nunca chegam ao navegador. Tela `src/pages/Usuarios.tsx` (nova, rota `/usuarios`, link "Usuários" no `Topbar`) chama `supabase.functions.invoke('create-user', ...)` — o `supabase-js` anexa o token da sessão atual sozinho. **Limitação conhecida (ovo-e-a-galinha)**: pra criar a primeiríssima conta (a do próprio Everton) não tem como usar essa tela, já que ninguém está logado ainda pra chamar a function — pra essa primeira conta, o caminho é o "Create new user" direto no Supabase Dashboard (Authentication → Users), que também não manda e-mail nem tem limite. As outras 2 contas (e futuras) usam a tela `/usuarios` normalmente, já logado. `DefinirSenha.tsx` e o fluxo de convite continuam existindo só pra "esqueci minha senha" (`resetPasswordForEmail`), que é bem mais espaçado no tempo e não deve esbarrar no limite. **Conta do Everton criada e testada (30/08/2026)**: login funcionando em produção, RLS ativo (ver item 12). **"Allow new users to sign up" desligado (30/08/2026)** em Authentication → Sign In / Providers — testado com `fetch` direto no endpoint `/auth/v1/signup` usando a anon key pública: retorna `422 signup_disabled`. Cadastro só é possível autenticado, via `/usuarios` (Edge Function `create-user`) ou pelo Supabase Dashboard. **Pendente**: criar as contas dos outros 2 usuários — adiado a pedido do Everton, sem data definida ainda |
| 19 | **Grandes melhorias visuais/UX no frontend** — Everton achou o visual atual muito básico (28/08/2026), pediu "fluido e bonito como sites mais novos" (29/08/2026). Redesenhei os componentes compartilhados (`src/components/ui/*`): tipografia própria (Plus Jakarta Sans + JetBrains Mono via Google Fonts), sombras em camadas, `Modal`/`Toast` com animação de entrada/saída, `Sidebar` com barra de destaque animada no item ativo, transição de rota, `KpiCard`/`Button`/`Table` com microinterações, `Skeleton`/`EmptyState` novos (aplicados nas telas de maior tráfego: Central de Pendências, Ordens de Compra, Base de Pareceres, Contratos). Por afetar os componentes de base, o visual novo já se propaga pro app inteiro — mas telas específicas (Solicitações, Por Fornecedor, Métricas, etc.) ainda usam texto simples pra loading/vazio em vez de Skeleton/EmptyState. | Base/Todos módulos | Alta | ✅ Fundação feita (29/08/2026) — aplicar Skeleton/EmptyState nas telas restantes fica pra quando fizer sentido |
| 20 | Criar as tabelas `pareceres`, `contratos` e `contrato_produtos` no Supabase de produção | Pareceres, Contratos | Alta | ✅ Feito (29/08/2026) — Everton rodou o SQL no SQL Editor; confirmado via API que as 3 tabelas existem e estão vazias, prontas pra uso |
| 21 | **Bug real corrigido**: `queryClient` (TanStack Query) com `retry: 2` deixava queries que falham (ex: tabela inexistente) presas em `fetchStatus: 'paused'` pra sempre em vez de reportar o erro — reproduzido testando o módulo Contratos contra a tabela ausente. Troquei pra `retry: false` + `networkMode: 'always'` em `src/lib/queryClient.ts`. Efeito colateral aceito: sem retry automático em falhas de rede transitórias (raro numa rede de hospital com Wi-Fi/cabo estável; prefiro um erro visível a uma tela travada em "carregando") | Base | — | ✅ Corrigido |
| 22 | **Evolução do módulo OCs** — spec completa do Everton (29/08/2026), ver seção "Evolução do módulo OCs — roadmap" acima. 4 fases: Operação (central "o que fazer hoje" com priorização automática + ações rápidas + timeline de cobrança + previsão×entrega), Fornecedores (score/ranking/ficha), Gestão (causas/SLA interno×fornecedor/indicadores de processo/dashboard executivo), Produtividade (busca global/exportação segmentada/relatório mensal) | OCs | **Alta** | **Fases 1 e 2 ✅ Feitas (29/08/2026)**. Fase 1: motor de priorização de 4 níveis, Central de Pendências redesenhada, timeline de OC, ação "marcar como respondida". Fase 2: score 0-100 (`src/utils/scoreFornecedor.ts`), Ranking de Fornecedores, Ficha do Fornecedor, detecção automática de problemáticos (≥1,5× a taxa de atraso média) — testado contra produção, identificou corretamente os mesmos fornecedores já sinalizados na Central de Pendências (W J RITSON, B BRAUN, etc.). **Achado**: OCs importadas historicamente não têm `data_entrega_real` preenchida, só a situação final — por isso "tempo médio de entrega" e "previsões cumpridas" aparecem como "—" pra boa parte dos fornecedores até as entregas passarem a ser registradas daqui pra frente pela Central de Pendências; o score em si funciona porque taxa de atraso não depende dessa data. **Fase 3 ✅ Feita (29/08/2026)**: motivo estruturado de ocorrência (`MOTIVOS_OCORRENCIA`, select em vez de texto livre — mantém compatibilidade com texto livre já salvo), Análise de Causas (`/ocs/causas`), SLA interno vs. do fornecedor **sempre em cards separados** (`/ocs/sla`, `src/utils/sla.ts`), Dashboard Executivo (`/ocs/executivo`, só consolida indicadores que já existiam em outras telas). **Limitação documentada, não implementada**: indicadores por etapa Solicitação→Cotação→Negociação→OC do item 20 não têm como ser calculados — o sistema só registra a data da Solicitação e da OC, não existe timestamp de cotação/negociação em nenhum lugar do schema; o "SLA interno" mede só Solicitação→OC (o que dá pra medir de verdade). Alvo do SLA interno (`SLA_INTERNO_DIAS = 3`) é uma suposição inicial documentada no código, ajustável. Testado contra produção, números batem entre as telas (ex.: 17 atrasadas aparecem igual no Dashboard Executivo e na Central de Pendências). **Fase 4 ✅ Feita (29/08/2026) — roadmap completo**: Busca Global (`src/components/ocs/BuscaGlobal.tsx`, embutida no layout do módulo OCs) busca em paralelo OC/Solicitação/Fornecedor e navega pro resultado com o filtro já preenchido via `?q=`; Exportação Inteligente (`/ocs/exportar`, `src/utils/exportar.ts`) — 7 categorias em Excel (OCs em atraso, sem previsão, por fornecedor, cobranças, SLA, ranking de fornecedores, ocorrências), testado contra produção (exportação "OCs por fornecedor" trouxe as 659 OCs reais); Relatório Gerencial Mensal em PDF (`src/utils/relatorioMensal.ts`, mesmo padrão do relatório de pareceres) — resumo do mês, fornecedores críticos, principais ocorrências, **sem valor movimentado** (OCs não têm preço no schema atual). **Decisão registrada**: `xlsx` (SheetJS) tem CVEs conhecidas (prototype pollution/ReDoS) não corrigidas na versão do npm — avaliado como não explorável aqui porque o app só **gera** planilhas a partir de dados que já controla, nunca lê (`XLSX.read`) arquivo de terceiro; instalado via npm normal, decisão documentada no comentário de `exportar.ts`. Com isso as 4 fases do roadmap de Evolução de OCs do Everton estão completas |
| 23 | Adicionar `respondido_em timestamptz` em `hist_oc` | OCs | Alta | ✅ Feito (29/08/2026) — Everton rodou o SQL, confirmado via API. Ação "✓ Marcar como respondida" 100% funcional em produção |
| 24 | Expandir base de produtos do módulo Pareceres com `R_PRODUTO.csv` (export completo do SoulMV) | Pareceres | Média | ✅ Feito (15/09/2026) — 4.579 → 17.733 produtos em `src/data/produtos.json`, cobrindo 14 categorias além de material médico (medicamentos, laboratório, odontologia, manutenção, limpeza, químicos, segurança do trabalho, rouparia/uniformes, gases, terapia nutricional, informática, acessórios/equipamentos, oncológicos, doados). Só amplia a base de busca estática (`useProdutos`/`SearchProduto`) — não criou registros na tabela `pareceres`, já que o CSV não tem informação de marca (decisão do Everton, ver seção "Módulo Pareceres" acima) |
| 25 | Novo módulo OPME — calendário de cirurgias com controle de entrega | OPME | Alta | ✅ Feito (15/09/2026) — tabela `opmes` criada e confirmada pelo Everton em produção, hook `useOpmes.ts`, calendário mensal em `/opmes` com KPIs e lista de pendentes nos próximos 7 dias. Reaproveita `forns` pra fornecedor, sem campo de material (decisão consciente do Everton) |
| 26 | **Hardening v1.0 (fase 1 — P0)** — recebi `CLAUDE_ENGINEERING.md` (agora versionado no repo) com padrões de engenharia/testes/schema. Diagnóstico completo + Top 10 riscos + plano P0-P3 entregues no chat antes de mexer em código (regra 62/63 do doc de engenharia); esta linha registra o que já foi implementado da fatia P0 | Base | **Alta** | ✅ Feito (15/09/2026): **(1)** Vitest configurado (`vitest.config.ts`, `tsconfig.test.json` separado do app pra não vazar tipos `node` pro bundle do navegador) com 32 testes — regressão dos 2 bugs reais já documentados do parser CSV (vírgula decimal entre aspas, dois layouts de coluna) usando fixtures sintéticas em `tests/fixtures/` (não os CSVs reais), e cobertura de `statusPrazo`/`riscoOC`/`diasSemMovimentacao`/`previsaoAtiva`/`isPrevisaoDescumprida`/`dataPrazo` com datas relativas a `getHoje()` (sem precisar de um `Clock` injetável ainda — isso é P2/P3 se algum dia os testes precisarem de data fixa). **(2)** Schema versionado em `supabase/migrations/` — 0001 a 0005 são reconstruções do histórico já aplicado (não rodar de novo; ver `supabase/migrations/README.md` pra a ressalva de que não são um dump exato da CLI, é o que o CLAUDE.md já documentava em prosa, agora em SQL). **(3)** Nova migration `202609150002_check_constraints.sql` com `CHECK ... NOT VALID` (não valida dado histórico, só passa a proteger escritas novas) pra `hospital_id`/`status`/`tipo`/`qtd >= 0`/`preco_unitario >= 0` — **deliberadamente sem CHECK em `ocs.sit`/`sols.sit`**, porque `normalizeSit()` tem fallback intencional pra situação não reconhecida do SoulMV, e uma CHECK estrita transformaria isso em erro de importação (decisão de produto separada, não uma migration). **Aplicada em produção em 16/09/2026** — Everton rodou no SQL Editor, Success em todas as `ALTER TABLE`. `VALIDATE CONSTRAINT` retroativo (cobrir dado histórico) ficou como opcional, não confirmado se foi rodado — as constraints já protegiam escritas novas independente disso. **Fechado em 17/09/2026 (item 30)**: auditoria via MCP achou `ocs`/`sols`/`contratos`/`contrato_produtos` já validados (`convalidated = true`), só `opmes` (criada depois, com as próprias `CHECK ... NOT VALID` em `202609150002_check_constraints.sql`) tinha ficado pra trás — rodado `VALIDATE CONSTRAINT` nas 2 checks de `opmes` (`202609170002_validate_opmes_checks.sql`, instantâneo, tabela tinha 0 linhas). Todas as CHECK constraints do projeto estão validadas agora. **(4)** CI mínimo (`.github/workflows/ci.yml`): lint + typecheck + testes + build em todo push/PR — **sem branch protection ainda**, não bloqueia push direto em main, só dá visibilidade; ativar proteção de branch é decisão do Everton, muda o fluxo de trabalho atual. **Não implementado ainda desta fase P0** (fica pro próximo ciclo): nada mais — repositories/services (P2), migração de datas texto→date (P2, maior risco do plano), Storage pra PDF (P2), Sentry/staging (P3) ficam pra quando o Everton pedir, conforme o roadmap apresentado no chat |
| 27 | **Hardening v1.0 (fase P1 — validação Zod na importação)** | Base, OCs | Alta | ✅ Feito (16/09/2026) — `zod` instalado, `src/utils/validators.ts` (novo, tirou o `[a fazer]` que já existia no CLAUDE.md) com `ocImportadaSchema`/`solImportadaSchema`/`vinculoAcompSchema` e o helper `validarLote()`, que separa itens válidos de inválidos em vez de travar o lote inteiro por causa de 1 linha ruim. Ligado nos 3 fluxos de `Importar.tsx` (OCs CSV, Solicitações CSV, Acompanhamento PDF) — cada item inválido vira uma linha `⚠` no log com o motivo, e o resumo final do card mostra quantos foram ignorados. **Deliberadamente sem validar `sit`/`situação` contra enum fechado**, mesma decisão e mesmo motivo da migration de `CHECK` constraints do item 26 (fallback intencional do `normalizeSit()`). 14 testes novos em `src/utils/validators.test.ts` (total do projeto: 46). Nenhuma mudança de schema — não precisou de migration |
| 28 | **Hardening v1.0 (fase P2 — repositories/services, Strangler Pattern)** | Base, OCs, Contratos, Pareceres, OPME | Média | ✅ **Completo (16/09/2026)** — as 8 tabelas do projeto migradas do padrão "hook faz SQL + mapeamento + tudo" pro padrão repository/hook-adaptador: **`ocRepository.ts`** (`listarOCs`, `salvarOC`, `atualizarSituacaoOC`, `atualizarCamposOC`, `criarOCImportada`, `excluirOC`, `toOC`), **`solRepository.ts`** (`listarSols`, `salvarSol`, `atualizarSituacaoSol`, `atualizarCamposSol`, `excluirSol`, `toSolicitacao`), **`fornecedorRepository.ts`** (`listarFornecedores`, `salvarFornecedor`, `excluirFornecedor`, `toFornecedor`), **`contratoRepository.ts`** (`listarContratos`, `listarContratoProdutos`, `salvarContrato`, `salvarProdutosContrato`, `excluirContrato`, `toContrato`, `toContratoProduto`), **`parecerRepository.ts`** (`listarPareceres`, `buscarParecer`, `salvarParecer`, `excluirParecer`, `toParecer`), **`marcaSugeridaRepository.ts`** (`listarMarcasSugeridas`, `salvarMarcasSugeridas`, `excluirMarcasSugeridas`, `toMapa`), **`opmeRepository.ts`** (`listarOpmes`, `salvarOpme`, `alternarStatusOpme`, `excluirOpme`, `toOpme`), **`histOcRepository.ts`** (`listarHistOC`, `listarHistoricoRecentePorOC`, `listarHistoricoTodos`, `registrarCobranca`, `marcarRespondida`, `toHistOC`). Todos os 8 hooks correspondentes (`useOCs`/`useSols`/`useFornecedores`/`useContratos`/`usePareceres`/`useMarcasSugeridas`/`useOpmes`/`useHistOC`) viraram adaptadores finos — mesma interface pública de antes em todos, nenhum componente/página mudou. `contratoRepository.ts` foi o primeiro a testar o padrão contra sub-tabela relacionada (1 contrato : N produtos, diff/soft-delete preservado). **Achado na migração de pareceres**: `excluirParecer` já usava `DELETE` físico, não soft delete — violação pré-existente da regra 6, documentada no cabeçalho do repository e preservada tal como estava (mudar é decisão de produto separada). **`Importar.tsx` também deixou de acessar o Supabase direto** (violava a regra 4 desde sempre): patch parcial de OC/Solicitação existente usa `atualizarCamposOC`/`atualizarCamposSol`; criação de OC nova (CSV e vínculo do PDF de Acompanhamento) usa `ocRepository.criarOCImportada()`, que **preserva exatamente os mesmos defaults de antes** em vez de reaproveitar `salvarOC`, pra não mudar comportamento de produção silenciosamente. Migração sempre gradual, uma entidade por vez, nunca big-bang (CLAUDE_ENGINEERING.md seção 64). 41 testes novos no total (6 `ocRepository`, 4 `solRepository`, 2 `fornecedorRepository`, 7 `contratoRepository`, 4 `parecerRepository`, 3 `marcaSugeridaRepository`, 3 `opmeRepository`, 5 `histOcRepository`, mais os que já existiam) cobrindo defaults de mapeamento pra campos nullable do schema gerado — total do projeto: **81 testes**. **Achado no processo**: `src/lib/supabase.ts` lança erro se as env vars do Supabase estiverem ausentes — isso quebrava `npm test` (não existe `.env.local` fora do ambiente de dev real), corrigido com `.env.test` (valores fictícios, não são credenciais, Vite carrega automaticamente em modo teste). Nenhuma mudança de schema, nenhuma migration necessária em nenhuma etapa desta fase |
| 29 | **Hardening v1.0 — migração de datas texto→date, processo completo (Fases 1, 2 e Passo 6)** | Base, OCs, Pareceres | Média | ✅ **Completo, inclusive Passo 6, confirmado em produção (17/09/2026)**. Ver seção "Migração de Datas Texto → Date" pro detalhe completo do processo de 6 passos, incluindo o incidente investigado (e encerrado sem perda de dado real) na execução do `DROP` em `pareceres`. **Fase 1 (backfill aditivo)** ✅ aplicada em produção (16/09/2026) nas 3 tabelas (`ocs`, `sols`, `pareceres`), verificações deram 0 discrepâncias. **Fase 2 (troca de código pra ler/escrever as duas colunas)** ✅ completa (16/09/2026), uma coluna por vez, começando pelas de menor risco: `pareceres.data_parecer` → `sols.data` → as 5 colunas de `ocs` por último (`dataSolic`/`previsaoForn`/`previsaoForn2`/`dataEntregaReal`/`ultimaMovimentacao`, que alimentam `src/utils/oc.ts`). Tipo de domínio de cada campo continuou `string`/`string | null` em `DD/MM/YYYY` o tempo todo — nenhuma mudança em formulários/telas/`src/utils/oc.ts`, só nos repositories (`parecerRepository.ts`/`solRepository.ts`/`ocRepository.ts`). **Passo 6 (remover as 7 colunas texto)** — os 3 repositories pararam de vez de ler/escrever as colunas texto (agora só tocam `data_parecer_date`/`data_date`/as 5 `*_date` de `ocs`), `src/types/database.ts` teve as 7 colunas texto removidas dos tipos `Row`/`Insert`/`Update`, `ocRepository.ts` ganhou `deColunaDate()` (inverso de `paraColunaDate()`, preserva `null` em vez de virar `''`) pra manter `OC.previsaoForn`/`dataEntregaReal`/etc. como `null` quando a `_date` correspondente não existe (fallback pro texto removido). Testes de fallback trocados por testes de conversão/null (`ocRepository.test.ts`: 4, `solRepository.test.ts`: 2, `parecerRepository.test.ts`: 2). Migration `202609160004_remove_colunas_texto_datas.sql` fez o `DROP COLUMN IF EXISTS` das 7 colunas — **confirmado via auditoria direta do schema live em 17/09/2026 (item 30)**: as 7 colunas texto não existem mais em nenhuma das 3 tabelas. Documentação das 3 tabelas em "BANCO DE DADOS" atualizada pro schema real |
| 30 | **Auditoria + hardening do Supabase via MCP** — pedido do Everton pra "ordenar o projeto no Supabase como um sênior faria". Comparei o schema/RLS/advisories reais em produção contra o que o CLAUDE.md documentava | Base | Alta | ✅ Feito (17/09/2026). **Achados de documentação desatualizada**: o Passo 6 da migração de datas (item 29) já tinha sido executado em produção, mas o CLAUDE.md ainda dizia "pendente de execução por Everton" — corrigido. **Achado novo, sem dono claro na hora**: `pareceres.pdf_path` (text, nullable) existia em produção mas nenhum código do projeto (nesta sessão) lia/escrevia essa coluna e nenhuma migration a documentava. Everton confirmou que era resquício de um plano de migrar o PDF do parecer de `pdf_data_url` (base64 no Postgres, ineficiente pra arquivo binário) pra Supabase Storage — na hora, pareceu "ainda não retomado". **Reconciliado no merge de 18/09/2026**: uma sessão paralela (branch separada, não visível daqui até o merge) já tinha implementado esse plano em 16/09/2026, ver item 31. **Achados reais do Supabase Advisor** (`mcp__supabase__get_advisors`), corrigidos em `202609170001_hardening_advisors_p0.sql`: (1) função `update_updated_at()` com `search_path` mutável (classe de risco: schema injection) — fixado com `search_path = ''`; (2) as 9 policies de RLS reavaliavam `auth.role() = 'authenticated'` **por linha** em vez de `(select auth.role())`, o que impede o Postgres de cachear como InitPlan — reescritas todas, mesma regra de acesso, só a forma de avaliação; (3) `opmes.fornecedor_id` (FK) sem índice de cobertura — criado `idx_opmes_fornecedor`. Aproveitado pra padronizar nome de policy: as 9 agora são `authenticated_<tabela>` (antes `marcas_sugeridas`/`opmes` usavam `auth_<tabela>`, as outras 7 usavam `authenticated_<tabela>` — inconsistente). Verificado via advisor de novo: os 2 warnings sumiram, sobrou só "Leaked Password Protection" (toggle de Auth no Dashboard, não é SQL — Everton precisa ativar em Authentication → Providers → Email) e os índices não usados (esperado, dataset pequeno: `ocs` tem 1051 linhas, a maioria das outras tabelas tem dezenas — não é sinal de problema, é só baixo volume de tráfego ainda). **Achado de processo**: o schema `supabase_migrations` (rastreio real de migrations do Supabase) não existia no projeto — os arquivos em `supabase/migrations/` eram só reconstrução em texto rodada manualmente no SQL Editor, nunca houve `supabase link`/`db push`. Essa migration foi a primeira aplicada via `mcp__supabase__apply_migration`, que passou a registrar de verdade em `list_migrations` — daqui pra frente essa é a fonte de verdade, junto com os arquivos locais. `supabase/config.toml` e `supabase/.gitignore` também apareceram no `git status` como untracked — commitados no merge de 18/09/2026 (sem segredo real, só `env(...)` placeholders). **Continuação autorizada pelo Everton no mesmo dia** — mais 2 achados fechados: `VALIDATE CONSTRAINT` retroativo pendente em `opmes` desde o item 26 (`202609170002_validate_opmes_checks.sql`, ver item 26 atualizado) e `src/types/database.ts` regenerado de verdade via `mcp__supabase__generate_typescript_types` em vez do arquivo mantido manualmente desde 30/08 (ver item 2 atualizado) — essa troca achou que a FK `ocs.solicitacao_id → sols.id` documentada nos tipos manuais nunca existiu de fato no banco. `tsc -b`/`npm test`/`npm run build` confirmados limpos depois das duas mudanças |
| 31 | **Hardening — Storage pra PDF** (item 1 do plano de conclusão do Hardening, `CLAUDE_ENGINEERING.md` seção 12) | Pareceres | Média | ✅ **Código pronto (16/09/2026), migration pendente de execução.** Ver seção "Storage pra PDF" acima pro detalhe completo. Migration `202609160005_storage_pareceres_pdf.sql` (bucket `pareceres-pdfs` privado + RLS autenticado + `pareceres.pdf_path`, aditiva) — **Everton precisa rodar no SQL Editor**. `parecerRepository.ts` ganhou `uploadPdf`/`obterUrlAssinadaPdf`; `ParecerForm.tsx` sobe o arquivo pro Storage no submit em vez de ler como base64; `useAbrirPdfParecer()` (novo, `usePareceres.ts`) centraliza a lógica de abrir PDF preferindo `pdfPath` com fallback pro `pdfDataUrl` legado, usado em `ParecerCard`/`Base.tsx`/`ParecerForm`. `pdf_data_url` mantido só como fallback de leitura — nenhum dado existente tocado, PDF novo já não escreve mais nele. Script opcional `scripts/backfill-pareceres-pdf-storage.ts` (`npm run backfill:pareceres-pdf-storage`, dry-run por padrão) migra PDFs antigos em base64 pro Storage, não obrigatório rodar agora. 1 teste novo em `parecerRepository.test.ts` (`pdfPath` separado de `pdfDataUrl`). Como bônus, resolve de forma mais robusta o bug de "Chrome bloqueia abrir PDF novo em aba" que existia com `data:` URL (URL assinada do Storage é uma URL `https://` de verdade, sem a limitação de navegação de nível superior pra `data:`). **Achado no merge de 18/09/2026**: esse trabalho foi feito numa sessão paralela (16/09/2026) que não tinha sido integrada ainda — é a origem do `pdf_path` "órfão" que o item 30 (auditoria de 17/09) encontrou sem dono claro; reconciliado, `src/types/database.ts` (regenerado no item 30/2) já reflete a coluna corretamente |
| 32 | **Hardening — Ambiente de staging** (item 2 do plano de conclusão do Hardening, `CLAUDE_ENGINEERING.md` seção 27) | Base | Baixa | ⏸️ **Adiado (16/09/2026)** — Everton não tem mais espaço pra um projeto novo no plano free do Supabase. Tentativa alternativa: Supabase local via CLI (`supabase init` + `supabase start`, sobe Postgres+Auth+Storage local via Docker, zero custo, aplica `supabase/migrations/` automaticamente) — Docker funciona no Codespace (`docker ps` ok), mas o serviço Realtime (Elixir) trava na conexão com o Postgres local (`DBConnection.ConnectionError` depois de ~15s) mesmo depois de tentar de novo; provável limitação de recursos da máquina padrão do Codespace (poucas vCPUs pra rodar Postgres+Auth+Realtime+Storage+Studio ao mesmo tempo). Não investigado a fundo (ex: desligar `[realtime]`/`[analytics]` no `config.toml`, rodar numa máquina de Codespace maior, ou tentar localmente fora do Codespace) — Everton decidiu adiar. Retomar quando fizer sentido: opções na mesa são (a) Supabase local via CLI numa máquina com mais recursos, (b) liberar espaço apagando um projeto Supabase não usado e criar o staging cloud normal (Vercel Preview + Supabase separado, como descrito na seção "Ambiente de Staging" — a escrever quando isso avançar), ou (c) aceitar testar em produção com cautela por enquanto, como já vem sendo feito |
| 33 | **Hardening — Proteger `main`** (item 3 do plano de conclusão do Hardening, `CLAUDE_ENGINEERING.md` seção 29) | Base | Baixa | ⏸️ **Adiado (16/09/2026)** — não tem ferramenta no GitHub MCP desta sessão pra configurar branch protection via API (só cobre PR/Issues/Actions), e o Everton não conseguiu fazer pelo Codespace agora. Passo a passo salvo aqui pra rodar de casa, direto no GitHub (`github.com/EvertonJr21/portal-fusve` → **Settings → Branches** → **Add branch protection rule**): (1) Branch name pattern: `main`; (2) marcar **Require a pull request before merging**, com "Require approvals" **desligado** (trabalha sozinho, sem outro revisor); (3) marcar **Require status checks to pass before merging** e selecionar o check **`build`** (único job do `.github/workflows/ci.yml` — roda lint + typecheck + test + build); (4) marcar **Require branches to be up to date before merging**; (5) marcar **Do not allow bypassing the above settings** (senão o dono do repo ainda consegue pular a regra); (6) **Save changes**. **Efeito colateral importante, avisado ao Everton antes de tentar**: depois disso, `git push origin main` direto passa a ser **rejeitado** — toda mudança (dele ou do Claude Code) precisa virar branch → Pull Request → CI verde (check `build`) → merge, no lugar do fluxo atual de push direto + fast-forward. Quando configurar, avisar o Claude Code pra trocar o processo de fim-de-tarefa pra "abrir PR + esperar CI + dar merge" em vez de "push direto em main" |
| 34 | Importação de OCs (`Importar.tsx`) passa a registrar entrega automaticamente e parou de auto-preencher previsão em OC nova | OCs | Média | ✅ Feito (18/09/2026) — pedido do Everton: Lead Time/SLA/Score não conseguiam contar a entrega de OCs importadas porque elas já chegam "Atendida" direto do relatório do SoulMV, sem nenhum momento de "clicar em registrar entrega"; e a previsão do fornecedor vinha preenchida automaticamente do relatório mas nem sempre batia, sem espaço pra ele corrigir. **Decisões confirmadas com o Everton**: data de entrega registrada = data da importação (hoje), não a previsão do fornecedor — o relatório não tem campo de entrega real, é a melhor aproximação disponível ("quando ficamos sabendo que foi entregue"); **só daqui pra frente**, sem backfill retroativo nas OCs já "Atendida" sem `dataEntregaReal` (ficam de fora das métricas como já estavam, não inventa data histórica); previsão do relatório só parou de preencher em **OC nova** — em OC existente sem previsão, continua aceitando a do relatório como valor inicial (nunca sobrescreve o que o Everton já registrou manualmente, comportamento que já existia). Implementado em `ocRepository.ts` (`OCImportadaInput.dataEntregaReal` opcional, `criarOCImportada` grava `data_entrega_real_date`) e `Importar.tsx`/`importarOCsCSV`: no caminho de OC existente, transição pra `Atendida` sem `dataEntregaReal` prévia seta a data de hoje (log ganha "(entrega registrada hoje)"); no caminho de OC nova, `previsaoForn` vai sempre `null` (antes vinha do CSV) e, se já chega `Atendida` na primeira importação, também registra a entrega na hora. Lógica de decisão ficou inline em `Importar.tsx` (não extraída pra `src/utils/oc.ts`) pra manter consistência com o padrão do projeto — página não tem teste hoje, só utils/repositories puros são testados |
| 35 | **Importação de Acompanhamento de Compras via planilha (.xls/.xlsx)**, alternativa ao PDF | OCs | Alta | ✅ Feito (18/09/2026) — pedido do Everton depois que um relatório PDF real veio com o fornecedor vazio na extração (heurística de posição do PDF.js quebrou nesse layout específico). Ver seção "Acompanhamento de Compras" (Importação de Dados do SoulMV) acima pro detalhe completo. Novo `src/utils/acompXls.ts`, `Importar.tsx` detecta a extensão e escolhe o parser certo (PDF ou planilha), card de upload aceita as duas extensões. Testado contra o relatório real do Everton: 33/33 vínculos corretos. **Confirmado com o Everton**: as 33 OCs do arquivo de teste realmente pertencem todas à mesma solicitação — não é bug do parser, é uma solicitação real com várias OCs. 5 testes novos (`acompXls.test.ts`). Nota de segurança do `xlsx` em `exportar.ts` atualizada (agora o app também *lê* planilha, não só escreve — risco avaliado como baixo, é sempre o próprio Everton subindo um export dele mesmo) |
| 36 | **Aviso de "já importado" nos 3 fluxos de `Importar.tsx`** | OCs | Média | ✅ Feito (18/09/2026) — pedido do Everton depois de rodar a importação de Acompanhamento duas vezes seguidas: na segunda vez o card só mostrava "0 OC(s) vinculada(s) \| 0 OC(s) criada(s)", sem deixar claro se tinha dado algo errado ou se era só o arquivo repetido. Achado ao revisar os 3 fluxos: o de Acompanhamento nem contava esse caso (`continue` silencioso pra OC já vinculada à solicitação certa, sem incrementar nada); os de OCs/Solicitações CSV já contavam ("X sem mudança" no resumo), mas também sem nenhum aviso explícito quando **tudo** cai nesse balde. Adicionado contador `jaCorretas` no fluxo de Acompanhamento (aparece no resumo como "X já corretas") e, nos 3 fluxos, uma linha `ℹ` no log ("esse arquivo já parece ter sido importado antes") quando nada muda e havia itens processados — sem bloquear o reimport, só avisando. Nenhum teste automatizado (página não tem suite, mesmo padrão do item 34) — validado via `tsc`/`npm test`/`npm run build` |
| 37 | **Botão de upload de PDF do parecer sem estilo em `ParecerForm.tsx`** | Pareceres | Baixa | ✅ Feito (18/09/2026) — Everton apontou que a tela `/pareceres/cadastrar` não tinha "um botão explícito pra importar o PDF", questionando se o redesign visual do item 19 (29/08/2026, antes desta sessão) realmente cobriu o app inteiro. Achado real: o campo de PDF em `ParecerForm.tsx` era um `<input type="file">` nativo do navegador sem nenhuma classe de estilo (só `text-xs`) — some visualmente ao lado dos outros campos estilizados do mesmo formulário, muito fácil de não perceber que existe. Único outro `<input type="file">` do projeto é o de `UploadCard.tsx` (usado em `/ocs/importar`), que já tinha um botão "Escolher arquivo" decente — `ParecerForm.tsx` ficou pra trás porque foi escrito num momento diferente e ninguém comparou os dois lado a lado até agora. Corrigido com um botão estilizado (`outline`, mesmo padrão visual do resto do formulário) que envolve um input nativo escondido (`sr-only`) — label muda pra "Trocar arquivo" quando já tem um PDF vinculado, e o nome do arquivo/link "📄 abrir" fica ao lado. Revisão geral dos outros `<select>` do projeto (10 arquivos) não achou mais nenhum sem `className` — o gap era só esse. Sem mudança de schema/lógica, só CSS/markup |
| 38 | **Auditoria profissional de front-end/UX** (pedido explícito do Everton, prompt completo de 30 fases) — 3 sub-agentes leram tokens/CSS, os 12 componentes de `src/components/ui/` e 8 telas-chave dos 4 módulos, sem alterar nada; relatório entregue no chat com diagnóstico, Top 20 problemas, design system proposto e roadmap P0-P3. Everton autorizou aplicar tudo ("autorizado a fazer toda e qualquer alteração") | Base/Todos módulos | Alta | ✅ **P0 completo (18/09/2026)** — os 5 itens de mais baixo esforço/maior impacto do roadmap: **(1)** `Badge.tsx` (componente genérico de UI kit, só 2 usos reais) usava paleta Tailwind crua (`bg-blue-100`/`text-blue-700` etc.) diferente da paleta `status-*` (tokens) usada por todo o resto do app (`ContratoStatusBadge`, `MarcasBadge`, `OCTable`) — dois sistemas de cor pro mesmo conceito. Alinhado aos tokens `status-*`. **(2)** Confirmação de ações destrutivas: **11 call sites** em 10 arquivos usavam `window.confirm()` nativo do navegador (inconsistente com o resto da UI, sem estilo, bloqueia a thread). Criado `useConfirm()` (`src/hooks/useConfirm.ts`) + `<ConfirmProvider>` (`src/components/ui/ConfirmDialog.tsx`, novo — mesmo padrão de Context/Provider do `useToast`/`ToastProvider`, construído sobre o `Modal.tsx` já existente), com API assíncrona que imita o `confirm()` nativo (`if (!(await confirmar('...'))) return`) mas em modal consistente com o design system, com `tone: 'danger'` pras exclusões (botão vermelho). Montado em `main.tsx` ao lado do `ToastProvider`. Todos os 11 call sites trocados (`OpmeForm`, `components/ocs/Dashboard`, `OCHistorico`, `MarcasSugeridas`, `pareceres/Base`, `contratos/TabelaMestre`, `PorFornecedor`, `RankingFornecedores`, `ocs/Solicitacoes`, `ocs/OrdensDeCompra`, `ocs/Fornecedores`) — 2 delas eram funções síncronas e viraram `async`. **(3)** `HospitalSwitch.tsx` usava `style={{backgroundColor: h.cor}}` inline (contrariava a regra 9 do CLAUDE.md, "nunca estilo inline pra layout") — trocado por classes `bg-huv`/`bg-hmk` (Tailwind v4 já gera esses utilitários automaticamente a partir dos tokens `--color-huv`/`--color-hmk` do `index.css`, mapeadas por `HospitalId` num `Record` fixo, nunca `bg-${h.id}` interpolado). Aproveitado pra remover `HOSPITAIS[*].cor` de `constants/index.ts` (hex duplicado do token, ninguém mais lia esse campo — risco de dessincronia apontado na auditoria). **(4)** Busca duplicada em `/ocs/ordens` (campo da `BuscaGlobal` fixo no topo do layout + campo de busca dentro de `OCFilters`, mesmo escopo aparente): decidido **não remover** o campo local (ele filtra a tabela ao vivo sem navegar, `BuscaGlobal` só navega a partir de um resultado escolhido — são funções complementares, não duplicadas) — só desambiguado via placeholder ("Filtrar por fornecedor ou nº OC **nesta lista**...") e `title` explicando a diferença. **(5)** No Dashboard Executivo, os cards "Atrasadas"/"Sem previsão"/"Previsões descumpridas" linkavam todos genericamente pra `/ocs` (Central de Pendências, que filtra por *prioridade*, não pelo mesmo critério do card) — o clique não entregava o que prometia. Corrigido: os 3 links agora vão pra `/ocs/ordens?rapido=<filtro>`, e `OrdensDeCompra.tsx` passou a ler `?rapido=` da URL (além do `?q=` que já lia, vindo da `BuscaGlobal`) e pré-aplicar o filtro rápido correspondente. Isso exigiu adicionar um filtro rápido novo que não existia — **"Previsão descumprida"** (`FiltroRapido` em `filters.ts` + chip em `OCFilters.tsx`) — usando o campo `OC.previsaoDescumprida` que já existia no schema/tipo, só nunca tinha virado filtro de UI. Nenhuma mudança de schema, nenhuma regra de negócio alterada — só como esses dados já existentes são expostos/navegados. `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos. **P1 completo (18/09/2026)**: **(1)** `IconButton` (`src/components/ui/IconButton.tsx`, novo) consolida o `<button className="rounded border border-slate-200 px-1.5 py-1 ...">` que era reescrito à mão em `OCTable.tsx`, `TabelaMestre.tsx` e `pareceres/Base.tsx` (3 tabelas, ~14 botões de ação de linha ao todo) — sempre com `title`/`aria-label` (rótulo acessível obrigatório, não só ícone) e `tone="danger"` pras ações destrutivas. **(2)** `StatusDot` (`src/components/ui/StatusDot.tsx`, novo) substitui o semáforo 🔴🟡🟢/⚪ redefinido de forma independente em `OCTable.tsx` (risco de fornecedor) e `FichaFornecedor.tsx` (atraso de OC) — bolinha CSS colorida com os tokens `status-*` em vez de emoji (elimina a variação de renderização entre SO/navegador/fonte apontada na auditoria); `components/ocs/Dashboard.tsx` (Central de Pendências) **não** foi migrado pra esses componentes de propósito — os botões de lá já têm rótulo de texto visível ("Histórico", "Editar", "Excluir"), não são ícone-puro, então não são o mesmo problema que motivou o `IconButton`. **(3)** Paletas de gráfico duplicadas e divergentes (`pareceres/Dashboard.tsx` tinha 7 cores, `ocs/AnaliseCausas.tsx` tinha 9, parcialmente sobrepostas) consolidadas em `CORES_GRAFICO` (`src/constants/index.ts`), union das duas, único ponto de verdade agora. `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos. **P2 completo (18/09/2026)**: **(1)** `KpisOC.tsx` (Ordens de Compra) — "Vencidas" e "Vinculadas" agora são clicáveis (mesmo padrão `active`/`onClick` do `KpiCard` já usado na Central de Pendências/Dashboard Executivo): clicar aplica o filtro `rapido='vencidas'`/`vinculo='linked'` equivalente na tabela abaixo. "Pendentes" e "Com Previsão" ficaram só informativos de propósito — não existe hoje uma dimensão de filtro pra "situação não-final" nem "tem previsão preenchida" (só filtro por data exata), inventar isso pra só esses 2 cards ficou fora de escopo. **(2)** `pareceres/Base.tsx` ganhou chip "⚠ A revisar (N)" reaproveitando a mesma lógica de `validadeInfo()` que já colore a coluna Validade (nenhuma lógica nova, só exposta como filtro) + paginação de 15/página. **(3)** `contratos/TabelaMestre.tsx`: os 4 KPIs (Total/Ativos/Vencendo em breve/Vencidos) viraram clicáveis — precisou de um filtro novo, `vigenciaFiltro` (`'' | 'vencendo' | 'vencido'`), já que vigência é um campo *calculado* (`statusVigencia()`) e não corresponde a nenhum valor do select `status` existente — + paginação de 15/página. **(4)** `Pagination` (`src/components/ui/Pagination.tsx`, novo) consolida o bloco "X–Y de Z + Anterior/Próxima" que só existia hardcoded em `OCTable.tsx` — retrofitado lá também, e reusado nos dois novos usos de paginação (Base/TabelaMestre) em vez de reescrever a lógica pela 3ª vez. **(5)** Sidebar do módulo OCs (12 itens numa lista linear só, o menu mais carregado do sistema) agrupada em 4 seções funcionais — Operação (Central de Pendências/Dashboard Executivo/Ordens de Compra/Solicitações), Fornecedores (Por Fornecedor/Ranking/Cadastro), Análise (SLA/Causas/Métricas), Dados (Importar/Exportar). `Sidebar.tsx` ganhou um prop `groups?: NavGroup[]` (retrocompatível — módulos com 1-3 itens continuam usando `items` flat sem cabeçalho de seção, só OCs usa `groups` por enquanto). `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos. **P3 completo (18/09/2026)**: **(1)** As 6 telas que ainda mostravam `<p>Carregando...</p>` em texto puro (`ocs/Fornecedores.tsx`, `ocs/Metricas.tsx`, `ocs/PorFornecedor.tsx`, `ocs/Solicitacoes.tsx`, `opmes/Calendario.tsx`, mais o early-return de `Metricas.tsx`) agora usam `SkeletonRows` — mesmo componente que 9 outras telas já usavam, só faltava aplicar nessas. `pareceres/Dashboard.tsx` trocou "Nenhum dado."/"Sem consultas ainda." (genéricos) por mensagens específicas com ícone ("📭 Nenhuma categoria com parecer cadastrado ainda.", "🕓 Nenhuma consulta feita nesta sessão ainda."). **(2)** Limpeza de `shadow-sm`/`shadow-lg` (Tailwind cru) residuais — 8 usos em 7 arquivos trocados pelos tokens `shadow-soft-sm`/`shadow-soft-lg`. `rounded-2xl` (Login/DefinirSenha/Usuarios/Modulos) e o `rounded-sm` do `<mark>` de busca **não** foram alterados — na inspeção, são um padrão coerente e intencional (painéis grandes "hero" vs. cards normais, respectivamente um destaque inline pequeno), não uma inconsistência real; a auditoria só tinha sinalizado a contagem baixa como possível outlier. **(3)** `Dropdown`/`DropdownItem` (`src/components/ui/Dropdown.tsx`, novo — projeto não tinha nenhum componente de menu suspenso, confirmado na auditoria) — fecha ao clicar fora, `Esc`, ou ao escolher um item. Aplicado em `OCTable.tsx`: a coluna Ações tinha até 6 botões sempre visíveis; agora mostra 3 diretos (✉ cobrar e-mail, 💬 cobrar WhatsApp, ✏ editar — as ações mais frequentes do fluxo de cobrança) + um menu "⋮ Mais ações" com Histórico, Ver parecer (condicional) e Excluir (com rótulo de texto, não só ícone, já que dentro do menu tem espaço). `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos. **Com isso as 4 fases do roadmap da auditoria de front-end/UX (18/09/2026) estão completas** — ver relatório de diagnóstico completo no histórico da conversa pra qualquer item que não tenha virado ação concreta (ex: adoção de biblioteca de ícones, dark mode — avaliados e conscientemente não implementados por ora). **Testado no navegador antes de fechar (18/09/2026)**: sem credenciais reais do Supabase nesta sessão, então o teste foi feito contornando temporariamente (só localmente, nunca commitado) o `AuthGate` do `main.tsx` pra inspecionar as telas autenticadas via Playwright/Chromium headless — confirmado visualmente: Sidebar de OCs agrupada em 4 seções, `HospitalSwitch` com as classes `bg-huv`/`bg-hmk`, chip "Previsão descumprida", placeholder desambiguado da busca local, e o vínculo bidirecional KPI↔filtro funcionando de verdade (clicar no KPI "Vencidas"/"Vinculadas" ativa o chip/select correspondente E o próprio card fica com anel de destaque). Sem dado real carregado (Supabase inacessível no sandbox), não foi possível clicar numa linha de tabela de verdade pra testar o `Dropdown`/`IconButton`/`ConfirmDialog` em uso — validados só por `tsc`/build e leitura de código |
| 39 | **Bug real corrigido — "Prazo Forn." idêntico ao "Prazo Inst." em `/ocs/metricas`** | OCs | Alta | ✅ Feito (18/09/2026) — Everton testou a tela com dados reais e notou que as colunas "Prazo Inst." e "Prazo Forn." mostravam sempre a mesma data em toda linha. Causa: `calcularLinha()` em `Metricas.tsx` calculava `dPrazoForn` como `data_solic + 15 dias` — a mesmíssima fórmula (mesma data-base, mesmo `PRAZO`) usada pro prazo institucional, só com uma variável chamada `dOC` que na real guarda `oc.dataSolic` (não existe "data da própria OC" separada no schema, só `data_solic_date`) — por isso os dois prazos colapsavam pro mesmo valor sempre. **Correção confirmada com o Everton**: "prazo do fornecedor" não é um prazo calculado — é a data que ele mesmo registra no campo Previsão da OC (`oc.previsaoForn`); só quando não tem previsão registrada **e** a OC já foi entregue, usa a própria data de entrega como aproximação (sem previsão pra comparar, não penaliza). Trocado `dPrazoForn = addDias(dOC, PRAZO)` por `dPrazoForn = (oc.previsaoForn && parseDMY(oc.previsaoForn)) || dEntrega` — a função já só roda pra OCs com `dataEntregaReal` preenchida (retorna `null` antes disso), então o fallback pra entrega já respeita a condição "e a OC for entregue" naturalmente. **Escopo da correção**: só `Metricas.tsx` — `src/utils/sla.ts` (`slaFornecedor`, usado em `/ocs/sla`) tem uma fórmula parecida (`dataPrazo() + 15 dias extra`) mas é uma métrica **diferente e documentada de propósito** (janela de tolerância total desde a solicitação, não "bateu a previsão prometida") — não mexido, fora do que o Everton reportou. Nenhuma mudança de schema; `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos |
| 40 | **Múltiplos PDFs por marca no módulo Pareceres** | Pareceres | Alta | ✅ **Completo e em produção (21/09/2026)** — Everton rodou `202609210001_parecer_anexos.sql` no SQL Editor, confirmado (`SELECT count(*) FROM parecer_anexos` = 0, tabela criada vazia). Funcionalidade ativa. Pedido do Everton depois de perguntar se o sistema suporta mais de um PDF por produto quando há marcas diferentes com parecer próprio (ex: produto com ZELARA e POLYMED nas Proibidas, cada uma com o PDF do respectivo fabricante) — resposta: "Múltiplos PDFs por marca. e tem que destacar vincular o parecer com a marca." Antes só existia 1 PDF por parecer inteiro (`pareceres.pdf_path`/`pdf_data_url`), sem nenhum vínculo com marca específica. **Nova tabela `parecer_anexos`** (ver seção própria em "BANCO DE DADOS", migration `202609210001_parecer_anexos.sql`, aditiva — não toca `pareceres`) — `id`, `parecer_cod` (FK → `pareceres.cod`, `ON DELETE CASCADE`), `categoria` (`padrao`/`permitidas`/`restritas`/`proibidas`), `marca`, `pdf_path` (mesmo bucket `pareceres-pdfs` já existente do item 31, sub-caminho `<cod>/<categoria>/<marca>/<timestamp>-<nome>`, sem migration de Storage nova — RLS de bucket é por bucket, não por caminho), `nome_arquivo`, soft delete (`deleted_at`, ao contrário do hard delete pré-existente e documentado de `parecerRepository.excluirParecer` — aqui seguido o padrão correto da regra 6). **`parecerAnexoRepository.ts`** (novo, padrão repository) + **`useParecerAnexos.ts`** (novo, adaptador fino — `useAnexosParecer(cod)`, `useTodosAnexos()`, `useSalvarAnexo()`, `useExcluirAnexo(cod)`, `useAbrirAnexo()`). **UI**: `MarcasEditor.tsx` ganhou, por marca já adicionada, uma sub-linha mostrando os PDFs já salvos (📄, clicáveis, com ✕ pra remover com confirmação) + os PDFs escolhidos nesta edição mas ainda não enviados (📎, pendente até o "Salvar") + um "+ PDF" pra anexar mais um — cada anexo fica visualmente dentro do chip da própria marca, nunca solto. `ParecerForm.tsx` sobe os PDFs pendentes pro Storage logo depois de salvar o parecer (`salvarAnexo.mutateAsync` em loop) e relabelou o campo antigo de "PDF" pra "PDF geral do parecer" com a explicação de que ele não é vinculado a marca nenhuma (mantido — Strangler Pattern, sem quebrar parecer antigo que só tem esse campo). `MarcasBadge.tsx` (usado em `ParecerCard.tsx` e `pareceres/Base.tsx`) ganhou um indicador 📎 em cada badge de marca que tem anexo — abre direto se for 1 PDF, ou um `Dropdown` (componente do item 38/P3) listando cada um se for mais de 1. `pareceres/Base.tsx` busca todos os anexos numa query só (`useTodosAnexos()`) e agrupa por `parecer_cod` no cliente, evitando N+1 na listagem. **Testado no navegador (Playwright, mesmo método do item 38 — sem credenciais reais do Supabase, `AuthGate` contornado só localmente e revertido depois)**: fluxo completo de cadastrar parecer, adicionar marcas ZELARA e POLYMED nas Proibidas, e anexar um PDF de teste pra cada uma — as duas ficaram visualmente distintas e vinculadas à marca certa, sem nenhum erro de console. `tsc -b`/`npm test` (93/93)/`npm run lint`/`npm run build` confirmados limpos. **Pendente**: Everton precisa rodar `202609210001_parecer_anexos.sql` no SQL Editor antes da funcionalidade operar em produção — até lá, os componentes renderizam normalmente mas a lista de anexos fica sempre vazia (tabela não existe ainda) |
