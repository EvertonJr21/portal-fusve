-- Objetivo: CONTINUAÇÃO da correção do item anterior (`202610010013`) —
-- mesmo bug de ordem de execução entre migrations, mas na parte que mais
-- importa: os ~3.000 itens cobertos pelas migrations de PADRÃO (não
-- cod_soulmv individual) dos itens 65/66/67
-- (`202610010009_resumo_uso_opme_ortopedica.sql`,
-- `202610010010_resumo_uso_opme_hemodinamica.sql`,
-- `202610010011_resumo_uso_opme_cardiaca.sql`).
--
-- **Verificado por script, simulando a execução real das migrations
-- 0002→0003 (itens 58/59, já em produção, rodam antes por ter número
-- menor) contra os nomes reais de cada grupo**: a fração de itens que já
-- tinha `resumo_uso` preenchido **antes** das minhas migrations de padrão
-- rodarem era muito maior do que eu tinha percebido ao reportar "97%"/
-- "100% de cobertura" nos itens 65/66/67 — porque aquela cobertura media
-- quantos itens BATIAM no padrão, não quantos de fato tiveram o texto
-- trocado (a condição `resumo_uso = '' or is null` das minhas migrations
-- bloqueou a escrita em qualquer item que as migrations 0002/0003 já
-- tivessem tocado antes, por padrão de nome genérico cruzando o catálogo
-- inteiro):
--   - `OPME — ORTOPEDICA`: 1.008 dos 1.222 itens (82,5%) já tinham texto
--     prévio — meu padrão específico de 69 regras só "pegou" de verdade
--     nos outros 17,5%.
--   - `OPME — HEMODINAMICA`: 661 dos 685 itens (96,5%) já tinham texto
--     prévio — praticamente toda a migration 0010 foi um no-op silencioso.
--   - `OPME — CARDIACA`: 90 dos 156 itens (57,7%) já tinham texto prévio.
--
-- Na maioria dos casos o texto antigo (de 0002/0003) não está "errado" —
-- é só mais genérico/menos específico que o meu (ex: "Implante ortopédico
-- usado pra fixação em osso cortical..." em vez do meu "Parafuso
-- ortopédico pra osso cortical (compacto) — fixa fragmentos de fratura...
-- mais usado na diáfise..."). Mas como o Everton pediu especificamente
-- descrição mais detalhada/específica (não a genérica), e como meu padrão
-- por grupo foi validado item a item contra os nomes reais (0 regra sem
-- correspondência, ao contrário do padrão cruzado de 0002/0003, que não
-- foi desenhado pensando nesses grupos OPME específicos), a versão mais
-- específica deve prevalecer.
--
-- Esta migration reaplica exatamente as mesmas 69+20+34 regras dos itens
-- 65/66/67 (mesmo texto, mesmas condições `ilike`, mesmo escopo por grupo
-- via `item_grupos`/`grupos`), só **sem** a condição `resumo_uso = ''` —
-- força a sobrescrita pra garantir que a cobertura reportada nos itens
-- 65/66/67 passe a valer de verdade. Os blocos de anomalia (itens mal
-- classificados: `2786`/`7571` de ORTOPEDICA, `7505`/`12713` de CARDIACA)
-- não são repetidos aqui — já foram corrigidos na migration `202610010013`.
--
-- **Mesma lição do item 0013, reforçada**: migration item-específica (seja
-- por `cod_soulmv` ou por padrão de nome validado item a item) deve rodar
-- sem a guarda de campo vazio quando o objetivo é ser mais específica que
-- um padrão genérico anterior. A guarda de "só escrever se vazio" só faz
-- sentido pra migrations de padrão amplo tipo 56/58/59, que devem ceder a
-- qualquer descrição já mais específica — nunca o contrário.
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso`, sempre
-- escopado por grupo via `item_grupos`/`grupos`. Não mexe em
-- `grupos`/`item_grupos`/`item_areas`. Idempotente.

update itens set resumo_uso = 'Parafuso ortopédico pra osso cortical (compacto) — fixa fragmentos de fratura entre si ou prende uma placa ao osso durante a consolidação; mais usado na diáfise (parte mais densa) dos ossos longos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CORTICAL%');

update itens set resumo_uso = 'Parafuso ortopédico pra osso esponjoso (poroso), encontrado nas extremidades dos ossos longos (epífise/metáfise) — rosca mais espaçada que o parafuso cortical, própria pra fixar fraturas perto de articulações (ex: quadril, punho).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%ESPONJOSO%');

update itens set resumo_uso = 'Parafuso ortopédico canulado (oco por dentro) — inserido sobre um fio-guia já posicionado por imagem (raio-X), permitindo fixação percutânea mais precisa de fraturas (ex: colo do fêmur, escafoide).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CANULADO%');

update itens set resumo_uso = 'Parafuso de bloqueio (locking) — trava diretamente na rosca da placa, criando um conjunto de ângulo fixo entre parafuso e placa; mais usado em fraturas cominutivas (vários fragmentos) ou em osso de qualidade reduzida (ex: osteoporose).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%BLOQ%');

update itens set resumo_uso = 'Parafuso pedicular — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna vertebral junto com hastes/barras.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%PEDIC%');

update itens set resumo_uso = 'Parafuso usado em placas de fixação da coluna cervical (pescoço).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CERVICAL%');

update itens set resumo_uso = 'Parafuso usado em placas volares, mais comum na fixação de fraturas do rádio distal (punho).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%VOLAR%');

update itens set resumo_uso = 'Parafuso deslizante (tipo DHS) — permite compressão controlada ao longo do eixo da fratura conforme ela consolida; usado sobretudo em fraturas do colo/trocanter do fêmur (quadril).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%DESLIZANTE%');

update itens set resumo_uso = 'Parafuso usado pra fixar o componente acetabular (parte do quadril) numa artroplastia total de quadril.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Parafuso tampão — fecha um orifício não utilizado numa placa ou a extremidade de um parafuso/haste canulada, evitando entrada de tecido/fluido.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%TAMPAO%');

update itens set resumo_uso = 'Parafuso ortopédico — fixa fragmentos ósseos entre si ou prende uma placa/componente ao osso; o tipo de rosca, diâmetro e indicação variam conforme a região óssea e o tipo de fratura/cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%');

update itens set resumo_uso = 'Parafuso ortopédico — fixa fragmentos ósseos entre si ou prende uma placa/componente ao osso; o tipo de rosca, diâmetro e indicação variam conforme a região óssea e o tipo de fratura/cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARFUSO%');

update itens set resumo_uso = 'Placa de fixação da coluna cervical (pescoço), fixada com parafusos nas vértebras, usada em cirurgias de artrodese ou fratura cervical.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%CERVICAL%');

update itens set resumo_uso = 'Placa usada na face anterior (volar) do rádio, principalmente em fraturas do punho (rádio distal).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%VOLAR%');

update itens set resumo_uso = 'Placa tubular — formato semicircular que se adapta ao contorno do osso, usada pra fixar fraturas de ossos longos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%TUBULAR%');

update itens set resumo_uso = 'Placa de reconstrução — mais maleável que outras placas, pode ser moldada à mão durante a cirurgia pra se adaptar a contornos ósseos irregulares (ex: pelve, mandíbula).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%RECONSTRU%');

update itens set resumo_uso = 'Placa do sistema DHS (parafuso deslizante de quadril) — fixada ao fêmur junto com o parafuso deslizante, usada em fraturas do colo/trocanter do fêmur.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%DHS%');

update itens set resumo_uso = 'Placa com ângulo fixo entre a lâmina e o corpo da placa, usada em fraturas próximas a uma articulação onde o alinhamento angular é importante (ex: fêmur proximal/distal).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%ANGULAD%');

update itens set resumo_uso = 'Placa de bloqueio (locking) — os parafusos travam diretamente na placa, criando um conjunto de ângulo fixo; mais usada em fraturas cominutivas ou osso de qualidade reduzida.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%BLOQ%');

update itens set resumo_uso = 'Placa ortopédica — fixada ao osso com parafusos pra manter fragmentos de uma fratura alinhados durante a consolidação; o formato, tamanho e número de furos variam conforme o osso e o tipo de fratura.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%');

update itens set resumo_uso = 'Placa ortopédica — fixada ao osso com parafusos pra manter fragmentos de uma fratura alinhados durante a consolidação; o formato, tamanho e número de furos variam conforme o osso e o tipo de fratura.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLA %');

update itens set resumo_uso = 'Haste intramedular — inserida dentro do canal medular do osso longo (fêmur, tíbia, úmero) pra estabilizar uma fratura, geralmente travada com parafusos nas extremidades.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%INTRAMEDULAR%');

update itens set resumo_uso = 'Haste usada numa cirurgia de revisão de prótese (quando o implante original precisa ser trocado) — alonga o componente pra se fixar em osso mais distante da região original.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%REVISAO%');

update itens set resumo_uso = 'Haste ortopédica — usada tanto como fixação interna de fratura (dentro do canal medular do osso) quanto como parte longa de uma prótese articular (quadril/joelho) que se encaixa dentro do osso; a função exata depende do contexto clínico específico do item.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%');

update itens set resumo_uso = 'Pino de Schanz — haste rosqueada que atravessa o osso e fica presa externamente a um fixador externo; usado em fraturas instáveis ou quando não é possível operar direto no local da fratura (ex: fratura exposta, politrauma).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PINO%')
  and unaccent(itens.nome) ilike unaccent('%SCHANZ%');

update itens set resumo_uso = 'Pino ortopédico — usado pra fixação temporária ou definitiva de fragmentos ósseos, isolado ou em conjunto com outros implantes (fixador externo, placa).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PINO%');

update itens set resumo_uso = 'Fio de Kirschner (fio-K) — fio metálico fino usado pra fixação temporária de fragmentos ósseos pequenos (ex: mão, pé) ou como guia pra outros implantes.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%KIRSCHNER%');

update itens set resumo_uso = 'Fio/pino de Steinmann — mais espesso que o fio de Kirschner, usado em tração esquelética (puxar o osso pra alinhar uma fratura antes da cirurgia definitiva) ou fixação com fixador externo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%ST%');

update itens set resumo_uso = 'Fio-guia — posicionado por imagem (raio-X) pra guiar a inserção precisa de um parafuso canulado ou outro implante.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Fio maleável (cerclagem) — envolve o osso ao redor de uma fratura, como uma cinta, pra manter os fragmentos comprimidos e alinhados.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%MALEAVEL%');

update itens set resumo_uso = 'Fio metálico de uso ortopédico — a função exata (fixação, tração, guia ou cerclagem) varia conforme o tipo e a indicação específica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%');

update itens set resumo_uso = 'Componente femoral de uma prótese articular (quadril ou joelho) — parte do implante que substitui a superfície articular do lado do fêmur.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%FEMORAL%');

update itens set resumo_uso = 'Componente tibial de uma prótese de joelho — parte do implante que substitui a superfície articular do lado da tíbia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%TIBIAL%');

update itens set resumo_uso = 'Componente acetabular de uma prótese de quadril — substitui a cavidade do quadril (acetábulo) onde a cabeça do fêmur se encaixa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Componente cefálico de uma prótese de quadril — substitui a cabeça do fêmur, encaixa na haste femoral.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%CEFALICO%');

update itens set resumo_uso = 'Componente patelar de uma prótese de joelho — substitui a superfície articular da patela (rótula).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%PATELAR%');

update itens set resumo_uso = 'Componente glenoidal de uma prótese de ombro — substitui a cavidade glenoide (parte da escápula) onde a cabeça do úmero se encaixa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%GLENOID%');

update itens set resumo_uso = 'Componente de uma prótese articular (quadril, joelho ou ombro) — parte específica do implante; a articulação e o lado exato variam conforme o item.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%');

update itens set resumo_uso = 'Componente de uma prótese articular (quadril, joelho ou ombro) — parte específica do implante; a articulação e o lado exato variam conforme o item.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMP.%');

update itens set resumo_uso = 'Haste/componente femoral de uma prótese de quadril ou joelho — parte do implante que se fixa dentro do fêmur.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%FEMORAL%');

update itens set resumo_uso = 'Prótese articular (implante usado em artroplastia) — substitui total ou parcialmente uma articulação (quadril, joelho, ombro) danificada por fratura, artrose ou outra doença.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%');

update itens set resumo_uso = 'Haste intramedular bloqueada da linha Ortolock — mesma função de uma haste intramedular comum (estabiliza fratura de osso longo por dentro do canal medular).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ORTOLOCK%');

update itens set resumo_uso = 'Componente acetabular (ou calota metálica que reveste o acetábulo) de uma prótese de quadril — substitui a cavidade do quadril onde a cabeça do fêmur se encaixa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Cabeça (femoral ou bipolar) de uma prótese de quadril — parte esférica do implante que se articula com o acetábulo ou com o componente acetabular.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CABEC%');

update itens set resumo_uso = 'Platô tibial — parte de uma prótese de joelho que substitui a superfície articular superior da tíbia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLATO%');

update itens set resumo_uso = 'Liner (forro) de polietileno — encaixa entre os dois componentes metálicos de uma prótese articular (ex: quadril, joelho), reduzindo o atrito entre eles.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%LINER%');

update itens set resumo_uso = 'Inserto de polietileno — mesma função do liner, peça intermediária que reduz o atrito entre os componentes metálicos de uma prótese articular.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%INSERTO%');

update itens set resumo_uso = 'Componente modular de revisão de prótese de joelho (base ou calço tibial/femoral) — usado quando a prótese original precisa ser substituída, preenchendo uma perda óssea maior.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%TIBIAL%')
  and unaccent(itens.nome) ilike unaccent('%MOD%');

update itens set resumo_uso = 'Fixador externo — estrutura montada por fora do corpo, conectada ao osso por pinos/fios que atravessam a pele; usada pra estabilizar fraturas instáveis, geralmente quando não é possível ou não é indicado operar direto no local (ex: fratura exposta, infecção, politrauma).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIXADOR%');

update itens set resumo_uso = 'Colar cervical — órtese rígida usada pra imobilizar o pescoço, em trauma (suspeita de lesão na coluna cervical) ou no pós-operatório de cirurgia cervical.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COLAR%');

update itens set resumo_uso = 'Halo craniano — anel metálico fixado ao crânio com pinos, usado pra tração ou imobilização rígida da coluna cervical em fraturas instáveis.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HALO%');

update itens set resumo_uso = 'Cage (gaiola) intervertebral — dispositivo implantado entre duas vértebras após a retirada do disco; mantém o espaço e favorece a fusão óssea numa artrodese da coluna.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CAGE%');

update itens set resumo_uso = 'Barra de fixação da coluna — conecta parafusos pediculares entre vértebras diferentes, formando a estrutura rígida de uma artrodese vertebral.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%BARRA%');

update itens set resumo_uso = 'Gancho de fixação da coluna — se encaixa numa vértebra (geralmente na lâmina ou no pedículo) como ponto de ancoragem alternativo ao parafuso pedicular, conectado à barra da construção.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%GANCHO%');

update itens set resumo_uso = 'Arruela — peça auxiliar usada junto com parafusos ortopédicos; distribui a pressão de aperto sobre o osso ou sobre a placa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ARRUELA%');

update itens set resumo_uso = 'Âncora de sutura — pequeno implante fixado no osso com um fio preso, usado pra reinserir um tendão ou ligamento no local de origem (ex: cirurgia do manguito rotador, reparo ligamentar).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ANCORA%');

update itens set resumo_uso = 'Restritor de cimento — tampão colocado dentro do canal do osso antes da cimentação de uma prótese; impede que o cimento ósseo escoe além do ponto desejado.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%RESTRITOR%');

update itens set resumo_uso = 'Cimento ósseo (PMMA) — usado pra fixar um componente protético dentro do osso, preenchendo o espaço entre o implante e o osso.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CIMENTO%');

update itens set resumo_uso = 'Centralizador — peça auxiliar usada durante a cimentação de uma haste protética; mantém a haste centralizada dentro do canal ósseo até o cimento endurecer, garantindo uma camada uniforme de cimento ao redor.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CENTRALIZADOR%');

update itens set resumo_uso = 'Fresa ou broca cirúrgica — instrumento rotativo usado pra preparar o canal ósseo ou perfurar o osso antes de inserir um implante (parafuso, haste, componente protético).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FRESA%');

update itens set resumo_uso = 'Fresa ou broca cirúrgica — instrumento rotativo usado pra preparar o canal ósseo ou perfurar o osso antes de inserir um implante (parafuso, haste, componente protético).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%BROCA%');

update itens set resumo_uso = 'Cânula de artroscopia — tubo que mantém um portal de acesso aberto na articulação durante cirurgia artroscópica, por onde passam a câmera e os instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%');

update itens set resumo_uso = 'Enxerto ósseo (de origem humana, animal ou sintética) — usado pra preencher uma falha óssea ou estimular a consolidação/fusão óssea numa cirurgia ortopédica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ENXERTO%');

update itens set resumo_uso = 'Substituto ósseo sintético — material usado no lugar de um enxerto ósseo natural, pra preencher uma falha óssea e estimular a formação de osso novo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%SUBSTITUTO%');

update itens set resumo_uso = 'Fita sintética usada na reconstrução de um ligamento (ex: ligamento cruzado do joelho) — serve de guia ou reforço pra fixação do novo ligamento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FITA%');

update itens set resumo_uso = 'Cabo de cerclagem — similar ao fio maleável, mas de maior resistência; envolve o osso ao redor de uma fratura pra manter os fragmentos comprimidos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CABO%');

update itens set resumo_uso = 'Tala — suporte rígido ou semirrígido usado pra imobilizar um membro, geralmente de forma temporária.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%TALA%');

update itens set resumo_uso = 'Kit com o conjunto de implantes e/ou instrumental necessário pra um procedimento ortopédico específico (ex: um sistema de haste, placa ou prótese completo) — os itens individuais do kit variam conforme o sistema/fabricante.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%KIT%');

update itens set resumo_uso = 'Stent farmacológico (drug-eluting) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, mantém o vaso aberto; a superfície é revestida com medicamento que reduz o risco de reestreitamento (reestenose) do vaso depois do procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%')
  and unaccent(itens.nome) ilike unaccent('%FARMAC%');

update itens set resumo_uso = 'Stent coronário convencional (sem revestimento farmacológico) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, pra manter o vaso aberto depois da dilatação com o balão.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%');

update itens set resumo_uso = 'Stent coronário convencional (sem revestimento farmacológico) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, pra manter o vaso aberto depois da dilatação com o balão.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STNET%');

update itens set resumo_uso = 'Cateter-balão de angioplastia — inflado dentro de uma artéria coronária estreitada pra dilatá-la (abrir a passagem de sangue), usado antes e/ou depois da colocação de um stent.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Cateter extrator de trombos (aspiração) — aspira o coágulo (trombo) de dentro de uma artéria coronária obstruída, usado em infarto agudo antes ou em vez de colocar um stent.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%EXTRATOR%');

update itens set resumo_uso = 'Cateter de extensão do cateter-guia — estende o alcance e aumenta o suporte do cateter-guia dentro da artéria, facilitando a passagem de outros instrumentos em lesões mais difíceis de alcançar.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%EXTENSAO%');

update itens set resumo_uso = 'Cateter de eletrofisiologia com 4 eletrodos (quadripolar) — usado dentro do coração pra registrar a atividade elétrica cardíaca ou estimular o coração durante um estudo eletrofisiológico.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%QUADRIPOLAR%');

update itens set resumo_uso = 'Cateter de eletrofisiologia com 10 eletrodos (decapolar) — mesma função do cateter quadripolar (registrar/estimular a atividade elétrica do coração), com mais pontos de contato ao longo do cateter.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%DECAPOLAR%');

update itens set resumo_uso = 'Cateter de ablação — usado dentro do coração pra localizar e cauterizar (ablacionar) o ponto de tecido responsável por uma arritmia cardíaca, num estudo eletrofisiológico.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%ABLA%');

update itens set resumo_uso = 'Cateter angiográfico (diagnóstico) — posicionado num vaso sanguíneo pra injetar contraste e permitir a visualização por raio-X (angiografia) antes de qualquer intervenção.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%ANGIOGRAF%');

update itens set resumo_uso = 'Cateter diagnóstico — posicionado num vaso sanguíneo pra injetar contraste e permitir a visualização por raio-X (angiografia) antes de qualquer intervenção; o formato da ponta varia conforme a artéria a ser estudada.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%DIAGNOSTICO%');

update itens set resumo_uso = 'Cateter-guia — proporciona um caminho estável da entrada arterial até a origem da artéria coronária, por dentro do qual passam o fio-guia, o cateter-balão e o stent durante a angioplastia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Cateter usado em procedimento de hemodinâmica/cateterismo cardíaco — a função exata (diagnóstico, intervenção ou eletrofisiologia) varia conforme o tipo e formato específico.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do vaso sanguíneo, serve de caminho pra avançar cateteres, balões e stents até o local da lesão.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do vaso sanguíneo, serve de caminho pra avançar cateteres, balões e stents até o local da lesão.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Bainha introdutora longa — mantém um acesso estável dentro do vaso sanguíneo durante o procedimento, por onde passam cateteres e outros instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Kit introdutor (bainha + dilatador, às vezes com agulha) — estabelece o acesso inicial ao vaso sanguíneo (artéria radial ou femoral, geralmente) no começo do procedimento de hemodinâmica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Agulha usada pra puncionar o vaso sanguíneo (ou o septo entre as câmaras do coração, no caso da agulha transseptal) no início de um procedimento de hemodinâmica/eletrofisiologia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%');

update itens set resumo_uso = 'Selador hemostático vascular — fecha o local da punção na artéria ao final do procedimento, controlando o sangramento sem precisar de compressão manual prolongada.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%SELADOR%');

update itens set resumo_uso = 'Cateter-balão de angioplastia — inflado dentro de uma artéria coronária estreitada pra dilatá-la (abrir a passagem de sangue), usado antes e/ou depois da colocação de um stent.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Endoprótese (stent-graft) aórtica ou torácica — tubo revestido implantado por dentro da artéria (geralmente por acesso percutâneo, sem abrir o tórax/abdome) pra tratar um aneurisma, excluindo-o da circulação sanguínea por dentro.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ENDOPROTESE%');

update itens set resumo_uso = 'Válvula cardíaca protética (biológica ou mecânica, aórtica ou mitral) — substitui uma válvula nativa danificada (por estenose, insuficiência ou outra doença). A biológica não exige anticoagulação permanente mas dura menos; a mecânica é mais durável mas exige anticoagulação pelo resto da vida.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%VALVULA%');

update itens set resumo_uso = 'Anel de anuloplastia — não substitui a válvula, só reforça/remodela o anel fibroso ao redor dela numa cirurgia de reparo valvar (plástica), geralmente da válvula mitral ou tricúspide.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ANEL%');

update itens set resumo_uso = 'Conjunto de tubos (linha arterial/venosa) da circulação extracorpórea — tubulação que conecta o paciente à máquina coração-pulmão durante uma cirurgia cardíaca com CEC (circulação extracorpórea).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%TUBOS%');

update itens set resumo_uso = 'Conjunto pra autotransfusão intraoperatória (cell saver) — recolhe, filtra e devolve ao paciente o próprio sangue perdido durante a cirurgia, reduzindo a necessidade de transfusão de banco de sangue.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%TRANSFUSAO%');

update itens set resumo_uso = 'Conjunto completo da circulação extracorpórea pediátrica/neonatal — tubulação e componentes da máquina coração-pulmão dimensionados pro volume sanguíneo menor de crianças/recém-nascidos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%CIRCULACAO%');

update itens set resumo_uso = 'Conjunto de materiais montado pra um procedimento específico de cirurgia cardíaca/circulação extracorpórea — o conteúdo exato varia conforme o procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%');

update itens set resumo_uso = 'Agulha de punção transseptal — atravessa o septo entre os átrios do coração (de dentro pra fora, via veia femoral) pra dar acesso ao lado esquerdo do coração em procedimentos estruturais ou de eletrofisiologia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%');

update itens set resumo_uso = 'Bainha de punção transseptal — acompanha a agulha transseptal, mantém o acesso aberto através do septo interatrial depois da punção.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Introdutor (bainha de acesso) — usado pra implantar um eletrodo de marcapasso/CDI numa veia, ou como acesso vascular durante um procedimento de hemodinâmica/eletrofisiologia cardíaca.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Cardioversor desfibrilador implantável (CDI) ou um de seus componentes (gerador, eletrodo) — dispositivo implantado que detecta arritmias ventriculares graves e aplica um choque elétrico interno pra reverter o ritmo cardíaco; pode ter função combinada de marcapasso.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CARDIOVERSOR%');

update itens set resumo_uso = 'Marcapasso cardíaco implantável (ou um de seus componentes, como o eletrodo) — dispositivo que gera estímulos elétricos pra manter o coração batendo num ritmo adequado quando o próprio sistema elétrico do coração falha (bradicardia, bloqueio); câmara única ou dupla conforme a necessidade do paciente.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%MARCAPASSO%');

update itens set resumo_uso = 'Eletrodo (cabo-eletrodo) de marcapasso ou cardioversor — fio implantado dentro ou na superfície do coração que conduz o estímulo elétrico do gerador até o músculo cardíaco, ou capta a atividade elétrica do coração.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%');

update itens set resumo_uso = 'Cateter usado em procedimento de cirurgia cardíaca, hemodinâmica ou eletrofisiologia — a função exata varia conforme o tipo específico.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%');

update itens set resumo_uso = 'Enxerto arterial (tubular, bifurcado ou valvado, orgânico ou inorgânico) — conduto vascular usado pra substituir ou desviar (bypass) um segmento de artéria doente, incluindo a aorta.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ENXERTO%');

update itens set resumo_uso = 'Patch (remendo) de pericárdio bovino ou material sintético — usado pra fechar ou reforçar uma abertura no coração ou num vaso sanguíneo durante a cirurgia (ex: fechamento de um septo, ampliação de uma artéria).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%PATCH%');

update itens set resumo_uso = 'Cânula de circulação extracorpórea — tubo rígido inserido numa artéria, veia ou direto no coração; conecta o paciente à máquina coração-pulmão (drenagem venosa, retorno arterial) ou entrega solução de cardioplegia que para o coração durante a cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%');

update itens set resumo_uso = 'Stent (convencional ou farmacológico) pra artéria coronária ou periférica — malha metálica expansível que mantém o vaso aberto depois de uma angioplastia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%');

update itens set resumo_uso = 'Oxigenador de membrana — componente da máquina coração-pulmão que faz a troca de gases (oxigênio/gás carbônico) no sangue do paciente durante a circulação extracorpórea, substituindo a função dos pulmões durante a cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%OXIGENADOR%');

update itens set resumo_uso = 'Shunt intracoronário temporário — pequeno tubo inserido dentro da artéria coronária durante uma cirurgia de revascularização sem circulação extracorpórea (coração batendo), mantém o sangue fluindo enquanto o cirurgião costura o enxerto.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SHUNT%');

update itens set resumo_uso = 'Hemoconcentrador de membrana — componente da circulação extracorpórea que remove excesso de água/fluido do sangue do paciente durante ou depois da cirurgia cardíaca, concentrando as células sanguíneas.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%HEMOCONCENTRADOR%');

update itens set resumo_uso = 'Selante cirúrgico biológico (cola) — aplicado sobre uma sutura ou superfície de tecido pra reforçar a vedação e reduzir sangramento/vazamento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SELANTE%');

update itens set resumo_uso = 'Cone descartável da bomba centrífuga — peça que entra em contato com o sangue dentro da bomba centrífuga da circulação extracorpórea, bombeando o sangue sem precisar comprimir um tubo (diferente da bomba de rolete).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%FLOPUMP%');

update itens set resumo_uso = 'Conduto valvado — tubo com uma válvula embutida, usado pra reconstruir a conexão entre um ventrículo e uma grande artéria (aorta ou pulmonar) em cirurgias cardíacas complexas, incluindo correções congênitas.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONDUTO%');

update itens set resumo_uso = 'Bomba centrífuga — impulsiona o sangue do paciente através do circuito de circulação extracorpórea durante a cirurgia cardíaca, fazendo o papel do coração enquanto ele está parado.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%BOMBA%');

update itens set resumo_uso = 'Reservatório da circulação extracorpórea — recipiente que acumula temporariamente o sangue (venoso) ou a solução de cardioplegia antes de retornar ao paciente ou ser infundida no coração.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%RESERVAT%');

update itens set resumo_uso = 'Estabilizador de tecido cardíaco (Octopus) — fixa por sucção uma pequena área do coração batendo, imobilizando-a localmente pra permitir a sutura do enxerto numa cirurgia de revascularização sem circulação extracorpórea (coração batendo).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%OCTOPUS%');

update itens set resumo_uso = 'Adesivo cirúrgico biológico (cola, ex: BioGlue) — reforça uma sutura ou linha de grampeamento, reduzindo sangramento/vazamento em tecido cardíaco ou vascular.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ADESIVO%');

update itens set resumo_uso = 'Ímã pra marcapasso/CDI — posicionado sobre a pele acima do dispositivo implantado pra suspender temporariamente sua função (ex: durante uma cirurgia com bisturi elétrico, que pode interferir no dispositivo).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%IMA%');

update itens set resumo_uso = 'Coils (molas) de embolização — pequenas molas metálicas implantadas dentro de um vaso sanguíneo ou estrutura anômala (ex: canal arterial persistente, fístula) pra ocluí-la.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%COILS%');

update itens set resumo_uso = 'Sistema com múltiplos componentes pra um procedimento específico de cirurgia cardíaca ou eletrofisiologia (ex: eletrodos de estimulação multi-sítio) — o conteúdo exato varia conforme o procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SISTEMA%');

update itens set resumo_uso = 'Guia e filtro pra veia cava — dispositivo usado pra guiar e posicionar um filtro de veia cava (previne que um coágulo das pernas chegue ao pulmão).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Membrana de pericárdio sintético (ex: Preclude/Gore-Tex) — usada pra revestir o coração após a cirurgia, reduzindo aderências numa possível reoperação.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%MEMBRANA%');

