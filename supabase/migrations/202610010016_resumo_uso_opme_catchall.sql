-- Objetivo: fecha a revisão dentro de OPME (pedido do Everton) — grupo
-- `OPME — OPME` (140 itens), o catch-all genérico do SoulMV. Diferente de
-- todos os outros grupos `OPME —` já revisados, este **não tem
-- especialidade única** — é mesmo uma mistura heterogênea confirmada ao
-- listar os 140 itens reais: hardware ortopédico/coluna (parafusos,
-- placas, hastes, cages), vascular (cateter-balão, endopróteses, patches),
-- cardíaco (patch de pericárdio bovino, fio ósseo de esterno), GI (kit de
-- gastrostomia PEG), biópsia de mama guiada por imagem, grampeadores,
-- hemostáticos, trocartes, substitutos ósseos sintéticos, etc.
--
-- Por isso **a descrição a nível de grupo continua vazia de propósito**
-- (decisão já tomada no item 56, mantida) — mas isso não impede cobrir os
-- itens individualmente por padrão de nome/função, igual aos outros
-- grupos grandes (`OPME — ORTOPEDICA`/item 65 etc.), já que cada item TEM
-- uma função específica identificável mesmo sem o grupo ter uma
-- especialidade única.
--
-- **Cobertura: 100% dos 140 itens**, usando sobretudo os mesmos textos já
-- validados nos outros grupos `OPME —` (parafuso/placa/haste ortopédicos,
-- cateter-balão/endoprótese/bainha vasculares, trocartes, grampeador/
-- carga, hemostáticos) — reaproveitados porque são literalmente o mesmo
-- tipo de dispositivo, só catalogado neste grupo "sem categoria" em vez do
-- grupo de especialidade correspondente. Adicionados ~15 textos novos pra
-- conceitos que não apareceram nos outros grupos (hidroxiapatita/Aktibone,
-- serra de osteotomia, trefina, kit de gastrostomia PEG, cateter Celsite
-- implantável, fio de marcação de mama/Kopans, endobutton, kit de dreno a
-- vácuo, válvula hemostática, eletrodo laríngeo pra monitorização de
-- nervo).
--
-- **8 itens genuinamente não identificáveis com confiança** (códigos
-- 16865-16869, 22172, 22173, 22175 — ponteira/ponta/plenum/suporte/cânulas
-- de um mesmo bloco sequencial de códigos, aparentando ser peças de um kit
-- de biópsia/marcação de mama de marca específica, mas sem nome comercial
-- reconhecível o suficiente pra descrever a função exata) — tratados com
-- texto honesto explicando a limitação, em vez de inventar uma descrição
-- específica sem base. Mesmo princípio já usado no código `16960` ("UND",
-- item 68) e no código `18247` (cateter de ablação cardíaca mal
-- classificado aqui, item 65/67/68 — não achado aqui porque este grupo não
-- tem uma única especialidade de referência pra flagar "não pertence").
--
-- Validado por script: 0 item sem correspondência contra os 140 nomes
-- reais extraídos do CSV original (a lista exata de condições gerada,
-- não uma reconstrução manual).
--
-- **Lição do item 69 aplicada desde o início**: as regras de padrão rodam
-- SEM a condição `resumo_uso = ''` — sobrescrevem direto, escopadas só por
-- `exists (... g.nome = 'OPME — OPME')`.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61 a 68): conhecimento geral
-- de uso típico de material clínico, não validado por nenhum profissional
-- do HUV/HMK — sem nota disso na UI (regra do item 57).
--
-- Impacto: só `UPDATE` em `itens.resumo_uso`. Não mexe em
-- `grupos`/`item_grupos`/`item_areas`. Idempotente.

update itens set resumo_uso =
  case cod_soulmv
    when '16865' then 'Fio-guia inicial de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo), usado pra iniciar o acesso por punção — detalhe exato não identificável com confiança só pelo nome.'
    when '16866' then 'Cânula intermediária de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo), usada pra acesso durante a punção — detalhe exato do passo a passo não identificável com confiança só pelo nome.'
    when '16867' then 'Cânula dilatadora de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo) — dilata o trajeto de acesso antes da coleta de material; detalhe exato não identificável com confiança só pelo nome.'
    when '16868' then 'Trefina (instrumento cilíndrico cortante) de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo) — coleta uma amostra de tecido; detalhe exato não identificável com confiança só pelo nome.'
    when '16869' then 'Suporte auxiliar de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo) — função exata não identificável com confiança só pelo nome; recomenda-se confirmar com o fabricante ou protocolo clínico.'
    when '22172' then 'Guia de um sistema de marca específica (nome comercial no cadastro) — função exata não identificável com confiança só pelo nome; recomenda-se confirmar com o fabricante antes de considerar esta descrição definitiva.'
    when '22173' then 'Ponteira de um sistema cirúrgico de marca específica (nome comercial no cadastro) — função exata não identificável com confiança só pelo nome. Parece fazer parte de um kit de biópsia/marcação de mama guiada por imagem (mesmo bloco de códigos de outros itens deste grupo); recomenda-se confirmar com o fabricante ou protocolo clínico antes de considerar esta descrição definitiva.'
    when '22175' then 'Ponta de um equipamento cirúrgico de marca específica (possivelmente bisturi ultrassônico/piezoelétrico) — função exata não identificável com confiança só pelo nome; recomenda-se confirmar com o fabricante antes de considerar esta descrição definitiva.'
    else resumo_uso
  end
where cod_soulmv in ('16865','16866','16867','16868','16869','22172','22173','22175');

update itens set resumo_uso = 'Cateter-balão de angioplastia — inflado dentro de um vaso sanguíneo estreitado pra dilatá-lo (abrir a passagem de sangue).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Endoprótese (stent-graft) aórtica/ilíaca — tubo revestido implantado por dentro da artéria, geralmente por acesso percutâneo, pra tratar um aneurisma, excluindo-o da circulação sanguínea por dentro.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%ENDOPROTESE%');

update itens set resumo_uso = 'Patch (remendo) de material inorgânico (Teflon/politetrafluoretileno) — usado pra reparar ou ampliar a parede de um vaso sanguíneo durante cirurgia vascular.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PATCH%');

update itens set resumo_uso = 'Patch biológico de pericárdio bovino — tecido processado usado pra reparar ou reconstruir uma estrutura cardíaca ou vascular durante a cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%PERICARDIO%');

update itens set resumo_uso = 'Prótese peniana inflável — dispositivo hidráulico implantado nos corpos cavernosos pra tratamento cirúrgico da disfunção erétil; permite ereção sob comando ao bombear líquido pra dentro dos cilindros.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%PENIANA%');

update itens set resumo_uso = 'Prótese mamária de silicone — implante usado tanto em reconstrução da mama após mastectomia quanto em cirurgia estética de aumento mamário eletivo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PLANTE%')
  and unaccent(itens.nome) ilike unaccent('%MAMA%');

update itens set resumo_uso = 'Implante interespinhoso — colocado entre os processos espinhosos de duas vértebras pra aliviar a compressão nervosa (ex: estenose do canal vertebral), sem precisar de fusão óssea completa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%IMPLANTE%')
  and unaccent(itens.nome) ilike unaccent('%INTERESPINHAL%');

update itens set resumo_uso = 'Parafuso ortopédico pra osso cortical (compacto) — fixa fragmentos de fratura entre si ou prende uma placa ao osso durante a consolidação.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CORTICAL%');

update itens set resumo_uso = 'Parafuso ortopédico pra osso esponjoso (poroso), encontrado nas extremidades dos ossos longos — rosca mais espaçada que o parafuso cortical.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%ESPONJOSO%');

update itens set resumo_uso = 'Parafuso ortopédico canulado (oco por dentro) — inserido sobre um fio-guia já posicionado por imagem, permitindo fixação percutânea mais precisa de fraturas.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%CANULADO%');

update itens set resumo_uso = 'Parafuso de bloqueio (locking) — trava diretamente na rosca da placa, criando um conjunto de ângulo fixo entre parafuso e placa.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%BLOQ%');

update itens set resumo_uso = 'Parafuso pedicular — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna vertebral junto com hastes/barras.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%PEDIC%');

update itens set resumo_uso = 'Mini parafuso ortopédico (sistema de bloqueio de pequeno porte) — fixa fragmentos ósseos pequenos (ex: mão, pé, face).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%')
  and unaccent(itens.nome) ilike unaccent('%VERSALOCK%');

update itens set resumo_uso = 'Parafuso ortopédico — fixa fragmentos ósseos entre si ou prende uma placa/componente ao osso; o tipo de rosca, diâmetro e indicação variam conforme a região óssea e o tipo de fratura/cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PARAFUSO%');

update itens set resumo_uso = 'Placa de fixação da coluna cervical, fixada com parafusos nas vértebras, usada em cirurgias de artrodese ou fratura cervical.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%')
  and unaccent(itens.nome) ilike unaccent('%CERVICAL%');

update itens set resumo_uso = 'Kit de miniplacas pra fratura — conjunto de placas pequenas e parafusos correspondentes, usado pra fixar fraturas de ossos pequenos (ex: face, mão, pé).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%MINIPLACAS%');

update itens set resumo_uso = 'Placa ortopédica — fixada ao osso com parafusos pra manter fragmentos de uma fratura alinhados durante a consolidação; o formato, tamanho e número de furos variam conforme o osso e o tipo de fratura.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PLACA%');

update itens set resumo_uso = 'Haste intramedular — inserida dentro do canal medular do osso longo pra estabilizar uma fratura, geralmente travada com parafusos nas extremidades.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%INTRAMEDULAR%');

update itens set resumo_uso = 'Haste canulada para a tíbia — inserida sobre um fio-guia dentro do canal medular da tíbia pra estabilizar uma fratura.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%')
  and unaccent(itens.nome) ilike unaccent('%TIBIAL%');

update itens set resumo_uso = 'Haste ortopédica — usada tanto como fixação interna de fratura (dentro do canal medular do osso) quanto como parte de uma prótese articular; a função exata depende do contexto clínico específico do item.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HASTE%');

update itens set resumo_uso = 'Fio de Kirschner (fio-K) — fio metálico fino usado pra fixação temporária de fragmentos ósseos pequenos ou como guia pra outros implantes.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%KIRSCH%');

update itens set resumo_uso = 'Fio de cerclagem — envolve o osso ao redor de uma fratura, como uma cinta, pra manter os fragmentos comprimidos e alinhados.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%CERCLAGEM%');

update itens set resumo_uso = 'Fio ósseo — usado pra amarrar ou aproximar fragmentos ósseos durante uma cirurgia (ex: fechamento do esterno após cirurgia cardíaca, fixação de fraturas pequenas).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%OSSEO%');

update itens set resumo_uso = 'Fio de marcação pré-cirúrgica (fio de Kopans) — posicionado dentro de uma lesão da mama antes da cirurgia, guiado por imagem, pra marcar exatamente onde o cirurgião deve retirar o tecido (nódulo não palpável).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%KOPANS%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do corpo (vaso, osso ou trajeto de punção), serve de caminho pra avançar outros instrumentos até o local do procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Grampeador cirúrgico (linear, circular ou endoscópico) — dispara grampos de titânio pra seccionar e/ou fechar tecido numa única aplicação, usado em diversas cirurgias (ex: ressecções intestinais, bariátrica).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%GRAMPEADOR%');

update itens set resumo_uso = 'Carga (cartucho de grampos) de reposição pra grampeador cirúrgico — item de uso único, encaixado no grampeador durante a cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CARGA%');

update itens set resumo_uso = 'Trocarte — cria e mantém um portal de acesso na parede do corpo (abdome, tórax) pra entrada de câmera/instrumentos em cirurgia laparoscópica/toracoscópica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%TROCA%');

update itens set resumo_uso = 'Trocarte (linha VersaOne) — cria e mantém um portal de acesso na parede do corpo pra entrada de câmera/instrumentos em cirurgia laparoscópica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%VERSAONE%');

update itens set resumo_uso = 'Cânula de acesso laparoscópico com trocarte — cria e mantém um portal de acesso na parede do corpo pra entrada de câmera/instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%')
  and unaccent(itens.nome) ilike unaccent('%TROCATER%');

update itens set resumo_uso = 'Kit de cânula pra extração de cálculo — usado pra capturar e retirar fragmentos de cálculo urinário durante um procedimento endoscópico.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%')
  and unaccent(itens.nome) ilike unaccent('%CALCULO%');

update itens set resumo_uso = 'Kit de cânula pra estimulação nervosa recorrente — usado pra monitorar/estimular um nervo durante a cirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%')
  and unaccent(itens.nome) ilike unaccent('%ESTIMULACAO%');

update itens set resumo_uso = 'Kit de cânula com eletrodos pra monitorização dos nervos faciais — usado durante cirurgias próximas ao trajeto do nervo facial (ex: parótida), detecta se o nervo está sendo estimulado/lesado.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%')
  and unaccent(itens.nome) ilike unaccent('%NERVOS%');

update itens set resumo_uso = 'Reservatório do sistema de terapia por pressão negativa (VAC) — coleta o fluido aspirado de uma ferida complexa conectada ao aparelho de sucção contínua.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%RESERVATORIO%');

update itens set resumo_uso = 'Espuma do sistema de terapia por pressão negativa (VAC) — colocada sobre a ferida e conectada a um aparelho que aplica sucção contínua, ajudando a fechar feridas complexas.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%ESPUMA%');

update itens set resumo_uso = 'Serra cirúrgica (recíproca/oscilatória) ou perfuratriz/broca motorizada — corta ou perfura osso durante uma osteotomia (corte cirúrgico do osso pra correção de alinhamento).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%SERRA%');

update itens set resumo_uso = 'Trefina — instrumento cilíndrico cortante usado pra retirar uma amostra ou um núcleo de tecido/osso (ex: biópsia óssea, preparo de enxerto, trepanação craniana).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%TREFINA%');

update itens set resumo_uso = 'Hidroxiapatita — material sintético à base de cálcio usado como substituto de enxerto ósseo; preenche uma falha óssea e estimula a formação de osso novo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HIDROXIAPATITA%');

update itens set resumo_uso = 'Kit de eletrodo laríngeo (tubo endotraqueal especial com eletrodos) — usado pra monitorar o nervo laríngeo durante cirurgia de tireoide/pescoço, detectando se o nervo está sendo estimulado/lesado.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%KIT%')
  and unaccent(itens.nome) ilike unaccent('%LARINGE%');

update itens set resumo_uso = 'Kit de remoção de parafusos — conjunto de instrumentos (chaves, extratores) usado pra retirar um parafuso ortopédico já implantado, numa cirurgia de retirada de material de síntese.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%KIT%')
  and unaccent(itens.nome) ilike unaccent('%REMOCAO%');

update itens set resumo_uso = 'Kit introdutor (bainha + dilatador) — estabelece o acesso inicial a um vaso sanguíneo (artéria radial ou femoral) no começo de um procedimento vascular.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%KIT%')
  and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Kit para gastrostomia endoscópica percutânea (PEG) — sistema usado pra colocar uma sonda de alimentação diretamente no estômago através da pele, guiado por endoscopia, pra pacientes que não conseguem se alimentar pela boca.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%GASTROSTOMIA%');

update itens set resumo_uso = 'Válvula hemostática (tipo Y) — acoplada a uma bainha introdutora, permite a passagem de instrumentos (fios, cateteres) sem deixar sangue ou ar escaparem pelo acesso.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%VALVULA%')
  and unaccent(itens.nome) ilike unaccent('%HEMOSTATICA%');

update itens set resumo_uso = 'Tesoura cirúrgica (ou pinça/tesoura ultrassônica) — corta tecido durante a cirurgia; o modelo ultrassônico também cauteriza com energia vibracional.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%TESOURA%');

update itens set resumo_uso = 'Pinça cirúrgica — usada pra preensão, dissecção ou hemostasia de tecido durante a cirurgia; a função exata varia conforme o formato.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%PINCA%');

update itens set resumo_uso = 'Agente hemostático (esponja, pó ou gel) — aplicado sobre uma superfície de sangramento durante a cirurgia pra ajudar a estancar o sangue.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HEMOSTATICO%');

update itens set resumo_uso = 'Esponja hemostática absorvível (Surgispon) — aplicada sobre uma superfície de sangramento, absorvida pelo corpo com o tempo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%SURGISPON%');

update itens set resumo_uso = 'Selador cirúrgico (cola biológica ou vascular) — reforça uma sutura ou fecha um ponto de punção, reduzindo sangramento/vazamento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%SELADOR%');

update itens set resumo_uso = 'Clipe de ligadura Hem-o-lok — ocluiu com segurança vasos sanguíneos ou ductos antes de seccioná-los, numa cirurgia laparoscópica; dispositivo de hemostasia mecânica universal, não exclusivo de uma especialidade.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%HEMOLOCK%');

update itens set resumo_uso = 'Fresa cirúrgica — instrumento rotativo usado pra preparar o canal ósseo ou perfurar/desgastar o osso antes de inserir um implante.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%FRESA%');

update itens set resumo_uso = 'Enxerto ósseo (granulado) — usado pra preencher uma falha óssea ou estimular a consolidação/fusão óssea numa cirurgia ortopédica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%ENXERTO%');

update itens set resumo_uso = 'Broca de trepanação — perfura um orifício circular no osso (ex: crânio), usada no início de uma craniotomia ou pra inserir outro implante/dreno.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%BROCA%');

update itens set resumo_uso = 'Cage (gaiola) intervertebral cervical — implantado entre duas vértebras do pescoço depois da retirada do disco, mantém o espaço e favorece a fusão óssea.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CAGE%');

update itens set resumo_uso = 'Endobutton — pequena placa usada pra fixar um enxerto de ligamento (ex: ligamento cruzado do joelho) do lado de fora do osso, ancorando o enxerto durante a cicatrização.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%ENDOBOTON%');

update itens set resumo_uso = 'Componente modular (platô ou base tibial) de revisão de prótese de joelho — usado quando a prótese original precisa ser substituída, preenchendo uma perda óssea maior.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%TIBIAL%')
  and unaccent(itens.nome) ilike unaccent('%MOD%');

update itens set resumo_uso = 'Cateter de longa permanência totalmente implantável (tipo port-a-cath/Celsite) — fica sob a pele, usado pra aplicar quimioterapia ou outras medicações repetidas vezes sem puncionar uma veia nova a cada sessão.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CELSITE%');

update itens set resumo_uso = 'Kit de dreno a vácuo — remove fluido/sangue acumulado numa cavidade ou ferida cirúrgica por sucção contínua.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%DRENOSET%');

update itens set resumo_uso = 'Substituto ósseo sintético granulado (Aktibone) — preenche uma falha óssea e estimula a formação de osso novo, alternativa ao enxerto ósseo natural.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%AKTIBONE%');

update itens set resumo_uso = 'Cateter angiográfico tipo pigtail — ponta enrolada que distribui o contraste de forma mais uniforme, usado em exames de imagem (angiografia) de vasos de maior calibre (ex: aorta).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%PIG%');

update itens set resumo_uso = 'Cateter angiográfico (diagnóstico) — posicionado num vaso sanguíneo pra injetar contraste e permitir a visualização por raio-X (angiografia) antes de qualquer intervenção.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%ANGIOGRAF%');

update itens set resumo_uso = 'Bainha introdutora hidrofílica — mantém um acesso estável dentro do vaso sanguíneo durante o procedimento, por onde passam cateteres e outros instrumentos; o revestimento hidrofílico reduz o atrito na inserção.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Introdutor (bainha de acesso) — estabelece o acesso inicial a um vaso sanguíneo no começo de um procedimento vascular/de hemodinâmica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Cateter de dilatação — usado pra alargar um trecho estreitado de um vaso ou trajeto durante o procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — OPME'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%DILATACAO%');

