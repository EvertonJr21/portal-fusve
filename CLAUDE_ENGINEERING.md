# CLAUDE_ENGINEERING.md — Portal FUSVE

## OBJETIVO DESTE DOCUMENTO

Este arquivo complementa o `CLAUDE.md` principal do Portal FUSVE.

O `CLAUDE.md` continua sendo a referência funcional e de domínio.

Este documento define os padrões de **engenharia de software, arquitetura, banco de dados, testes, segurança, observabilidade e processo de deploy** que devem orientar todas as próximas alterações.

A prioridade atual NÃO é adicionar novas funcionalidades.

A prioridade é transformar o sistema existente em uma aplicação:

- previsível;
- testável;
- auditável;
- segura;
- facilmente reversível;
- consistente entre ambientes;
- simples de manter;
- resistente a regressões.

---

# 1. PRINCÍPIO CENTRAL

Antes de escrever código, sempre perguntar:

1. Qual é o problema raiz?
2. A mudança altera domínio, banco, infraestrutura ou apenas UI?
3. Existe risco de regressão?
4. Existe risco de corrupção silenciosa de dados?
5. Como essa mudança será testada?
6. Como será revertida?
7. Existe uma solução mais simples?
8. Estamos corrigindo a causa ou criando um workaround?

Nunca institucionalizar um workaround como regra arquitetural quando o problema pode ser corrigido na origem.

---

# 2. NÃO REESCREVER O PROJETO

A stack atual deve ser mantida:

- React
- TypeScript
- Vite
- Tailwind
- TanStack Query
- Supabase/PostgreSQL
- Vercel
- GitHub

Não introduzir:

- microserviços;
- Kubernetes;
- Kafka;
- NestJS;
- event sourcing;
- CQRS;
- Redis;

sem justificativa técnica clara baseada em um problema real.

O sistema atual não possui escala que justifique essa complexidade.

---

# 3. CONGELAMENTO TEMPORÁRIO DE FEATURES

Até o término da fase de Hardening v1.0:

NÃO adicionar novos módulos.

NÃO adicionar dashboards.

NÃO adicionar novas métricas.

NÃO adicionar novos fluxos de negócio.

Exceções:

- correção de bug;
- requisito operacional crítico;
- requisito de segurança;
- adequação regulatória;
- correção de dados.

---

# 4. HARDENING V1.0 — ORDEM OBRIGATÓRIA

Executar nesta ordem:

1. Banco de dados e migrações
2. Datas e timestamps
3. Testes automatizados
4. Separação de camadas
5. CI
6. Ambientes
7. Storage
8. Observabilidade
9. Segurança
10. Documentação

Não inverter essa ordem sem justificar.

---

# 5. BANCO DE DADOS É A FONTE DA VERDADE

O schema do PostgreSQL deve ser versionado.

O `CLAUDE.md` NÃO deve ser tratado como fonte autoritativa do schema.

O Supabase Dashboard NÃO deve ser a única fonte autoritativa.

A fonte de verdade deve ser:

```text
supabase/
└── migrations/
```

Exemplo:

```text
supabase/migrations/
├── 202609150001_initial_baseline.sql
├── 202609150002_fix_dates.sql
├── 202609150003_hist_oc_timestamp.sql
├── 202609150004_storage_pareceres.sql
└── 202609150005_constraints.sql
```

Toda alteração estrutural deve possuir migration versionada.

---

# 6. PROIBIDO ALTERAR SCHEMA MANUALMENTE SEM MIGRATION

A partir deste ponto:

NÃO executar ALTER TABLE diretamente em produção sem registrar migration equivalente.

NÃO criar coluna manualmente apenas pelo Supabase Dashboard.

NÃO criar policy manualmente sem registrar SQL.

NÃO criar índice manualmente sem migration.

Se uma correção emergencial for necessária:

1. executar correção;
2. imediatamente criar migration que represente exatamente o estado final;
3. registrar motivo.

---

# 7. MIGRAÇÕES DEVEM SER IDEMPOTENTES QUANDO POSSÍVEL

Preferir:

```sql
ADD COLUMN IF NOT EXISTS
CREATE INDEX IF NOT EXISTS
```

Quando não for possível:

documentar pré-condições.

Toda migration relevante deve possuir:

- objetivo;
- impacto;
- risco;
- estratégia de rollback;
- necessidade de backfill.

---

# 8. DATAS NÃO DEVEM SER TEXTO

Eliminar progressivamente colunas do tipo:

```text
DD/MM/YYYY
```

armazenadas como `text`.

Exemplos existentes que devem ser migrados:

```text
ocs.data_solic
ocs.previsao_forn
ocs.previsao_forn2
ocs.data_entrega_real
ocs.ultima_movimentacao

sols.data

pareceres.data_parecer
```

Tipos desejados:

```sql
date
```

quando horário não importa.

Usar:

```sql
timestamptz
```

quando horário/auditoria importa.

---

# 9. ESTRATÉGIA DE MIGRAÇÃO DE DATAS

Nunca alterar coluna diretamente sem validação.

Fluxo:

```text
1. criar coluna nova
2. converter dados
3. validar 100%
4. atualizar aplicação
5. manter compatibilidade temporária
6. remover coluna antiga
```

Exemplo:

```sql
ALTER TABLE ocs
ADD COLUMN data_solic_date date;
```

Depois:

```sql
UPDATE ocs
SET data_solic_date = to_date(data_solic, 'DD/MM/YYYY')
WHERE data_solic IS NOT NULL;
```

Antes de remover a coluna antiga:

```sql
SELECT COUNT(*)
FROM ocs
WHERE data_solic IS NOT NULL
AND data_solic_date IS NULL;
```

Resultado obrigatório:

```text
0
```

---

# 10. TIMESTAMPS DEVEM USAR TIPOS NATIVOS

Evitar:

```text
bigint Unix milliseconds
```

para eventos.

Migrar gradualmente:

```text
hist_oc.ts bigint
```

para:

```sql
created_at timestamptz NOT NULL DEFAULT now()
```

Motivo:

PostgreSQL deve executar:

- ordenação;
- agregação;
- intervalo;
- filtros temporais;
- índices;

usando tipos nativos.

---

# 11. REGRAS DE DOMÍNIO NÃO DEVEM DEPENDER DO FORMATO DE EXIBIÇÃO

Formato:

```text
26/08/2026
```

é apresentação.

O domínio deve trabalhar com:

```text
2026-08-26
```

ou objetos/tipos adequados.

Somente a camada de UI formata:

```text
2026-08-26
↓
26/08/2026
```

---

# 12. PDF NÃO DEVE SER ARMAZENADO EM BASE64 NO POSTGRES

Remover progressivamente:

```text
pareceres.pdf_data_url
```

como estratégia principal.

Utilizar:

```text
Supabase Storage
```

Estrutura sugerida:

```text
pareceres/
  <codigo-produto>/
    <uuid>.pdf
```

No banco armazenar:

```text
pdf_path
pdf_nome
pdf_mime_type
pdf_size
pdf_hash
```

---

# 13. HASH DE ARQUIVO

Arquivos importantes devem possuir checksum.

Preferência:

```text
SHA-256
```

Objetivos:

- detectar duplicidade;
- detectar corrupção;
- permitir auditoria.

---

# 14. SEPARAÇÃO DE CAMADAS

Não tratar React Hook como camada de infraestrutura.

Estrutura alvo:

```text
src/
├── domain/
├── services/
├── repositories/
├── hooks/
├── components/
├── pages/
├── utils/
└── lib/
```

---

# 15. REPOSITORIES

Acesso ao Supabase deve ficar em repositories.

Exemplo:

```typescript
// repositories/ocRepository.ts

export async function listarOCs(hospitalId: HospitalId) {
  const { data, error } = await supabase
    .from('ocs')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)

  if (error) throw error

  return data
}
```

---

# 16. SERVICES

Regra de negócio deve ficar fora de React.

Exemplo:

```typescript
// services/ocService.ts

export function calcularPrioridadeOC(oc: OC): PrioridadeOC {
  // regra de negócio
}
```

Essas funções devem ser:

- puras quando possível;
- independentes de React;
- facilmente testáveis.

---

# 17. HOOKS DEVEM SER ADAPTADORES REACT

Exemplo:

```typescript
export function useOCs(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['ocs', hospitalId],
    queryFn: () => ocRepository.listarOCs(hospitalId),
  })
}
```

O hook NÃO deve ser responsável simultaneamente por:

- SQL;
- transformação complexa;
- regra de negócio;
- UI;
- side effects não relacionados.

---

# 18. TESTES AUTOMATIZADOS PASSAM A SER OBRIGATÓRIOS

Adicionar:

```text
Vitest
React Testing Library
Playwright
```

Não é necessário testar tudo.

Testar primeiro onde um bug causaria:

- corrupção de dados;
- decisão errada;
- perda de informação;
- atraso operacional;
- quebra de fluxo crítico.

---

# 19. PRIORIDADE DOS TESTES

## Prioridade P0

### Importação CSV

Testar:

- vírgula decimal entre aspas;
- descrição contendo vírgula;
- encoding;
- dois layouts diferentes do SoulMV;
- fornecedor;
- previsão;
- dias de atraso;
- situação;
- duplicidade;
- situação nunca regredir.

---

# 20. FIXTURES REAIS ANONIMIZADAS

Criar:

```text
tests/
└── fixtures/
    ├── oc-layout-a.csv
    ├── oc-layout-b.csv
    ├── solicitacoes.csv
    └── acompanhamento.pdf
```

Remover:

- nomes pessoais;
- CNPJ;
- dados sensíveis;

mas preservar a estrutura real do SoulMV.

---

# 21. TESTE DE REGRESSÃO PARA BUGS JÁ ENCONTRADOS

Todo bug real deve virar teste.

Exemplos:

```text
Bug:
"748,80" quebrava parser CSV

Resultado:
teste permanente obrigatório.
```

Outro:

```text
Bug:
layouts diferentes deslocavam dias_atraso

Resultado:
teste permanente obrigatório.
```

Regra:

```text
Bug corrigido sem teste = correção incompleta.
```

---

# 22. TESTAR REGRAS DE PRAZO

Criar testes para:

```text
statusPrazo()
riscoOC()
diasSemMovimentacao()
previsaoAtiva()
SIT_RANK
```

Cobrir:

- vencida;
- urgente;
- atendida;
- previsão descumprida;
- entrega parcial;
- mudança de mês;
- mudança de ano;
- ano bissexto.

---

# 23. CLOCK INJETÁVEL PARA TESTES

Evitar lógica dependente do relógio real.

Criar conceito:

```typescript
export interface Clock {
  now(): Date
}
```

Produção:

```typescript
SystemClock
```

Testes:

```typescript
FixedClock
```

Assim:

```text
"hoje"
```

pode ser determinístico nos testes.

---

# 24. TESTES DE INTEGRAÇÃO

Validar:

```text
repository
↓
Supabase de teste
↓
RLS
↓
dados
```

Casos mínimos:

- usuário autenticado lê;
- usuário anônimo não lê;
- hospital HUV não mistura OC HMK;
- soft delete desaparece das consultas;
- FK funciona;
- constraints funcionam.

---

# 25. TESTES E2E

Playwright deve cobrir poucos fluxos, porém críticos.

Fluxos mínimos:

### Login

```text
login
→ dashboard
```

### Importação

```text
login
→ importar CSV
→ preview
→ confirmar
→ OCs aparecem
```

### OC

```text
abrir OC
→ registrar cobrança
→ histórico atualizado
```

### Contrato

```text
criar
→ editar
→ filtrar
→ soft delete
```

---

# 26. NUNCA TESTAR PRIMEIRO EM PRODUÇÃO

Fluxo desejado:

```text
local
↓
tests
↓
preview
↓
staging
↓
produção
```

Produção não é ambiente de testes.

---

# 27. CRIAR AMBIENTE DE STAGING

Desejado:

```text
portal-fusve.vercel.app
→ produção

portal-fusve-staging.vercel.app
→ staging
```

Banco:

```text
Supabase Production
Supabase Staging
```

Nunca importar arquivos de teste no banco real para verificar parser.

---

# 28. CI NO GITHUB

Criar:

```text
.github/workflows/ci.yml
```

Pipeline mínimo:

```text
npm ci
npm run lint
npx tsc -b --noEmit
npm test
npm run build
```

PR não pode ser mergeado com CI vermelho.

---

# 29. PROTEGER MAIN

Configurar GitHub:

```text
main
```

com:

- Pull Request obrigatório;
- CI obrigatório;
- impedir push direto quando possível.

---

# 30. DEPLOY

Fluxo:

```text
feature branch
↓
Pull Request
↓
CI
↓
Vercel Preview
↓
Review
↓
merge main
↓
Production
```

---

# 31. OBSERVABILIDADE

Adicionar monitoramento de erros.

Preferência:

```text
Sentry
```

Registrar:

- exceptions frontend;
- falhas Supabase;
- falhas importação;
- erro inesperado em parser.

Nunca incluir:

- dados médicos;
- documentos;
- tokens;
- credenciais;
- informações sensíveis.

---

# 32. LOGS ESTRUTURADOS

Evitar:

```typescript
console.log('deu erro')
```

Preferir estrutura:

```typescript
logger.error('csv_import_failed', {
  fileType: 'oc',
  line: 152,
  reason: error.message,
})
```

---

# 33. IMPORTAÇÃO DEVE SER TRANSACIONAL OU QUASE TRANSACIONAL

Evitar centenas de updates independentes sem controle.

Quando possível:

```text
parse
↓
validate
↓
preview
↓
confirm
↓
batch write
```

Se parte da importação falhar:

o usuário deve saber:

```text
quantos processados
quantos falharam
quais falharam
por quê
```

---

# 34. VALIDAÇÃO ANTES DE PERSISTIR

Criar validators para entidades críticas.

Pode utilizar:

```text
Zod
```

Exemplo:

```typescript
const ocSchema = z.object({
  id: z.number().int().positive(),
  fornecedorNome: z.string().min(1),
  hospitalId: z.enum(['huv', 'mkr']),
})
```

Nunca confiar diretamente em:

- CSV;
- PDF;
- input usuário;
- API externa.

---

# 35. CONSTRAINTS NO BANCO

O banco deve proteger invariantes.

Exemplos:

```sql
CHECK (hospital_id IN ('huv', 'mkr'))
```

```sql
CHECK (sit IN (...))
```

```sql
CHECK (qtd >= 0)
```

```sql
CHECK (preco_unitario >= 0)
```

Não depender exclusivamente do frontend.

---

# 36. FOREIGN KEYS

Sempre que houver identidade real entre entidades, preferir FK.

Não replicar texto quando existe identificador confiável.

---

# 37. PRODUTOS SOULMV

A base de produtos não deve depender permanentemente de:

```text
src/data/*.json
```

Planejar migração para:

```sql
produtos_soulmv
```

Campos mínimos:

```text
cod
descricao
categoria
ativo
updated_at
```

---

# 38. BUSCA DE PRODUTOS

Depois da migração para Postgres:

avaliar:

```text
pg_trgm
GIN index
```

para busca aproximada.

Não implementar antes da tabela existir.

---

# 39. SOFT DELETE

Manter soft delete.

Porém, documentar:

- quem deletou;
- quando;
- motivo quando relevante.

Para entidades críticas considerar:

```text
deleted_by
deleted_at
```

---

# 40. AUDITORIA

Para operações críticas considerar tabela:

```text
audit_log
```

Campos:

```text
id
table_name
record_id
action
old_data
new_data
user_id
created_at
```

Não implementar indiscriminadamente.

Priorizar:

- contratos;
- pareceres;
- alterações manuais em OCs.

---

# 41. RLS É OBRIGATÓRIO

Nenhuma tabela operacional pode ficar aberta com:

```sql
USING (true)
```

para `anon`.

Sempre revisar:

```sql
SELECT *
FROM pg_policies;
```

após mudanças.

---

# 42. SQL ANTIGO NÃO PODE PERMANECER COMO INSTRUÇÃO ATIVA

Se uma migration/policy deixou de ser válida:

não deixar código antigo no `CLAUDE.md` como se ainda fosse executável.

Mover para:

```text
docs/history/
```

ou remover.

Documentação errada é pior que documentação ausente.

---

# 43. TYPESCRIPT DEVE SER DERIVADO DO SCHEMA

Objetivo:

```text
Postgres
↓
Supabase type generation
↓
database.ts
↓
repositories
↓
application
```

Evitar editar manualmente:

```text
src/types/database.ts
```

Quando a CLI estiver disponível, regenerar automaticamente.

---

# 44. DATABASE TYPES NO CI

Ideal futuro:

gerar tipos e comparar diff.

Se houver mudança inesperada:

CI deve alertar.

---

# 45. ERROS DEVEM SER EXPLÍCITOS

Nunca deixar:

```text
loading infinito
```

Todo request tem:

```text
loading
success
empty
error
```

---

# 46. RETRY

Não adotar regra global rígida sem considerar operação.

Para leitura:

retry pode ser útil.

Para mutation:

retry automático pode duplicar ação.

Decidir por tipo de operação.

---

# 47. IDEMPOTÊNCIA

Imports e mutations importantes devem ser idempotentes quando possível.

Exemplo:

```text
reimportar OC
```

não deve duplicar:

```text
OC
histórico
cobrança
vínculo
```

---

# 48. SEGURANÇA DE EDGE FUNCTIONS

Edge Function administrativa deve validar:

- usuário autenticado;
- autorização;
- payload;
- rate limit quando necessário.

Nunca confiar apenas no fato de o endpoint não estar exposto na UI.

---

# 49. SERVICE ROLE

Nunca:

```text
service_role
```

no frontend.

Apenas:

```text
server
Edge Function
migration
script administrativo
```

---

# 50. INTEGRAÇÕES EXTERNAS

Toda integração deve possuir:

- timeout;
- tratamento de erro;
- fallback;
- mensagem para usuário.

Exemplo:

```text
BrasilAPI
```

não pode bloquear cadastro se estiver indisponível.

---

# 51. PERFORMANCE

Não otimizar prematuramente.

Medir primeiro.

Indicadores relevantes:

- tempo carregamento dashboard;
- quantidade queries;
- payload;
- tempo importação;
- tempo busca produto.

---

# 52. TANSTACK QUERY

Utilizar query keys consistentes.

Exemplo:

```typescript
['ocs', hospitalId]
['ocs', hospitalId, filters]
['fornecedor', fornecedorId]
```

Centralizar factory se necessário.

---

# 53. PAGINAÇÃO

Listas potencialmente grandes não devem depender eternamente de carregar tudo.

Planejar paginação server-side para:

- OCs;
- produtos SoulMV;
- histórico;
- contratos;

quando volume justificar.

---

# 54. ACESSIBILIDADE

Frontend profissional precisa:

- navegação teclado;
- focus visível;
- labels;
- aria quando necessário;
- contraste adequado;
- não depender somente de cor.

---

# 55. UX OPERACIONAL

Prioridade:

```text
velocidade de operação > animação > estética
```

Não adicionar animação que atrase comprador.

Não esconder informação crítica atrás de múltiplos cliques.

---

# 56. DESIGN SYSTEM

Evitar classes Tailwind diferentes para o mesmo conceito.

Manter componentes para:

```text
Button
Badge
Modal
Table
KpiCard
EmptyState
Skeleton
Input
Select
```

Antes de criar novo estilo verificar se componente existente resolve.

---

# 57. DOCUMENTAÇÃO

Separar:

```text
CLAUDE.md
```

contexto funcional.

```text
CLAUDE_ENGINEERING.md
```

regras técnicas.

```text
docs/architecture.md
```

arquitetura.

```text
docs/database.md
```

schema.

```text
docs/operations.md
```

deploy/rollback/incidentes.

Não transformar `CLAUDE.md` em banco histórico infinito.

---

# 58. ADR — ARCHITECTURE DECISION RECORDS

Decisões importantes devem virar ADR.

Exemplo:

```text
docs/adr/
001-supabase.md
002-storage-pdfs.md
003-date-migration.md
004-repository-layer.md
```

Formato:

```text
Contexto
Decisão
Alternativas
Consequências
```

---

# 59. CRITÉRIO PARA NOVA ABSTRAÇÃO

Não criar abstração apenas porque "parece mais profissional".

Criar quando:

- existe duplicação real;
- existe regra de domínio;
- melhora testabilidade;
- reduz acoplamento;
- isola dependência externa.

---

# 60. CRITÉRIO PARA NOVA DEPENDÊNCIA

Antes de instalar pacote:

informar:

```text
problema
alternativas
dependência escolhida
tamanho
manutenção
risco
```

Evitar dependência para problema trivial.

---

# 61. REGRA DE CORREÇÃO DE BUG

Quando encontrar bug:

1. reproduzir;
2. identificar causa raiz;
3. escrever teste que falha;
4. corrigir;
5. validar teste;
6. executar suíte;
7. documentar apenas se relevante arquiteturalmente.

---

# 62. REGRA DE ALTERAÇÃO DE SCHEMA

Antes de alterar:

Claude deve apresentar:

```text
Mudança:
Impacto:
Migration:
Backfill:
Compatibilidade:
Rollback:
Testes:
```

Só depois implementar.

---

# 63. REGRA DE ALTERAÇÃO DE ARQUITETURA

Antes de mover responsabilidade entre camadas:

explicar:

```text
estado atual
problema atual
arquitetura proposta
trade-offs
impacto
```

Não refatorar massivamente sem motivo.

---

# 64. PROIBIDO BIG BANG REFACTOR

Preferir:

```text
Strangler Pattern
```

Migrar gradualmente.

Exemplo:

```text
hook antigo
↓
repository novo
↓
migrar 1 entidade
↓
testar
↓
continuar
```

---

# 65. BANCO DE PRODUÇÃO

Nenhuma alteração destrutiva sem:

```text
backup
migration
validação
rollback
```

---

# 66. DADOS REAIS

Nunca inventar valor para corrigir dado ausente.

Se fonte confiável não existir:

```text
NULL
```

é melhor que dado falso.

---

# 67. CORREÇÕES MANUAIS

Se for necessário executar:

```sql
UPDATE ...
```

direto em produção:

registrar:

```text
motivo
query
registros afetados
fonte do dado correto
data
responsável
```

---

# 68. DEFINITION OF DONE

Nenhuma tarefa está concluída apenas porque:

```text
funcionou no navegador
```

Definition of Done:

- typecheck passa;
- lint passa;
- testes passam;
- build passa;
- erro tratado;
- migration versionada se aplicável;
- RLS revisado se aplicável;
- preview testado;
- documentação atualizada quando necessário;
- nenhuma regressão conhecida.

---

# 69. HARDENING V1.0 — CRITÉRIO DE CONCLUSÃO

A fase termina quando:

- migrations estão versionadas;
- datas críticas usam tipos nativos;
- PDFs novos vão para Storage;
- parser CSV possui suíte de testes;
- regras de prazo possuem testes;
- CI está ativo;
- staging existe;
- main está protegida;
- error tracking está ativo;
- nenhuma policy anônima indevida existe;
- CLAUDE.md não contém SQL obsoleto;
- nenhum bug conhecido de corrupção de dados está aberto.

---

# 70. RESULTADO ESPERADO

Ao final desta fase, o Portal FUSVE deve passar de:

```text
sistema funcional desenvolvido rapidamente
```

para:

```text
sistema interno de produção
com engenharia previsível,
testável,
auditável
e evolutiva.
```

---

# INSTRUÇÃO FINAL PARA O CLAUDE

Não implemente todas essas alterações de uma vez.

Primeiro:

1. leia todo o `CLAUDE.md`;
2. leia este documento;
3. inspecione o repositório;
4. confronte documentação com código e schema real;
5. liste divergências;
6. classifique por risco;
7. proponha roadmap incremental;
8. aguarde aprovação antes de mudanças destrutivas.

A resposta inicial deve conter obrigatoriamente:

## A. Diagnóstico atual

- arquitetura;
- banco;
- testes;
- segurança;
- deploy;
- observabilidade;
- dívida técnica.

## B. Top 10 riscos

Ordenados por:

```text
probabilidade × impacto
```

## C. Plano de Hardening

Dividido em:

```text
P0 — Integridade / Segurança
P1 — Confiabilidade
P2 — Arquitetura
P3 — Operabilidade
```

## D. Primeira alteração recomendada

Explicar:

```text
por quê
impacto
risco
arquivos afetados
migration necessária
testes necessários
rollback
```

Não alterar código antes dessa análise.