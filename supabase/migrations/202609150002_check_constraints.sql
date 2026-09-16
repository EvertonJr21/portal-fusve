-- Aplicada em produção em 16/09/2026 — Everton rodou no SQL Editor, Success
-- em todas as ALTER TABLE. Não rodar de novo.
--
-- Objetivo: o banco hoje não protege nenhum invariante de domínio — só a UI
-- impede hospital_id inválido, status fora da lista, quantidade negativa.
-- Um UPDATE manual no SQL Editor (já aconteceu, ver correção de dias_atraso
-- no histórico de importação do CLAUDE.md) pode inserir valor fora do
-- esperado sem nenhum aviso.
--
-- Impacto: nenhuma linha existente é rejeitada agora (constraints criadas
-- com NOT VALID — Postgres não valida dado já gravado, só passa a checar
-- escritas novas a partir daqui). Depois de confirmar que os dados atuais
-- já são válidos (queries de verificação no fim do arquivo), rodar
-- `VALIDATE CONSTRAINT` pra também cobrir o histórico.
--
-- Risco: baixo. Decisão deliberada de NÃO incluir `ocs.sit`/`sols.sit` aqui
-- — `normalizeSit()` (src/utils/csv.ts) tem um fallback intencional que
-- aceita situação não reconhecida como texto cru em vez de falhar (pra não
-- travar a importação inteira por um valor inesperado do SoulMV). Uma CHECK
-- estrita nessas colunas transformaria esse fallback silencioso em erro de
-- importação. Se quiser fechar isso depois, é uma decisão de produto
-- separada (o que fazer quando o SoulMV manda uma situação desconhecida),
-- não só uma migration.
--
-- Rollback:
-- ALTER TABLE ocs              DROP CONSTRAINT IF EXISTS ocs_hospital_id_check;
-- ALTER TABLE sols             DROP CONSTRAINT IF EXISTS sols_hospital_id_check;
-- ALTER TABLE sols             DROP CONSTRAINT IF EXISTS sols_qtd_check;
-- ALTER TABLE contratos        DROP CONSTRAINT IF EXISTS contratos_hospital_id_check;
-- ALTER TABLE contratos        DROP CONSTRAINT IF EXISTS contratos_status_check;
-- ALTER TABLE contratos        DROP CONSTRAINT IF EXISTS contratos_tipo_check;
-- ALTER TABLE contrato_produtos DROP CONSTRAINT IF EXISTS contrato_produtos_preco_check;
-- ALTER TABLE opmes            DROP CONSTRAINT IF EXISTS opmes_hospital_id_check;
-- ALTER TABLE opmes            DROP CONSTRAINT IF EXISTS opmes_status_check;
--
-- Backfill necessário: não.

ALTER TABLE ocs
  ADD CONSTRAINT ocs_hospital_id_check
  CHECK (hospital_id IN ('huv', 'mkr')) NOT VALID;

ALTER TABLE sols
  ADD CONSTRAINT sols_hospital_id_check
  CHECK (hospital_id IN ('huv', 'mkr')) NOT VALID;

ALTER TABLE sols
  ADD CONSTRAINT sols_qtd_check
  CHECK (qtd >= 0) NOT VALID;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_hospital_id_check
  CHECK (hospital_id IN ('huv', 'mkr', 'ambos')) NOT VALID;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_status_check
  CHECK (status IN ('Ativo', 'Inativo', 'Em Negociação', 'Suspenso')) NOT VALID;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_tipo_check
  CHECK (tipo IN ('Contrato', 'Acordo Comercial')) NOT VALID;

ALTER TABLE contrato_produtos
  ADD CONSTRAINT contrato_produtos_preco_check
  CHECK (preco_unitario >= 0) NOT VALID;

ALTER TABLE opmes
  ADD CONSTRAINT opmes_hospital_id_check
  CHECK (hospital_id IN ('huv', 'mkr')) NOT VALID;

ALTER TABLE opmes
  ADD CONSTRAINT opmes_status_check
  CHECK (status IN ('pendente', 'entregue')) NOT VALID;

-- ── Verificação (rodar manualmente antes de validar as constraints) ──────
-- Cada uma deve retornar 0 linhas antes de rodar VALIDATE CONSTRAINT:
--
-- SELECT id, hospital_id FROM ocs        WHERE hospital_id NOT IN ('huv','mkr');
-- SELECT id, hospital_id FROM sols       WHERE hospital_id NOT IN ('huv','mkr');
-- SELECT id, qtd         FROM sols       WHERE qtd < 0;
-- SELECT id, hospital_id FROM contratos  WHERE hospital_id NOT IN ('huv','mkr','ambos');
-- SELECT id, status      FROM contratos  WHERE status NOT IN ('Ativo','Inativo','Em Negociação','Suspenso');
-- SELECT id, tipo        FROM contratos  WHERE tipo NOT IN ('Contrato','Acordo Comercial');
-- SELECT id, preco_unitario FROM contrato_produtos WHERE preco_unitario < 0;
--
-- Depois, pra também cobrir o histórico:
-- ALTER TABLE ocs        VALIDATE CONSTRAINT ocs_hospital_id_check;
-- ALTER TABLE sols       VALIDATE CONSTRAINT sols_hospital_id_check;
-- ALTER TABLE sols       VALIDATE CONSTRAINT sols_qtd_check;
-- ALTER TABLE contratos  VALIDATE CONSTRAINT contratos_hospital_id_check;
-- ALTER TABLE contratos  VALIDATE CONSTRAINT contratos_status_check;
-- ALTER TABLE contratos  VALIDATE CONSTRAINT contratos_tipo_check;
-- ALTER TABLE contrato_produtos VALIDATE CONSTRAINT contrato_produtos_preco_check;
