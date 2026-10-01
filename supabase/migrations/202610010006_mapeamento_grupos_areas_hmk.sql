-- Objetivo: popular `item_areas` em massa pra HMK, mesmo princípio do item 53
-- (feito pro HUV em 202609300003_mapeamento_grupos_areas_huv.sql) — pedido
-- do Everton: "Você vai precisar fazer a mesma pesquisa do HUV para
-- preencher o HMK."
--
-- **Diferença importante em relação ao mapeamento do HUV**: o HUV é hospital
-- geral (todas as 59 áreas fazem sentido pra quase todo grupo de material).
-- O HMK é hospital **oncológico puro** (ver 202610010005_seed_areas_hmk.sql)
-- — não existe Setor de Hemodinâmica, Nefrologia/Hemodiálise, Neurologia,
-- Ortopedia, Eletrofisiologia ou Oftalmologia no HMK. Por isso os grupos que
-- só fazem sentido nessas especialidades (`OPME — CARDIACA`,
-- `OPME — ELETROFISIOLOGIA`, `OPME — HEMODINAMICA`, `OPME — NEFROLOGIA`,
-- `OPME — NEUROLOGIA`, `OPME — ORTOPEDICA`, `OFTALMOLOGIA — OFTALMOLOGIA`)
-- ficam **deliberadamente sem área no HMK** — diferente do HUV, onde esses
-- mesmos grupos foram mapeados normalmente. Forçar um vínculo nessas áreas
-- inexistentes no HMK seria pior que não vincular.
--
-- **AVISO IMPORTANTE, leia antes de confiar neste dado** (mesmo texto do
-- item 53): o mapeamento grupo→área abaixo é conhecimento geral de uso
-- típico desses materiais em hospitais (ex: fio de sutura → Centro
-- Cirúrgico, agulha → Quimioterapia/Internação), **não é validado contra o
-- protocolo real do HMK** por nenhum médico/enfermeiro — mesma limitação já
-- registrada nos itens 52/53/56/58/59/61. Por instrução do item 57, esse
-- aviso não aparece na UI do app, só aqui no CLAUDE.md/migration pra
-- referência de quem mantém o projeto.
--
-- Pra categorias muito genéricas/transversais (agulhas, seringas, luvas,
-- curativos, álcool) o mapeamento cobre só um subconjunto representativo
-- das áreas mais prováveis do HMK, não todas as 31 — mesmo critério do
-- item 53. Maior confiança: `OPME — ONCOLOGICA` (mapeada pras 5 especialidades
-- cirúrgicas oncológicas do HMK) e os grupos de Esterilização/Instrumentos/
-- Diagnóstico por Imagem/Laboratório, que têm correspondência direta e
-- óbvia com uma área específica.
--
-- `MATERIAL MEDICO — DISPOSITIVOS` também fica deliberadamente sem área
-- (mesmo motivo do item 53: nome genérico demais).
--
-- Dado deliberadamente **sem `principal = true`** em nenhuma linha — mesmo
-- critério do item 53, o Everton marca manualmente pela tela
-- `/catalogo/gestao` se quiser.
--
-- Pré-requisito: `202610010005_seed_areas_hmk.sql` já aplicada em produção
-- (confirmado) e a carga inicial do item 51 (itens/grupos/item_grupos,
-- compartilhada entre HUV e HMK) já aplicada.
-- Impacto: aditivo, só grava em `item_areas` (nunca toca `itens`/`grupos`).
-- Idempotente — `ON CONFLICT (item_id, area_id) DO NOTHING` (chave primária
-- da tabela), seguro rodar de novo.
-- Rollback: DELETE FROM item_areas WHERE area_id IN (SELECT id FROM areas
-- WHERE hospital_id = 'mkr') — escopado só às áreas do HMK, não afeta o
-- mapeamento do HUV.

insert into item_areas (item_id, area_id, principal)
select distinct ig.item_id, a.id, false
from item_grupos ig
join grupos g on g.id = ig.grupo_id
join (values
  -- Esterilização / CME
  ('ESTERILIZACAO — ESTERILIZACAO',                 'Central de Material e Esterilização (CME)'),

  -- Instrumentos cirúrgicos gerais (904 itens — o maior grupo)
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS',           'Centro Cirúrgico Oncológico'),

  -- Diagnóstico por imagem / laboratório / anatomia patológica
  ('MATERIAL DE DIAGNOSTICOS — FILMES RADIOLOGICOS','Centro de Imagem (Tomografia/Raio-X)'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES',          'Centro de Imagem (Tomografia/Raio-X)'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES',          'Anatomia Patológica'),
  ('MATERIAL DE DIAGNOSTICOS — GEL',                'Centro de Imagem (Tomografia/Raio-X)'),
  ('MATERIAL DE DIAGNOSTICOS — PAPEIS PARA EXAMES', 'Centro de Imagem (Tomografia/Raio-X)'),
  ('MATERIAL DE DIAGNOSTICOS — PAPEIS PARA EXAMES', 'Laboratório de Análises Clínicas'),
  ('MATERIAL DE DIAGNOSTICOS — REVELADORES',        'Centro de Imagem (Tomografia/Raio-X)'),

  -- Curativos/assepsia/EPI — transversal, subconjunto representativo
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Internação Oncológica Cirúrgica'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — AGULHAS',                     'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — AGULHAS',                     'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — AGULHAS',                     'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — AGULHAS',                     'Ambulatório de Oncologia'),
  ('MATERIAL MEDICO — ALCOOL',                      'Almoxarifado Central'),
  ('MATERIAL MEDICO — APARELHO DE TRICOTOMIA',      'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ASSEPSIA',                    'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ASSEPSIA',                    'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS',      'Internação Oncológica Cirúrgica'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS',      'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — BISTURIS',                    'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — BOLSAS',                      'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — BOLSAS',                      'UTI Oncológica'),
  ('MATERIAL MEDICO — CANULAS',                     'UTI Oncológica'),
  ('MATERIAL MEDICO — CANULAS',                     'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — CATETERES',                   'UTI Oncológica'),
  ('MATERIAL MEDICO — CATETERES',                   'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — CATETERES',                   'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — COLETORES',                   'Laboratório de Análises Clínicas'),
  ('MATERIAL MEDICO — COLETORES',                   'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — COMPRESSAS',                  'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — COMPRESSAS',                  'Internação Oncológica Cirúrgica'),
  ('MATERIAL MEDICO — DRENOS',                      'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — DRENOS',                      'Internação Oncológica Cirúrgica'),
  ('MATERIAL MEDICO — ELETRODOS',                   'UTI Oncológica'),
  ('MATERIAL MEDICO — ELETRODOS',                   'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ENXERTO',                     'Cirurgia Plástica Reparadora'),
  ('MATERIAL MEDICO — ENXERTO',                     'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR',             'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR',             'UTI Oncológica'),
  ('MATERIAL MEDICO — ESCOVAS/ESPONJAS',            'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ESCOVAS/ESPONJAS',            'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — ESPACADOR',                   'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — ESPATULA',                    'Laboratório de Análises Clínicas'),
  ('MATERIAL MEDICO — ESPATULA',                    'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — EXTENSORES/PERFUSORES',       'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — EXTENSORES/PERFUSORES',       'UTI Oncológica'),
  ('MATERIAL MEDICO — FILTRO',                      'UTI Oncológica'),
  ('MATERIAL MEDICO — FILTRO',                      'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — FIOS',                        'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — FRASCOS',                     'Laboratório de Análises Clínicas'),
  ('MATERIAL MEDICO — FRASCOS',                     'Farmácia Oncológica'),
  ('MATERIAL MEDICO — GRAMPO',                      'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — INFUSOR DE BOMBA',            'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — INFUSOR DE BOMBA',            'UTI Oncológica'),
  ('MATERIAL MEDICO — IRRIGADOR/ASPIRADOR',         'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — KIT',                         'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — KITS CIRURGICOS/ CONJUNTOS',  'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'Laboratório de Análises Clínicas'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'Anatomia Patológica'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — LUVA',                        'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — LUVA',                        'UTI Oncológica'),
  ('MATERIAL MEDICO — LUVA',                        'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS',        'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS',        'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PRESERVATIVOS',               'Centro de Imagem (Tomografia/Raio-X)'),
  ('MATERIAL MEDICO — PROTETORES',                  'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — PROTETORES',                  'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PULSEIRAS',                   'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — PULSEIRAS',                   'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — RESERVATORIOS',               'UTI Oncológica'),
  ('MATERIAL MEDICO — RESERVATORIOS',               'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — SCALPS',                      'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — SCALPS',                      'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — SERINGAS',                    'Quimioterapia / Oncologia Clínica'),
  ('MATERIAL MEDICO — SERINGAS',                    'UTI Oncológica'),
  ('MATERIAL MEDICO — SERINGAS',                    'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — SONDAS',                      'Internação Oncológica Clínica'),
  ('MATERIAL MEDICO — SONDAS',                      'UTI Oncológica'),
  ('MATERIAL MEDICO — SONDAS',                      'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA',           'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA',           'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — TIRAS/FITAS',                 'Laboratório de Análises Clínicas'),
  ('MATERIAL MEDICO — TIRAS/FITAS',                 'UTI Oncológica'),
  ('MATERIAL MEDICO — TORNEIRAS/CONECTORES',        'UTI Oncológica'),
  ('MATERIAL MEDICO — TORNEIRAS/CONECTORES',        'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — TUBOS',                       'Centro Cirúrgico Oncológico'),
  ('MATERIAL MEDICO — TUBOS',                       'UTI Oncológica'),

  -- OPME — altamente específico por especialidade; só os 5 ramos cirúrgicos
  -- que o HMK realmente tem ganham vínculo (ver aviso no topo do arquivo)
  ('OPME — CIRURGIA PLASTICA REPARADORA',           'Cirurgia Plástica Reparadora'),
  ('OPME — CIRURGIA PLASTICA REPARADORA',           'Centro Cirúrgico Oncológico'),
  ('OPME — GINECOLOGIA',                            'Ginecologia Oncológica'),
  ('OPME — GINECOLOGIA',                            'Centro Cirúrgico Oncológico'),
  ('OPME — ONCOLOGICA',                             'Centro Cirúrgico Oncológico'),
  ('OPME — ONCOLOGICA',                             'Mastologia'),
  ('OPME — ONCOLOGICA',                             'Cirurgia Geral Oncológica'),
  ('OPME — ONCOLOGICA',                             'Cirurgia de Cabeça e Pescoço'),
  ('OPME — ONCOLOGICA',                             'Urologia Oncológica'),
  ('OPME — ONCOLOGICA',                             'Ginecologia Oncológica'),
  ('OPME — OPME',                                   'Centro Cirúrgico Oncológico'),
  ('OPME — OTORRINOLARINGOLOGIA',                   'Cirurgia de Cabeça e Pescoço'),
  ('OPME — UROLOGIA',                               'Urologia Oncológica'),
  ('OPME — UROLOGIA',                               'Centro Cirúrgico Oncológico')
) as mapa(grupo_nome, area_nome) on mapa.grupo_nome = g.nome
join areas a on a.hospital_id = 'mkr' and a.nome = mapa.area_nome and a.deleted_at is null
on conflict (item_id, area_id) do nothing;
