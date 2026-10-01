-- Objetivo: popular a tabela `areas` (módulo Catálogo de Materiais, item 49
-- do backlog) com uma lista de referência de setores do HMK (Hospital Mário
-- Kroeff), pedido do Everton como continuação do item 52 (que fez a mesma
-- pesquisa pro HUV).
--
-- **Achado importante de pesquisa, muda o formato da lista**: diferente do
-- HUV (hospital universitário geral — pronto-socorro, maternidade,
-- pediatria, clínica médica), o HMK é um hospital **oncológico puro**:
-- fundado em 1944 pelo Dr. Mário Kröeff (também fundador do INCA), fica na
-- Penha (Zona Norte do Rio de Janeiro), é administrado pela FUSVE e é hoje
-- o **maior provedor privado de serviços oncológicos pelo SUS do estado do
-- RJ** (~70 mil procedimentos/ano — cirurgias, radioterapias, consultas,
-- exames). Não é um hospital geral com pronto-socorro de trauma/pediatria
-- como o HUV — a lista de setores reflete isso, bem mais enxuta e
-- especializada em oncologia.
--
-- **Setores confirmados diretamente pela pesquisa** (WebSearch contra
-- fontes como FEMERJ, Diário do Rio, site da própria instituição): o HMK
-- oferece oncologia clínica (quimioterapia), radioterapia (3 aceleradores
-- lineares, um com IMRT) e braquiterapia, mastologia, ginecologia
-- oncológica, cirurgia de cabeça e pescoço, urologia, cirurgia geral e
-- plástica (reconstrutiva oncológica), com suporte multidisciplinar de
-- Psicologia/Nutrição/Fisioterapia/Fonoaudiologia/Serviço Social, exames
-- laboratoriais de diagnóstico e um Centro de Radioterapia e Imagem (com
-- tomografia) inaugurado em 2021. Há também um investimento anunciado
-- (parceria com Maricá/CNEN, ~R$400 milhões) para um futuro Centro de
-- Protonterapia — incluído como "em implantação", não necessariamente já
-- em operação.
--
-- **Setores não confirmados explicitamente pela pesquisa, mas estruturalmente
-- necessários** pra um hospital que opera cirurgia oncológica + quimioterapia
-- + radioterapia nesse volume (Centro Cirúrgico, RPA, Internação, UTI,
-- Farmácia Oncológica, CME, Banco de Sangue, Anatomia Patológica, CCIH,
-- Almoxarifado, Rouparia) — mesmo princípio e mesmo aviso do item 52/53:
-- conhecimento geral de como hospitais desse porte/especialidade costumam
-- se organizar, **não confirmado por ninguém do HMK**. O Everton revisa e
-- exclui pela tela `/catalogo/gestao` (soft delete via `excluirArea`) o que
-- não existir de fato, em vez de eu decidir por ele.
--
-- Impacto: aditivo, apenas INSERT, escopado só `hospital_id = 'hmk'`.
-- Idempotente via NOT EXISTS (seguro rodar de novo sem duplicar).
-- Rollback: DELETE FROM areas WHERE hospital_id = 'hmk' AND created_at >= 'AGORA' (ajustar).

insert into areas (hospital_id, nome, ordem)
select 'hmk', v.nome, v.ordem
from (values
  -- 1. Bloco Cirúrgico (estruturalmente necessário, não confirmado nomeado)
  ('Centro Cirúrgico Oncológico', 10),
  ('Sala de Recuperação Pós-Anestésica (RPA)', 11),
  -- 2. Internação e Críticos (estruturalmente necessário)
  ('Internação Oncológica Clínica', 20),
  ('Internação Oncológica Cirúrgica', 21),
  ('UTI Oncológica', 22),
  -- 3. Oncologia Clínica e Radioterapia (confirmado pela pesquisa)
  ('Quimioterapia / Oncologia Clínica', 30),
  ('Centro de Radioterapia', 31),
  ('Braquiterapia', 32),
  ('Centro de Protonterapia (em implantação)', 33),
  ('Ambulatório de Oncologia', 34),
  ('Pronto Atendimento Oncológico', 35),
  -- 4. Especialidades Cirúrgicas Oncológicas (confirmado pela pesquisa)
  ('Mastologia', 40),
  ('Ginecologia Oncológica', 41),
  ('Cirurgia de Cabeça e Pescoço', 42),
  ('Urologia Oncológica', 43),
  ('Cirurgia Geral Oncológica', 44),
  ('Cirurgia Plástica Reparadora', 45),
  -- 5. Apoio Diagnóstico (Imagem confirmado; demais estruturalmente necessário)
  ('Centro de Imagem (Tomografia/Raio-X)', 50),
  ('Laboratório de Análises Clínicas', 51),
  ('Anatomia Patológica', 52),
  ('Agência Transfusional / Banco de Sangue', 53),
  -- 6. Apoio Multidisciplinar (confirmado pela pesquisa)
  ('Psicologia', 60),
  ('Serviço Social', 61),
  ('Nutrição', 62),
  ('Fisioterapia', 63),
  ('Fonoaudiologia', 64),
  -- 7. Suprimentos e Apoio Técnico (estruturalmente necessário)
  ('Farmácia Oncológica', 70),
  ('Central de Material e Esterilização (CME)', 71),
  ('Almoxarifado Central', 72),
  ('Rouparia / Lavanderia', 73),
  ('Comissão de Controle de Infecção Hospitalar (CCIH)', 74)
) as v(nome, ordem)
where not exists (
  select 1 from areas a where a.hospital_id = 'hmk' and a.nome = v.nome and a.deleted_at is null
);
