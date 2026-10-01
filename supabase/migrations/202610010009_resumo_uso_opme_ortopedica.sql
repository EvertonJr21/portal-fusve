-- Objetivo: revisão item a item (por padrão de nome/função, não cod_soulmv
-- individual) do grupo `OPME — ORTOPEDICA` — o maior grupo do catálogo
-- (1.222 itens), primeiro da "revisão geral" pedida pelo Everton depois do
-- item 64, feita grupo por grupo em ordem de risco/tamanho.
--
-- **Resultado da amostragem completa (lida linha a linha)**: diferente do
-- `OPME — ONCOLOGICA` (item 63), este grupo está **corretamente nomeado**
-- — a esmagadora maioria é mesmo implante/instrumental ortopédico de
-- verdade (484 parafusos, 257 placas, 69 hastes, 51 pinos, 40 fios, 34
-- próteses/componentes de artroplastia, 23 fixadores externos, acetábulos,
-- platôs, liners, cimento ósseo etc.). O problema aqui não era classificação
-- errada, e sim granularidade: a descrição de grupo ("Implantes usados em
-- cirurgias ortopédicas, como placas, parafusos e próteses articulares.")
-- é genérica demais pra dizer o que cada tipo específico de implante faz.
--
-- **Achado à parte, menor porém real**: pelo menos 7 itens estão claramente
-- mal classificados dentro deste grupo — não são implante ortopédico
-- nenhum, parecem erro de cadastro no próprio SoulMV (Classe/Sub Classe):
-- um stent coronário (cardíaco), uma placa eletrônica de secadora de ar,
-- um reator de esterilizador de ar, uma etiqueta de vaporizador de
-- anestesia, um O-ring de vedação, e 2 itens de nome ambíguo (possível
-- ponteira de caneta eletrocirúrgica). Tratados individualmente por
-- `cod_soulmv` logo no início desta migration, com texto explicando que
-- não são ortopédicos e recomendando revisão da classificação de origem —
-- em vez de herdar a descrição genérica errada do grupo (que diria que são
-- "implantes ortopédicos").
--
-- **Cobertura**: ~97% dos 1.222 itens (1.180 batem nos padrões de nome
-- abaixo + 7 anomalias tratadas à parte) ficam com descrição específica da
-- sua função (ex: "parafuso cortical", "placa de reconstrução", "haste
-- intramedular", "componente acetabular", "cage intervertebral" etc.),
-- cobrindo os ~45 padrões de nome mais comuns do grupo, validados por
-- script contra os 1.222 nomes reais extraídos do CSV original (nenhuma
-- regra com zero correspondência). Os ~3% restantes (itens de nome muito
-- específico de fabricante, sem nenhuma palavra-chave reconhecida) ficam
-- sem override e continuam usando o fallback do grupo.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63/64): conhecimento
-- geral de uso típico de implante/instrumental ortopédico, não validado por
-- nenhum profissional clínico do HUV/HMK — sem nota disso na UI (regra do
-- item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso`, sempre
-- escopado a itens do grupo `OPME — ORTOPEDICA` (via `item_grupos`/`grupos`)
-- e só onde `resumo_uso` ainda está vazio — nunca sobrescreve edição manual.
-- Não mexe em `grupos`/`item_grupos`/`item_areas`. Idempotente. A ordem dos
-- `UPDATE` importa (mais específico primeiro, catch-all por último) porque
-- cada um só grava no que ainda está vazio.

update itens set resumo_uso =
  case cod_soulmv
    when '2786' then 'Placa eletrônica de reposição pra uma secadora de ar — peça de manutenção de equipamento, não é implante nem material cirúrgico. Classificação neste grupo parece ser erro de cadastro no SoulMV; recomenda-se revisão.'
    when '5474' then 'Nome ambíguo no cadastro de origem (possivelmente ponteira descartável de caneta eletrocirúrgica) — não parece ser implante ortopédico. Recomenda-se confirmar o uso real deste código antes de considerar a descrição automática deste grupo.'
    when '6872' then 'Nome ambíguo no cadastro de origem (possivelmente ponteira descartável de caneta eletrocirúrgica) — não parece ser implante ortopédico. Recomenda-se confirmar o uso real deste código antes de considerar a descrição automática deste grupo.'
    when '7571' then 'Stent coronário (cardíaco) usado em angioplastia — não é material ortopédico. Classificado neste grupo por aparente erro de cadastro no SoulMV (Classe/Sub Classe); recomenda-se à Central de Compras revisar essa classificação, já que o item não tem relação com cirurgia ortopédica.'
    when '7907' then 'Reator de reposição pra um esterilizador de ar (equipamento de CME) — peça de manutenção, não é implante ortopédico. Mesma situação do código 2786, provável erro de classificação no SoulMV.'
    when '11740' then 'Anel de vedação (O-ring) de borracha sintética — peça de manutenção de equipamento, não é implante ortopédico. Provável erro de classificação no SoulMV.'
    when '11741' then 'Etiqueta de identificação pra um vaporizador de anestesia (equipamento de sala cirúrgica) — não é material ortopédico nem implante. Provável erro de classificação no cadastro de origem.'
    else resumo_uso
  end
where cod_soulmv in ('2786','5474','6872','7571','7907','11740','11741')
and (resumo_uso = '' or resumo_uso is null);

update itens set resumo_uso = 'Parafuso ortopédico pra osso cortical (compacto) — fixa fragmentos de fratura entre si ou prende uma placa ao osso durante a consolidação; mais usado na diáfise (parte mais densa) dos ossos longos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CORTICAL%');

update itens set resumo_uso = 'Parafuso ortopédico pra osso esponjoso (poroso), encontrado nas extremidades dos ossos longos (epífise/metáfise) — rosca mais espaçada que o parafuso cortical, própria pra fixar fraturas perto de articulações (ex: quadril, punho).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%ESPONJOSO%');

update itens set resumo_uso = 'Parafuso ortopédico canulado (oco por dentro) — inserido sobre um fio-guia já posicionado por imagem (raio-X), permitindo fixação percutânea mais precisa de fraturas (ex: colo do fêmur, escafoide).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CANULADO%');

update itens set resumo_uso = 'Parafuso de bloqueio (locking) — trava diretamente na rosca da placa, criando um conjunto de ângulo fixo entre parafuso e placa; mais usado em fraturas cominutivas (vários fragmentos) ou em osso de qualidade reduzida (ex: osteoporose).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%BLOQ%');

update itens set resumo_uso = 'Parafuso pedicular — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna vertebral junto com hastes/barras.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%PEDIC%');

update itens set resumo_uso = 'Parafuso usado em placas de fixação da coluna cervical (pescoço).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CERVICAL%');

update itens set resumo_uso = 'Parafuso usado em placas volares, mais comum na fixação de fraturas do rádio distal (punho).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%VOLAR%');

update itens set resumo_uso = 'Parafuso deslizante (tipo DHS) — permite compressão controlada ao longo do eixo da fratura conforme ela consolida; usado sobretudo em fraturas do colo/trocanter do fêmur (quadril).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%DESLIZANTE%');

update itens set resumo_uso = 'Parafuso usado pra fixar o componente acetabular (parte do quadril) numa artroplastia total de quadril.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Parafuso tampão — fecha um orifício não utilizado numa placa ou a extremidade de um parafuso/haste canulada, evitando entrada de tecido/fluido.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%TAMPAO%');

update itens set resumo_uso = 'Parafuso ortopédico — fixa fragmentos ósseos entre si ou prende uma placa/componente ao osso; o tipo de rosca, diâmetro e indicação variam conforme a região óssea e o tipo de fratura/cirurgia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%');

update itens set resumo_uso = 'Parafuso ortopédico — fixa fragmentos ósseos entre si ou prende uma placa/componente ao osso; o tipo de rosca, diâmetro e indicação variam conforme a região óssea e o tipo de fratura/cirurgia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PARFUSO%');

update itens set resumo_uso = 'Placa de fixação da coluna cervical (pescoço), fixada com parafusos nas vértebras, usada em cirurgias de artrodese ou fratura cervical.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%CERVICAL%');

update itens set resumo_uso = 'Placa usada na face anterior (volar) do rádio, principalmente em fraturas do punho (rádio distal).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%VOLAR%');

update itens set resumo_uso = 'Placa tubular — formato semicircular que se adapta ao contorno do osso, usada pra fixar fraturas de ossos longos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%TUBULAR%');

update itens set resumo_uso = 'Placa de reconstrução — mais maleável que outras placas, pode ser moldada à mão durante a cirurgia pra se adaptar a contornos ósseos irregulares (ex: pelve, mandíbula).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%RECONSTRU%');

update itens set resumo_uso = 'Placa do sistema DHS (parafuso deslizante de quadril) — fixada ao fêmur junto com o parafuso deslizante, usada em fraturas do colo/trocanter do fêmur.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%DHS%');

update itens set resumo_uso = 'Placa com ângulo fixo entre a lâmina e o corpo da placa, usada em fraturas próximas a uma articulação onde o alinhamento angular é importante (ex: fêmur proximal/distal).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%ANGULAD%');

update itens set resumo_uso = 'Placa de bloqueio (locking) — os parafusos travam diretamente na placa, criando um conjunto de ângulo fixo; mais usada em fraturas cominutivas ou osso de qualidade reduzida.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%BLOQ%');

update itens set resumo_uso = 'Placa ortopédica — fixada ao osso com parafusos pra manter fragmentos de uma fratura alinhados durante a consolidação; o formato, tamanho e número de furos variam conforme o osso e o tipo de fratura.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%');

update itens set resumo_uso = 'Placa ortopédica — fixada ao osso com parafusos pra manter fragmentos de uma fratura alinhados durante a consolidação; o formato, tamanho e número de furos variam conforme o osso e o tipo de fratura.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLA %');

update itens set resumo_uso = 'Haste intramedular — inserida dentro do canal medular do osso longo (fêmur, tíbia, úmero) pra estabilizar uma fratura, geralmente travada com parafusos nas extremidades.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%INTRAMEDULAR%');

update itens set resumo_uso = 'Haste usada numa cirurgia de revisão de prótese (quando o implante original precisa ser trocado) — alonga o componente pra se fixar em osso mais distante da região original.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%REVISAO%');

update itens set resumo_uso = 'Haste ortopédica — usada tanto como fixação interna de fratura (dentro do canal medular do osso) quanto como parte longa de uma prótese articular (quadril/joelho) que se encaixa dentro do osso; a função exata depende do contexto clínico específico do item.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%');

update itens set resumo_uso = 'Pino de Schanz — haste rosqueada que atravessa o osso e fica presa externamente a um fixador externo; usado em fraturas instáveis ou quando não é possível operar direto no local da fratura (ex: fratura exposta, politrauma).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PINO%')
  and unaccent(itens.nome) ilike unaccent('%SCHANZ%');

update itens set resumo_uso = 'Pino ortopédico — usado pra fixação temporária ou definitiva de fragmentos ósseos, isolado ou em conjunto com outros implantes (fixador externo, placa).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PINO%');

update itens set resumo_uso = 'Fio de Kirschner (fio-K) — fio metálico fino usado pra fixação temporária de fragmentos ósseos pequenos (ex: mão, pé) ou como guia pra outros implantes.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%KIRSCHNER%');

update itens set resumo_uso = 'Fio/pino de Steinmann — mais espesso que o fio de Kirschner, usado em tração esquelética (puxar o osso pra alinhar uma fratura antes da cirurgia definitiva) ou fixação com fixador externo.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%ST%');

update itens set resumo_uso = 'Fio-guia — posicionado por imagem (raio-X) pra guiar a inserção precisa de um parafuso canulado ou outro implante.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Fio maleável (cerclagem) — envolve o osso ao redor de uma fratura, como uma cinta, pra manter os fragmentos comprimidos e alinhados.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%MALEAVEL%');

update itens set resumo_uso = 'Fio metálico de uso ortopédico — a função exata (fixação, tração, guia ou cerclagem) varia conforme o tipo e a indicação específica.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%');

update itens set resumo_uso = 'Componente femoral de uma prótese articular (quadril ou joelho) — parte do implante que substitui a superfície articular do lado do fêmur.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%FEMORAL%');

update itens set resumo_uso = 'Componente tibial de uma prótese de joelho — parte do implante que substitui a superfície articular do lado da tíbia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%TIBIAL%');

update itens set resumo_uso = 'Componente acetabular de uma prótese de quadril — substitui a cavidade do quadril (acetábulo) onde a cabeça do fêmur se encaixa.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Componente cefálico de uma prótese de quadril — substitui a cabeça do fêmur, encaixa na haste femoral.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%CEFALICO%');

update itens set resumo_uso = 'Componente patelar de uma prótese de joelho — substitui a superfície articular da patela (rótula).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%PATELAR%');

update itens set resumo_uso = 'Componente glenoidal de uma prótese de ombro — substitui a cavidade glenoide (parte da escápula) onde a cabeça do úmero se encaixa.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%')
  and unaccent(itens.nome) ilike unaccent('%GLENOID%');

update itens set resumo_uso = 'Componente de uma prótese articular (quadril, joelho ou ombro) — parte específica do implante; a articulação e o lado exato variam conforme o item.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMPONENTE%');

update itens set resumo_uso = 'Componente de uma prótese articular (quadril, joelho ou ombro) — parte específica do implante; a articulação e o lado exato variam conforme o item.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COMP.%');

update itens set resumo_uso = 'Haste/componente femoral de uma prótese de quadril ou joelho — parte do implante que se fixa dentro do fêmur.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%FEMORAL%');

update itens set resumo_uso = 'Prótese articular (implante usado em artroplastia) — substitui total ou parcialmente uma articulação (quadril, joelho, ombro) danificada por fratura, artrose ou outra doença.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%');

update itens set resumo_uso = 'Haste intramedular bloqueada da linha Ortolock — mesma função de uma haste intramedular comum (estabiliza fratura de osso longo por dentro do canal medular).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ORTOLOCK%');

update itens set resumo_uso = 'Componente acetabular (ou calota metálica que reveste o acetábulo) de uma prótese de quadril — substitui a cavidade do quadril onde a cabeça do fêmur se encaixa.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ACETAB%');

update itens set resumo_uso = 'Cabeça (femoral ou bipolar) de uma prótese de quadril — parte esférica do implante que se articula com o acetábulo ou com o componente acetabular.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CABEC%');

update itens set resumo_uso = 'Platô tibial — parte de uma prótese de joelho que substitui a superfície articular superior da tíbia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%PLATO%');

update itens set resumo_uso = 'Liner (forro) de polietileno — encaixa entre os dois componentes metálicos de uma prótese articular (ex: quadril, joelho), reduzindo o atrito entre eles.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%LINER%');

update itens set resumo_uso = 'Inserto de polietileno — mesma função do liner, peça intermediária que reduz o atrito entre os componentes metálicos de uma prótese articular.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%INSERTO%');

update itens set resumo_uso = 'Componente modular de revisão de prótese de joelho (base ou calço tibial/femoral) — usado quando a prótese original precisa ser substituída, preenchendo uma perda óssea maior.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%TIBIAL%')
  and unaccent(itens.nome) ilike unaccent('%MOD%');

update itens set resumo_uso = 'Fixador externo — estrutura montada por fora do corpo, conectada ao osso por pinos/fios que atravessam a pele; usada pra estabilizar fraturas instáveis, geralmente quando não é possível ou não é indicado operar direto no local (ex: fratura exposta, infecção, politrauma).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FIXADOR%');

update itens set resumo_uso = 'Colar cervical — órtese rígida usada pra imobilizar o pescoço, em trauma (suspeita de lesão na coluna cervical) ou no pós-operatório de cirurgia cervical.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%COLAR%');

update itens set resumo_uso = 'Halo craniano — anel metálico fixado ao crânio com pinos, usado pra tração ou imobilização rígida da coluna cervical em fraturas instáveis.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%HALO%');

update itens set resumo_uso = 'Cage (gaiola) intervertebral — dispositivo implantado entre duas vértebras após a retirada do disco; mantém o espaço e favorece a fusão óssea numa artrodese da coluna.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CAGE%');

update itens set resumo_uso = 'Barra de fixação da coluna — conecta parafusos pediculares entre vértebras diferentes, formando a estrutura rígida de uma artrodese vertebral.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%BARRA%');

update itens set resumo_uso = 'Gancho de fixação da coluna — se encaixa numa vértebra (geralmente na lâmina ou no pedículo) como ponto de ancoragem alternativo ao parafuso pedicular, conectado à barra da construção.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%GANCHO%');

update itens set resumo_uso = 'Arruela — peça auxiliar usada junto com parafusos ortopédicos; distribui a pressão de aperto sobre o osso ou sobre a placa.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ARRUELA%');

update itens set resumo_uso = 'Âncora de sutura — pequeno implante fixado no osso com um fio preso, usado pra reinserir um tendão ou ligamento no local de origem (ex: cirurgia do manguito rotador, reparo ligamentar).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ANCORA%');

update itens set resumo_uso = 'Restritor de cimento — tampão colocado dentro do canal do osso antes da cimentação de uma prótese; impede que o cimento ósseo escoe além do ponto desejado.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%RESTRITOR%');

update itens set resumo_uso = 'Cimento ósseo (PMMA) — usado pra fixar um componente protético dentro do osso, preenchendo o espaço entre o implante e o osso.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CIMENTO%');

update itens set resumo_uso = 'Centralizador — peça auxiliar usada durante a cimentação de uma haste protética; mantém a haste centralizada dentro do canal ósseo até o cimento endurecer, garantindo uma camada uniforme de cimento ao redor.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CENTRALIZADOR%');

update itens set resumo_uso = 'Fresa ou broca cirúrgica — instrumento rotativo usado pra preparar o canal ósseo ou perfurar o osso antes de inserir um implante (parafuso, haste, componente protético).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FRESA%');

update itens set resumo_uso = 'Fresa ou broca cirúrgica — instrumento rotativo usado pra preparar o canal ósseo ou perfurar o osso antes de inserir um implante (parafuso, haste, componente protético).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%BROCA%');

update itens set resumo_uso = 'Cânula de artroscopia — tubo que mantém um portal de acesso aberto na articulação durante cirurgia artroscópica, por onde passam a câmera e os instrumentos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%');

update itens set resumo_uso = 'Enxerto ósseo (de origem humana, animal ou sintética) — usado pra preencher uma falha óssea ou estimular a consolidação/fusão óssea numa cirurgia ortopédica.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%ENXERTO%');

update itens set resumo_uso = 'Substituto ósseo sintético — material usado no lugar de um enxerto ósseo natural, pra preencher uma falha óssea e estimular a formação de osso novo.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%SUBSTITUTO%');

update itens set resumo_uso = 'Fita sintética usada na reconstrução de um ligamento (ex: ligamento cruzado do joelho) — serve de guia ou reforço pra fixação do novo ligamento.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%FITA%');

update itens set resumo_uso = 'Cabo de cerclagem — similar ao fio maleável, mas de maior resistência; envolve o osso ao redor de uma fratura pra manter os fragmentos comprimidos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%CABO%');

update itens set resumo_uso = 'Tala — suporte rígido ou semirrígido usado pra imobilizar um membro, geralmente de forma temporária.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%TALA%');

update itens set resumo_uso = 'Kit com o conjunto de implantes e/ou instrumental necessário pra um procedimento ortopédico específico (ex: um sistema de haste, placa ou prótese completo) — os itens individuais do kit variam conforme o sistema/fabricante.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — ORTOPEDICA'
)
and unaccent(itens.nome) ilike unaccent('%KIT%');

