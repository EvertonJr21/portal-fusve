-- Objetivo: popular `item_areas` em massa pra HUV, vinculando os ~5.382 itens
-- já carregados (item 51) às áreas já semeadas (item 52) — pesquisa por
-- AGRUPAMENTO de material, não item a item, pedida pelo Everton: "Você
-- consegue fazer pesquisas por agrupamento de produtos, para ver onde esses
-- materiais se encaixam nas áreas existentes. Eu não tenho esse conhecimento
-- técnico e também um enfermeiro/médico não vai parar para me ajudar nisso."
--
-- **AVISO IMPORTANTE, leia antes de confiar neste dado**: o mapeamento
-- grupo→área abaixo é conhecimento geral de uso típico desses materiais em
-- hospitais (ex: cateter cardíaco → Hemodinâmica, sonda vesical → pós-parto/
-- pós-cirúrgico), **não é validado contra o protocolo real do HUV** por
-- nenhum médico/enfermeiro — exatamente a limitação que o Everton descreveu.
-- Pra categorias muito genéricas/transversais (agulhas, seringas, luvas,
-- curativos, álcool, dispositivos/kits sem nome específico), o mapeamento
-- cobre só um subconjunto representativo das áreas mais prováveis, não
-- todas as 59 — forçar isso em toda área tornaria o catálogo inútil como
-- referência (tudo estaria "em todo lugar"). Pontos de maior confiança:
-- as 12 categorias de OPME (altamente específicas por natureza clínica,
-- ex: OPME — HEMODINAMICA só faz sentido no Setor de Hemodinâmica) e
-- instrumentos/kits cirúrgicos. Pontos de menor confiança: os ~9 grupos
-- "transversais" citados acima.
--
-- Dado deliberadamente **sem `principal = true`** em nenhuma linha — não há
-- base real pra eu decidir qual é "a" área típica de cada item específico
-- quando ele aparece em mais de uma; o Everton marca isso manualmente pela
-- tela `/catalogo/gestao` se quiser, item a item, no seu próprio ritmo.
--
-- Pré-requisito: `202609300002_seed_areas_huv.sql` e a carga inicial do
-- item 51 (itens/grupos/item_grupos) já aplicados em produção.
-- Impacto: aditivo, só grava em `item_areas` (nunca toca `itens`/`grupos`).
-- Idempotente — `ON CONFLICT (item_id, area_id) DO NOTHING` (chave primária
-- da tabela), seguro rodar de novo.
-- Rollback: TRUNCATE item_areas (ou DELETE WHERE EXISTS no mapeamento —
-- mais simples truncar, já que a tabela só existe pra isso e ainda não tem
-- dado manual do Everton na hora em que esta migration roda pela 1ª vez).

insert into item_areas (item_id, area_id, principal)
select distinct ig.item_id, a.id, false
from item_grupos ig
join grupos g on g.id = ig.grupo_id
join (values
  -- Esterilização / CME
  ('ESTERILIZACAO — ESTERILIZACAO',                 'Central de Material e Esterilização (CME)'),

  -- Instrumentos cirúrgicos gerais (904 itens — o maior grupo)
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS',           'Centro Cirúrgico Geral'),
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS',           'Centro Cirúrgico Ambulatorial'),
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS',           'Centro Obstétrico (Maternidade)'),
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS',           'Central de Material e Esterilização (CME)'),

  -- Diagnóstico por imagem / métodos gráficos
  ('MATERIAL DE DIAGNOSTICOS — FILMES RADIOLOGICOS','Centro de Imagem (Raio-X, Tomografia, Ressonância)'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES',          'Centro de Imagem (Raio-X, Tomografia, Ressonância)'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES',          'Laboratório de Patologia Clínica (Análises)'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES',          'Anatomia Patológica'),
  ('MATERIAL DE DIAGNOSTICOS — GEL',                'Centro de Imagem (Raio-X, Tomografia, Ressonância)'),
  ('MATERIAL DE DIAGNOSTICOS — GEL',                'Eletrocardiografia / Métodos Gráficos'),
  ('MATERIAL DE DIAGNOSTICOS — PAPEIS PARA EXAMES', 'Centro de Imagem (Raio-X, Tomografia, Ressonância)'),
  ('MATERIAL DE DIAGNOSTICOS — PAPEIS PARA EXAMES', 'Eletrocardiografia / Métodos Gráficos'),
  ('MATERIAL DE DIAGNOSTICOS — REVELADORES',        'Centro de Imagem (Raio-X, Tomografia, Ressonância)'),

  -- Curativos/assepsia/EPI — transversal, subconjunto representativo
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'UTI Adulto'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Enfermaria de Clínica Cirúrgica'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — AGULHAS',                     'UTI Adulto'),
  ('MATERIAL MEDICO — AGULHAS',                     'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — AGULHAS',                     'Enfermaria de Clínica Médica'),
  ('MATERIAL MEDICO — AGULHAS',                     'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — AGULHAS',                     'Ambulatório de Especialidades Médicas'),
  ('MATERIAL MEDICO — ALCOOL',                      'Almoxarifado Central'),
  ('MATERIAL MEDICO — APARELHO DE TRICOTOMIA',      'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — APARELHO DE TRICOTOMIA',      'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — ASSEPSIA',                    'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ASSEPSIA',                    'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS',      'Sala de Gesso/Imobilização Ortopédica'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS',      'Enfermaria de Ortopedia/Traumatologia'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS',      'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — BISTURIS',                    'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — BISTURIS',                    'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — BISTURIS',                    'Centro Cirúrgico Ambulatorial'),
  ('MATERIAL MEDICO — BOLSAS',                      'Enfermaria de Clínica Cirúrgica'),
  ('MATERIAL MEDICO — BOLSAS',                      'UTI Adulto'),
  ('MATERIAL MEDICO — CANULAS',                     'UTI Adulto'),
  ('MATERIAL MEDICO — CANULAS',                     'UTI Neonatal'),
  ('MATERIAL MEDICO — CANULAS',                     'UTI Pediátrica'),
  ('MATERIAL MEDICO — CANULAS',                     'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — CANULAS',                     'Sala Vermelha (Emergência/Trauma)'),
  ('MATERIAL MEDICO — CATETERES',                   'UTI Adulto'),
  ('MATERIAL MEDICO — CATETERES',                   'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — CATETERES',                   'Setor de Hemodinâmica'),
  ('MATERIAL MEDICO — CATETERES',                   'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — CATETERES',                   'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — COLETORES',                   'Laboratório de Patologia Clínica (Análises)'),
  ('MATERIAL MEDICO — COLETORES',                   'Enfermaria de Clínica Médica'),
  ('MATERIAL MEDICO — COMPRESSAS',                  'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — COMPRESSAS',                  'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — DRENOS',                      'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — DRENOS',                      'UTI Adulto'),
  ('MATERIAL MEDICO — DRENOS',                      'Enfermaria de Clínica Cirúrgica'),
  ('MATERIAL MEDICO — ELETRODOS',                   'UTI Adulto'),
  ('MATERIAL MEDICO — ELETRODOS',                   'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ELETRODOS',                   'Eletrocardiografia / Métodos Gráficos'),
  ('MATERIAL MEDICO — ELETRODOS',                   'Sala Vermelha (Emergência/Trauma)'),
  ('MATERIAL MEDICO — ENXERTO',                     'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ENXERTO',                     'Enfermaria de Ortopedia/Traumatologia'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR',             'UTI Adulto'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR',             'Centro de Infusão / Oncologia Clínica'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR',             'Enfermaria de Clínica Médica'),
  ('MATERIAL MEDICO — ESCOVAS/ESPONJAS',            'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ESCOVAS/ESPONJAS',            'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — ESPACADOR',                   'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — ESPATULA',                    'Ambulatório de Pré-Natal de Alto Risco'),
  ('MATERIAL MEDICO — ESPATULA',                    'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — EXTENSORES/PERFUSORES',       'UTI Adulto'),
  ('MATERIAL MEDICO — EXTENSORES/PERFUSORES',       'Centro de Infusão / Oncologia Clínica'),
  ('MATERIAL MEDICO — FILTRO',                      'UTI Adulto'),
  ('MATERIAL MEDICO — FILTRO',                      'Setor de Hemodiálise (Nefrologia)'),
  ('MATERIAL MEDICO — FILTRO',                      'Centro de Infusão / Oncologia Clínica'),
  ('MATERIAL MEDICO — FIOS',                        'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — FIOS',                        'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — FIOS',                        'Centro Cirúrgico Ambulatorial'),
  ('MATERIAL MEDICO — FIOS',                        'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — FRASCOS',                     'Laboratório de Patologia Clínica (Análises)'),
  ('MATERIAL MEDICO — FRASCOS',                     'Farmácia Central'),
  ('MATERIAL MEDICO — GRAMPO',                      'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — GRAMPO',                      'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — INFUSOR DE BOMBA',            'UTI Adulto'),
  ('MATERIAL MEDICO — INFUSOR DE BOMBA',            'Centro de Infusão / Oncologia Clínica'),
  ('MATERIAL MEDICO — IRRIGADOR/ASPIRADOR',         'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — IRRIGADOR/ASPIRADOR',         'UTI Adulto'),
  ('MATERIAL MEDICO — KIT',                         'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — KIT',                         'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — KITS CIRURGICOS/ CONJUNTOS',  'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — KITS CIRURGICOS/ CONJUNTOS',  'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — KITS CIRURGICOS/ CONJUNTOS',  'Centro Cirúrgico Ambulatorial'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'Laboratório de Patologia Clínica (Análises)'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS',            'UTI Adulto'),
  ('MATERIAL MEDICO — LUVA',                        'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — LUVA',                        'UTI Adulto'),
  ('MATERIAL MEDICO — LUVA',                        'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — LUVA',                        'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS',        'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS',        'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS',        'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PRESERVATIVOS',               'Centro de Imagem (Raio-X, Tomografia, Ressonância)'),
  ('MATERIAL MEDICO — PROTETORES',                  'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — PROTETORES',                  'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — PULSEIRAS',                   'Triagem / Acolhimento'),
  ('MATERIAL MEDICO — PULSEIRAS',                   'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — PULSEIRAS',                   'Alojamento Conjunto (Materno-Infantil)'),
  ('MATERIAL MEDICO — RESERVATORIOS',               'UTI Adulto'),
  ('MATERIAL MEDICO — RESERVATORIOS',               'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — SCALPS',                      'UTI Neonatal'),
  ('MATERIAL MEDICO — SCALPS',                      'Enfermaria de Pediatria'),
  ('MATERIAL MEDICO — SERINGAS',                    'UTI Adulto'),
  ('MATERIAL MEDICO — SERINGAS',                    'Enfermaria de Clínica Médica'),
  ('MATERIAL MEDICO — SERINGAS',                    'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — SERINGAS',                    'Pronto Socorro Adulto'),
  ('MATERIAL MEDICO — SONDAS',                      'UTI Adulto'),
  ('MATERIAL MEDICO — SONDAS',                      'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — SONDAS',                      'Enfermaria de Clínica Cirúrgica'),
  ('MATERIAL MEDICO — SONDAS',                      'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — SONDAS',                      'Lactário'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA',           'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA',           'Centro Obstétrico (Maternidade)'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA',           'Central de Material e Esterilização (CME)'),
  ('MATERIAL MEDICO — TIRAS/FITAS',                 'UTI Adulto'),
  ('MATERIAL MEDICO — TIRAS/FITAS',                 'Enfermaria de Clínica Médica'),
  ('MATERIAL MEDICO — TORNEIRAS/CONECTORES',        'UTI Adulto'),
  ('MATERIAL MEDICO — TORNEIRAS/CONECTORES',        'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — TUBOS',                       'Centro Cirúrgico Geral'),
  ('MATERIAL MEDICO — TUBOS',                       'UTI Adulto'),
  ('MATERIAL MEDICO — TUBOS',                       'UTI Neonatal'),
  ('MATERIAL MEDICO — TUBOS',                       'Sala Vermelha (Emergência/Trauma)'),
  ('MATERIAL MEDICO — TUBOS',                       'Laboratório de Patologia Clínica (Análises)'),

  -- Oftalmologia
  ('OFTALMOLOGIA — OFTALMOLOGIA',                   'Ambulatório de Especialidades Médicas'),
  ('OFTALMOLOGIA — OFTALMOLOGIA',                   'Centro Cirúrgico Ambulatorial'),

  -- OPME — altamente específico por especialidade, maior confiança do mapeamento
  ('OPME — CARDIACA',                               'Setor de Hemodinâmica'),
  ('OPME — CARDIACA',                               'Centro Cirúrgico Geral'),
  ('OPME — CIRURGIA PLASTICA REPARADORA',           'Centro Cirúrgico Geral'),
  ('OPME — ELETROFISIOLOGIA',                       'Setor de Hemodinâmica'),
  ('OPME — GINECOLOGIA',                            'Centro Cirúrgico Geral'),
  ('OPME — GINECOLOGIA',                            'Centro Obstétrico (Maternidade)'),
  ('OPME — HEMODINAMICA',                           'Setor de Hemodinâmica'),
  ('OPME — NEFROLOGIA',                             'Setor de Hemodiálise (Nefrologia)'),
  ('OPME — NEFROLOGIA',                             'Centro Cirúrgico Geral'),
  ('OPME — NEUROLOGIA',                             'Centro Cirúrgico Geral'),
  ('OPME — ONCOLOGICA',                             'Centro Cirúrgico Geral'),
  ('OPME — ONCOLOGICA',                             'Centro de Infusão / Oncologia Clínica'),
  ('OPME — OPME',                                   'Centro Cirúrgico Geral'),
  ('OPME — ORTOPEDICA',                             'Centro Cirúrgico Geral'),
  ('OPME — ORTOPEDICA',                             'Enfermaria de Ortopedia/Traumatologia'),
  ('OPME — ORTOPEDICA',                             'Sala de Gesso/Imobilização Ortopédica'),
  ('OPME — OTORRINOLARINGOLOGIA',                   'Centro Cirúrgico Geral'),
  ('OPME — UROLOGIA',                               'Centro Cirúrgico Geral')
) as mapa(grupo_nome, area_nome) on mapa.grupo_nome = g.nome
join areas a on a.hospital_id = 'huv' and a.nome = mapa.area_nome and a.deleted_at is null
on conflict (item_id, area_id) do nothing;
