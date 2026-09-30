-- Objetivo: popular a tabela `areas` (módulo Catálogo de Materiais, item 49
-- do backlog) com uma lista de referência de setores do HUV, pesquisada a
-- pedido do Everton com base na RDC 50/ANVISA (unidades funcionais de
-- Estabelecimentos Assistenciais de Saúde) e em documentos de dimensionamento
-- de serviços de hospitais universitários (EBSERH/HUBrasil).
--
-- Não é mudança de schema (a tabela já existe desde 202609280002) — é dado
-- de referência inicial, escopado só pro HUV (`hospital_id = 'huv'`), já
-- que a pesquisa foi pedida especificamente pra ele. HMK fica de fora
-- deliberadamente: o Everton pode pedir a mesma pesquisa pro HMK depois e
-- os setores podem ser diferentes (unidades têm portes distintos).
--
-- Nem todo item abaixo necessariamente existe fisicamente no HUV — é uma
-- lista de referência ampla (pesquisa "extensa" pedida pelo Everton), pra
-- ele revisar e excluir o que não se aplica pela tela `/catalogo/gestao`
-- (soft delete já suportado por `excluirArea`), em vez de eu decidir por
-- ele quais setores HUV realmente tem.
--
-- Impacto: aditivo, apenas INSERT. Idempotente via NOT EXISTS (seguro rodar
-- de novo sem duplicar linha se o nome já existir pra esse hospital).
-- Rollback: DELETE FROM areas WHERE hospital_id = 'huv' AND created_at >= 'AGORA' (ajustar).

insert into areas (hospital_id, nome, ordem)
select 'huv', v.nome, v.ordem
from (values
  -- 1. Blocos Cirúrgicos e Intervenção
  ('Centro Cirúrgico Geral', 10),
  ('Centro Cirúrgico Ambulatorial', 11),
  ('Centro Obstétrico (Maternidade)', 12),
  ('Bloco de Partos', 13),
  ('Sala de Recuperação Pós-Anestésica (RPA)', 14),
  ('Setor de Hemodinâmica', 15),
  -- 2. UTI e Críticos
  ('UTI Adulto', 20),
  ('UTI Pediátrica', 21),
  ('UTI Neonatal', 22),
  ('Unidade de Cuidados Intermediários (UCI)', 23),
  ('Sala Vermelha (Emergência/Trauma)', 24),
  -- 3. Pronto Atendimento e Urgência
  ('Pronto Socorro Adulto', 30),
  ('Pronto Atendimento Pediátrico 24h', 31),
  ('Triagem / Acolhimento', 32),
  ('Sala Amarela (Observação Adulto)', 33),
  ('Sala Verde (Medicação e Hidratação)', 34),
  ('Sala de Estabilização/Choque', 35),
  ('Sala de Gesso/Imobilização Ortopédica', 36),
  -- 4. Internação (Enfermarias)
  ('Enfermaria de Clínica Médica', 40),
  ('Enfermaria de Clínica Cirúrgica', 41),
  ('Enfermaria de Pediatria', 42),
  ('Enfermaria de Ginecologia/Obstetrícia', 43),
  ('Enfermaria de Ortopedia/Traumatologia', 44),
  ('Enfermaria de Isolamento/Doenças Infecciosas', 45),
  ('Alojamento Conjunto (Materno-Infantil)', 46),
  ('Apartamentos / Quartos Privativos', 47),
  -- 5. Ambulatórios e Terapias Especializadas
  ('Ambulatório de Especialidades Médicas', 50),
  ('Ambulatório de Pré-Natal de Alto Risco', 51),
  ('Centro de Infusão / Oncologia Clínica', 52),
  ('Setor de Hemodiálise (Nefrologia)', 53),
  ('Centro de Reabilitação / Fisioterapia', 54),
  ('Terapia Ocupacional / Fonoaudiologia', 55),
  -- 6. Apoio Diagnóstico e Clínico
  ('Laboratório de Patologia Clínica (Análises)', 60),
  ('Anatomia Patológica', 61),
  ('Centro de Imagem (Raio-X, Tomografia, Ressonância)', 62),
  ('Eletrocardiografia / Métodos Gráficos', 63),
  ('Agência Transfusional / Banco de Sangue', 64),
  ('Endoscopia e Colonoscopia', 65),
  -- 7. Suprimentos, Logística e Apoio Técnico
  ('Almoxarifado Central', 70),
  ('Farmácia Central', 71),
  ('Farmácia Satélite - Centro Cirúrgico', 72),
  ('Farmácia Satélite - UTI', 73),
  ('Farmácia Satélite - Pronto Socorro', 74),
  ('Central de Material e Esterilização (CME)', 75),
  ('Serviço de Nutrição e Dietética (SND / Cozinha)', 76),
  ('Lactário', 77),
  ('SND - Refeitório', 78),
  ('Higienização e Limpeza Hospitalar', 79),
  ('Rouparia / Lavanderia', 80),
  ('Necrotério / Serviço Funerário', 81),
  ('Coleta de Resíduos / Expurgo', 82),
  -- 8. Gestão e Áreas Administrativas
  ('Faturamento Hospitalar', 90),
  ('Setor de Compras / Licitações', 91),
  ('Direção Clínica / Administrativa', 92),
  ('SAME (Serviço de Arquivo Médico e Estatística)', 93),
  ('Engenharia Clínica / Manutenção', 94),
  ('Comissão de Controle de Infecção Hospitalar (CCIH)', 95),
  ('Serviço Social', 96),
  ('Ouvidoria', 97)
) as v(nome, ordem)
where not exists (
  select 1 from areas a where a.hospital_id = 'huv' and a.nome = v.nome and a.deleted_at is null
);
