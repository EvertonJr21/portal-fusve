# Migrations — Portal FUSVE

Até 15/09/2026 todo o schema do Supabase de produção foi criado colando SQL
manualmente no SQL Editor, documentado em prosa no `CLAUDE.md`. Isso funcionou,
mas não dava pra saber com certeza "o que existe de fato em produção" sem
consultar `information_schema`/`pg_policies` direto — já aconteceu de policies
antigas ficarem esquecidas sem constar na documentação (ver histórico do item
12 do backlog em `CLAUDE.md`).

Esta pasta é a tentativa de ter uma fonte de verdade versionada do schema.

## O que os arquivos `0001`–`0005` são

**Reconstruções**, não um histórico exportado pela CLI do Supabase (que exige
`supabase login` interativo, indisponível neste ambiente — ver item 2 do
backlog). Cada um foi escrito a partir do que o `CLAUDE.md` documenta sobre
scripts que o Everton já rodou no SQL Editor, na ordem cronológica que os
backlogs indicam. Onde o `CLAUDE.md` só descreve o resultado final em vez do
SQL exato (ex: a policy de RLS autenticado, o cleanup de policies órfãs), o
arquivo é uma reconstrução equivalente ao estado final descrito, marcada como
tal no cabeçalho — não necessariamente byte-a-byte igual ao que rodou.

Não rode `0001`–`0005` de novo em produção — já foram aplicados. Eles existem
pra auditoria e pra servir de base caso o schema precise ser recriado do zero
(ex: ambiente de staging, se/quando existir).

## Daqui pra frente

Toda alteração de schema nova ganha um arquivo aqui **antes** de ser rodada no
SQL Editor, seguindo o formato `YYYYMMDDNNNN_descricao.sql` (data +
sequencial de 4 dígitos no mesmo dia). O arquivo deve conter, como comentário
no topo:

```sql
-- Objetivo:
-- Impacto:
-- Risco:
-- Rollback:
-- Backfill necessário: sim/não
```

Migrations idempotentes sempre que possível (`ADD COLUMN IF NOT EXISTS`,
`CREATE INDEX IF NOT EXISTS`). Quando não for possível, documentar
pré-condições no cabeçalho.

Depois de rodar no SQL Editor, atualizar a tabela de colunas correspondente no
`CLAUDE.md` (mantém as duas fontes em sincronia — o `CLAUDE.md` continua sendo
a referência funcional/de domínio, esta pasta é a referência técnica exata).
