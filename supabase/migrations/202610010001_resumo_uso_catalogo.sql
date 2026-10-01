-- Objetivo: adicionar um resumo de uso ao Catálogo de Materiais — pedido do
-- Everton depois de ver o detalhe de um item em `/catalogo` ("poderia ter um
-- resumo de como esse item é usado", com o exemplo de uma atadura de crepe).
--
-- Escrever um resumo item a item (~5.382) não é viável manualmente, e o
-- Everton já tinha dito antes (item 53 do backlog) que não tem conhecimento
-- clínico nem apoio de enfermeiro/médico disponível pra validar isso item a
-- item. Mesma solução estrutural do item 53: resumo a nível de **grupo**
-- (63 grupos reais, tratável) com `itens.resumo_uso` como override opcional
-- pra quando um item específico precisar de um texto diferente do grupo.
--
-- `grupos.descricao_uso` abaixo é pesquisa geral de uso típico de cada
-- categoria de material hospitalar — mesmo aviso do item 53: conhecimento
-- geral, **não validado por nenhum profissional clínico do HUV**. A tela
-- `/catalogo` mostra de onde veio o texto (resumo próprio do item vs.
-- descrição geral do grupo) pra não passar a entender como "oficial".
--
-- Impacto: aditivo — 2 colunas novas (`grupos.descricao_uso`,
-- `itens.resumo_uso`, ambas `text not null default ''`) + UPDATE dos 63
-- grupos reais já existentes. Idempotente (ADD COLUMN IF NOT EXISTS,
-- UPDATE por nome exato sempre reaplicável).
-- Rollback: ALTER TABLE grupos/itens DROP COLUMN descricao_uso/resumo_uso.

alter table grupos add column if not exists descricao_uso text not null default '';
alter table itens add column if not exists resumo_uso text not null default '';

update grupos set descricao_uso = v.descricao
from (values
  ('ESTERILIZACAO — ESTERILIZACAO', 'Indicadores, invólucros e materiais usados no processo de esterilização de instrumentais na Central de Material e Esterilização (ex: fitas indicadoras, papel grau cirúrgico).'),
  ('INSTRUMENTOS MEDICOS — INSTRUMENTOS', 'Instrumentos cirúrgicos de uso geral (pinças, afastadores, clamps) usados durante procedimentos e reprocessados na CME entre um uso e outro.'),
  ('MATERIAL DE DIAGNOSTICOS — FILMES RADIOLOGICOS', 'Filmes usados para registro de imagens radiográficas convencionais.'),
  ('MATERIAL DE DIAGNOSTICOS — FIXADORES', 'Soluções usadas para fixar amostras biológicas ou revelar filmes radiográficos, preservando o material até a análise.'),
  ('MATERIAL DE DIAGNOSTICOS — GEL', 'Gel condutor usado em exames de imagem por ultrassom e em eletrocardiograma, melhorando o contato entre o transdutor/eletrodo e a pele.'),
  ('MATERIAL DE DIAGNOSTICOS — PAPEIS PARA EXAMES', 'Papéis de registro usados em equipamentos de diagnóstico (ECG, monitores, impressoras de laudo).'),
  ('MATERIAL DE DIAGNOSTICOS — REVELADORES', 'Soluções químicas usadas na revelação de filmes radiográficos.'),
  ('MATERIAL MEDICO — ADESIVOS/CURATIVOS/HEMOSTATICOS/ESPARADRAPOS/SELOS/TAMPAO/FRALDAS/ABSORVENTES', 'Materiais de cobertura e fixação usados em curativos, contenção de sangramentos e higiene do paciente, em praticamente todas as áreas assistenciais.'),
  ('MATERIAL MEDICO — AGULHAS', 'Usadas para punção, aplicação de medicação e coleta de sangue, em praticamente todas as áreas assistenciais.'),
  ('MATERIAL MEDICO — ALCOOL', 'Antisséptico usado na desinfecção da pele antes de procedimentos e na assepsia de superfícies/materiais.'),
  ('MATERIAL MEDICO — APARELHO DE TRICOTOMIA', 'Usado para remoção de pelos na região a ser operada, reduzindo o risco de infecção no sítio cirúrgico.'),
  ('MATERIAL MEDICO — ASSEPSIA', 'Produtos usados na preparação da pele/campo antes de procedimentos invasivos, reduzindo o risco de infecção.'),
  ('MATERIAL MEDICO — ATADURAS/FAIXAS/MALHAS', 'Usadas para fixação de curativos, imobilização e compressão em grandes áreas do corpo, como o tronco ou os membros.'),
  ('MATERIAL MEDICO — BISTURIS', 'Lâminas cortantes usadas em incisões cirúrgicas.'),
  ('MATERIAL MEDICO — BOLSAS', 'Bolsas coletoras (colostomia, drenagem, urina) usadas no manejo de eliminações do paciente.'),
  ('MATERIAL MEDICO — CANULAS', 'Usadas para manutenção de via aérea (ex: cânula de Guedel) ou acesso a estruturas durante procedimentos.'),
  ('MATERIAL MEDICO — CATETERES', 'Usados para acesso vascular, infusão de medicação/fluidos ou monitorização em procedimentos clínicos e cirúrgicos.'),
  ('MATERIAL MEDICO — COLETORES', 'Recipientes usados para coleta de amostras biológicas (urina, fezes) para exame laboratorial.'),
  ('MATERIAL MEDICO — COMPRESSAS', 'Usadas para absorção de sangue/fluidos e proteção de feridas durante procedimentos.'),
  ('MATERIAL MEDICO — DISPOSITIVOS', ''),
  ('MATERIAL MEDICO — DRENOS', 'Usados para escoamento de fluidos e secreções de cavidades corporais, geralmente após cirurgia.'),
  ('MATERIAL MEDICO — ELETRODOS', 'Usados para monitorização cardíaca (ECG) e de outros sinais elétricos do paciente.'),
  ('MATERIAL MEDICO — ENXERTO', 'Materiais biológicos ou sintéticos usados para substituição ou reparo de tecido em cirurgia.'),
  ('MATERIAL MEDICO — EQUIPOS/INJETOR', 'Usados para administração de soluções e medicação por via intravenosa.'),
  ('MATERIAL MEDICO — ESCOVAS/ESPONJAS', 'Usadas na degermação das mãos da equipe antes de procedimentos cirúrgicos.'),
  ('MATERIAL MEDICO — ESPACADOR', 'Usado para afastar estruturas e manter o campo cirúrgico visível durante a cirurgia.'),
  ('MATERIAL MEDICO — ESPATULA', 'Usada para coleta de material citológico (ex: exame preventivo) ou manipulação de substâncias.'),
  ('MATERIAL MEDICO — EXTENSORES/PERFUSORES', 'Usados para prolongar ou conectar linhas de infusão intravenosa.'),
  ('MATERIAL MEDICO — FILTRO', 'Usados em linhas de infusão, diálise ou ventilação para reter partículas ou ar.'),
  ('MATERIAL MEDICO — FIOS', 'Usados para sutura de tecidos após incisão cirúrgica ou ferimento.'),
  ('MATERIAL MEDICO — FRASCOS', 'Recipientes usados para acondicionar amostras, soluções ou medicamentos.'),
  ('MATERIAL MEDICO — GRAMPO', 'Usado para fechamento de pele/tecido, em substituição ou complemento à sutura com fio.'),
  ('MATERIAL MEDICO — INFUSOR DE BOMBA', 'Usado para administração controlada e contínua de medicação/fluidos via bomba de infusão.'),
  ('MATERIAL MEDICO — IRRIGADOR/ASPIRADOR', 'Usados para lavagem e aspiração de fluidos/secreções durante procedimentos.'),
  ('MATERIAL MEDICO — KIT', ''),
  ('MATERIAL MEDICO — KITS CIRURGICOS/ CONJUNTOS', 'Conjuntos de instrumentais/materiais organizados para um tipo específico de cirurgia.'),
  ('MATERIAL MEDICO — LAMINAS/LANCETAS', 'Usadas para pequenas incisões ou punção capilar, como no teste de glicemia.'),
  ('MATERIAL MEDICO — LUVA', 'Equipamento de proteção individual usado em todo contato com o paciente ou manuseio de material contaminado.'),
  ('MATERIAL MEDICO — PINCAS/PORTA AGULHAS', 'Instrumentos cirúrgicos usados para preensão de tecidos e fixação da agulha durante a sutura.'),
  ('MATERIAL MEDICO — PRESERVATIVOS', 'Usados como proteção/capa descartável em transdutores de ultrassom.'),
  ('MATERIAL MEDICO — PROTETORES', 'Usados para proteção de superfícies, equipamentos ou do próprio paciente durante procedimentos.'),
  ('MATERIAL MEDICO — PULSEIRAS', 'Usadas para identificação do paciente, garantindo segurança na assistência.'),
  ('MATERIAL MEDICO — RESERVATORIOS', 'Usados para acúmulo temporário de fluidos corporais ou soluções durante procedimentos.'),
  ('MATERIAL MEDICO — SCALPS', 'Agulhas com asas usadas para punção venosa periférica, comuns em pediatria e neonatologia.'),
  ('MATERIAL MEDICO — SERINGAS', 'Usadas para administração de medicação, aspiração de fluidos ou lavagem.'),
  ('MATERIAL MEDICO — SONDAS', 'Usadas para alimentação, drenagem ou monitorização de cavidades corporais (ex: sonda vesical, nasogástrica).'),
  ('MATERIAL MEDICO — TESOURA CIRURGICA', 'Usada para corte de tecidos, fios de sutura ou materiais durante procedimentos.'),
  ('MATERIAL MEDICO — TIRAS/FITAS', 'Usadas em testes rápidos, como a glicemia capilar, ou para fixação.'),
  ('MATERIAL MEDICO — TORNEIRAS/CONECTORES', 'Usados para múltiplos acessos em uma mesma linha de infusão.'),
  ('MATERIAL MEDICO — TUBOS', 'Usados para via aérea (tubo endotraqueal), coleta de sangue ou outras finalidades, conforme o tipo.'),
  ('OFTALMOLOGIA — OFTALMOLOGIA', 'Materiais específicos usados em procedimentos e consultas oftalmológicas.'),
  ('OPME — CARDIACA', 'Órteses e próteses implantáveis usadas em procedimentos cardíacos, como stents e válvulas.'),
  ('OPME — CIRURGIA PLASTICA REPARADORA', 'Materiais implantáveis usados em procedimentos reconstrutivos.'),
  ('OPME — ELETROFISIOLOGIA', 'Cateteres e dispositivos usados em estudos e procedimentos de eletrofisiologia cardíaca.'),
  ('OPME — GINECOLOGIA', 'Materiais especiais usados em procedimentos cirúrgicos ginecológicos.'),
  ('OPME — HEMODINAMICA', 'Cateteres, stents e materiais usados em procedimentos de cardiologia intervencionista.'),
  ('OPME — NEFROLOGIA', 'Materiais especiais usados em procedimentos relacionados à função renal, como acessos para diálise.'),
  ('OPME — NEUROLOGIA', 'Materiais implantáveis usados em procedimentos neurocirúrgicos.'),
  ('OPME — ONCOLOGICA', 'Materiais especiais usados em procedimentos cirúrgicos oncológicos.'),
  ('OPME — OPME', ''),
  ('OPME — ORTOPEDICA', 'Implantes usados em cirurgias ortopédicas, como placas, parafusos e próteses articulares.'),
  ('OPME — OTORRINOLARINGOLOGIA', 'Materiais especiais usados em procedimentos de otorrinolaringologia.'),
  ('OPME — UROLOGIA', 'Materiais especiais usados em procedimentos urológicos, como stents ureterais.')
) as v(nome, descricao)
where grupos.nome = v.nome and grupos.deleted_at is null;
