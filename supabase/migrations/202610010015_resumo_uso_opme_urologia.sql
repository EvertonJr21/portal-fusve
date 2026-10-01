-- Objetivo: completa a revisão dentro de OPME (pedido do Everton: "terminar
-- o que falta em OPME" antes de ir pros grupos fora de OPME) — revisão do
-- grupo `OPME — UROLOGIA` (80 itens), que no item 64 só tinha sido
-- amostrado (confirmado correto, mas sem cobertura item a item).
--
-- **Resultado**: grupo corretamente nomeado — material de endourologia/
-- litotripsia (cateteres duplo J, bainhas de acesso ureteral, cestas de
-- cálculo, fibras de laser Holmium, eletrodos e alças de ressectoscópio
-- pra RTU, evacuador de bexiga, próteses peniana/testicular, kits de
-- nefrostomia/HoLEP) — mesmo padrão dos outros grupos `OPME —` já
-- revisados, não é billing bucket disfarçado como `OPME — ONCOLOGICA`.
--
-- **1 anomalia real encontrada** (mesma classe dos itens 65/67): código
-- `18247` ("CAT ABLAC CARD P/RADIOF FIREMAGIC...") é um cateter de
-- ablação cardíaca — mesma família de item já vista corretamente
-- classificada em `OPME — ELETROFISIOLOGIA` — não tem nenhuma relação com
-- urologia. Tratado à parte, com nota recomendando revisão do cadastro.
--
-- **Cobertura: 100% dos 80 itens** (a anomalia incluída), 31 regras
-- ordenadas por especificidade, validadas por script contra os nomes reais
-- extraídos do CSV original — 0 item sem correspondência.
--
-- **Lição do item 69 já aplicada aqui desde o início**: as regras de
-- padrão desta migration rodam SEM a condição `resumo_uso = ''` —
-- sobrescrevem direto, escopadas só por `exists (... g.nome = 'OPME —
-- UROLOGIA')` — exatamente pra não cair no mesmo bug de skip silencioso
-- que afetou ORTOPEDICA/HEMODINAMICA/CARDIACA (itens 65/66/67, corrigido
-- no item 69). Só a anomalia (`18247`) mantém a guarda de campo vazio, já
-- que é uma correção pontual por `cod_soulmv`, não um padrão amplo.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63/64/65/66/67/68):
-- conhecimento geral de uso típico de material urológico, não validado por
-- nenhum profissional clínico do HUV/HMK — sem nota disso na UI (regra do
-- item 57).
--
-- Impacto: só `UPDATE` em `itens.resumo_uso`, sempre escopado ao grupo
-- `OPME — UROLOGIA` (via `item_grupos`/`grupos`), exceto a anomalia por
-- `cod_soulmv`. Não mexe em `grupos`/`item_grupos`/`item_areas`.
-- Idempotente (reescreve sempre o mesmo texto final).

update itens set resumo_uso =
  case cod_soulmv
    when '18247' then 'Cateter de ablação cardíaca por radiofrequência — não é material urológico. Aparenta erro de classificação no cadastro de origem do SoulMV (mesma família de cateteres já encontrada no grupo OPME — ELETROFISIOLOGIA); recomenda-se à Central de Compras revisar essa classificação.'
    else resumo_uso
  end
where cod_soulmv in ('18247')
and (resumo_uso = '' or resumo_uso is null);

update itens set resumo_uso = 'Prótese peniana maleável (par de cilindros implantados nos corpos cavernosos) — tratamento cirúrgico da disfunção erétil quando outros tratamentos não funcionam.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%PENIANA%');

update itens set resumo_uso = 'Prótese testicular de gel de silicone — implante estético/reconstrutivo, usado após a retirada cirúrgica de um testículo (ex: por câncer, trauma ou torção).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%PROTESE%')
  and unaccent(itens.nome) ilike unaccent('%TESTICULAR%');

update itens set resumo_uso = 'Cateter duplo J (stent ureteral) — tubo flexível posicionado dentro do ureter, do rim até a bexiga, pra manter o canal aberto e desobstruir o fluxo de urina quando há obstrução (cálculo, tumor, estreitamento ou pós-cirurgia).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%DUPLO%')
  and unaccent(itens.nome) ilike unaccent('%J%');

update itens set resumo_uso = 'Bainha de acesso ureteral — dilata e mantém aberto o trajeto do ureter, permitindo a passagem repetida de instrumentos (ureteroscópio, cesta de cálculo, fibra de laser) durante o procedimento, sem traumatizar o ureter a cada passagem.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Cesta de captura de cálculo (stone basket) — abre dentro do ureter ou rim, envolve um fragmento de cálculo urinário e o retira por tração, durante uma ureteroscopia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%CESTA%');

update itens set resumo_uso = 'Cesta de captura de cálculo (stone basket) — abre dentro do ureter ou rim, envolve um fragmento de cálculo urinário e o retira por tração, durante uma ureteroscopia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%STONE%');

update itens set resumo_uso = 'Cesta de captura de cálculo (stone basket), modelo sem ponta rígida (tipless) — mesma função das demais cestas, desenhada pra reduzir o risco de lesão no ureter.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%TIPLESS%');

update itens set resumo_uso = 'Fibra óptica a laser (Holmium ou similar) — conduz a energia do laser até a ponta, dentro do rim/ureter, pra fragmentar um cálculo urinário em pedaços pequenos o suficiente pra serem eliminados ou retirados.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%FIBRA%');

update itens set resumo_uso = 'Sonda/extrator de cálculo — instrumento usado pra capturar e retirar fragmentos de cálculo urinário do rim ou ureter durante uma endoscopia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%EXTRATOR%');

update itens set resumo_uso = 'Sonda dilatadora (Amplatz) — alarga progressivamente o trajeto de acesso ao rim antes de um procedimento percutâneo (ex: nefrolitotripsia).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%SONDA%')
  and unaccent(itens.nome) ilike unaccent('%DILATADORA%');

update itens set resumo_uso = 'Pinça tipo tridente (grasper) — usada por via endoscópica pra segurar e retirar um fragmento de cálculo ou tecido.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%PINCA%')
  and unaccent(itens.nome) ilike unaccent('%TRIDENTE%');

update itens set resumo_uso = 'Cateter-balão de dilatação ureteral — inflado dentro do ureter pra alargar um trecho estreitado (estenose), facilitando a passagem de outros instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Cateter-balão de dilatação ureteral — inflado dentro do ureter pra alargar um trecho estreitado (estenose), facilitando a passagem de outros instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%DILATADOR%')
  and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Cateter-balão de dilatação ureteral — inflado dentro do ureter pra alargar um trecho estreitado (estenose), facilitando a passagem de outros instrumentos.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%BALAO%')
  and unaccent(itens.nome) ilike unaccent('%DILATACAO%');

update itens set resumo_uso = 'Cateter ureteral/uretral — usado pra drenagem de urina, dilatação do canal ou como parte de um sistema de introdução de outros instrumentos até o rim/ureter; a função exata varia conforme o modelo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%URET%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do trato urinário, serve de caminho pra avançar cateteres, bainhas ou outros instrumentos até o rim/ureter.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Taxa de utilização de equipamento reutilizável do centro cirúrgico (litotridor, laser, cistoscópio) — não é um material implantável ou descartável, é a cobrança pelo uso do aparelho durante o procedimento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%TAXA%');

update itens set resumo_uso = 'Kit dilatador renal — conjunto de dilatadores progressivos usado pra criar o trajeto de acesso ao rim num procedimento percutâneo (ex: nefrolitotripsia).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%KIT%')
  and unaccent(itens.nome) ilike unaccent('%DILATADOR%');

update itens set resumo_uso = 'Kit de nefrostomia percutânea — conjunto de materiais pra colocar um dreno diretamente no rim através da pele, quando a urina não consegue passar pelo caminho normal (ureter obstruído).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%NEFROSTOMIA%');

update itens set resumo_uso = 'Kit de nefrostomia percutânea — conjunto de materiais pra colocar um dreno diretamente no rim através da pele, quando a urina não consegue passar pelo caminho normal (ureter obstruído).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%NEUFROSTOMIA%');

update itens set resumo_uso = 'Kit para cirurgia HoLEP (enucleação prostática a laser) — conjunto de materiais específicos desse procedimento de remoção do tecido prostático obstrutivo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%KIT%')
  and unaccent(itens.nome) ilike unaccent('%HOLEP%');

update itens set resumo_uso = 'Evacuador de bexiga (tipo Ellik) — lava e aspira fragmentos de tecido ou coágulos de dentro da bexiga, geralmente depois de uma ressecção transuretral da próstata (RTU).'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%EVACUADOR%');

update itens set resumo_uso = 'Eletrodo de ressectoscópio (RTU) — corta e cauteriza tecido da próstata ou da bexiga por eletrocirurgia, acoplado ao ressectoscópio.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%')
  and unaccent(itens.nome) ilike unaccent('%TURP%');

update itens set resumo_uso = 'Eletrodo tipo faca de ressectoscópio — corta tecido da próstata ou da bexiga por eletrocirurgia.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%')
  and unaccent(itens.nome) ilike unaccent('%FACA%');

update itens set resumo_uso = 'Eletrodo monopolar de ressectoscópio — corta e cauteriza tecido durante uma ressecção transuretral (RTU), usando uma única via de corrente elétrica que retorna por uma placa na pele do paciente.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%')
  and unaccent(itens.nome) ilike unaccent('%MONOPOLAR%');

update itens set resumo_uso = 'Eletrodo de ressectoscópio — corta/cauteriza tecido da próstata ou bexiga por eletrocirurgia durante uma ressecção transuretral; o formato (faca, bola, alça) varia conforme a técnica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%');

update itens set resumo_uso = 'Cânula de litotripsia por ultrassom — fragmenta um cálculo urinário usando vibração ultrassônica, geralmente combinada com aspiração dos fragmentos, num procedimento percutâneo.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%')
  and unaccent(itens.nome) ilike unaccent('%ULTRASSOM%');

update itens set resumo_uso = 'Alça de ressecção do ressectoscópio — corta e cauteriza tecido da próstata ou bexiga durante uma ressecção transuretral (RTU); monopolar ou bipolar conforme o sistema do equipamento.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%ALCA%');

update itens set resumo_uso = 'Bisturi elétrico (monopolar, bipolar ou com pinça ultrassônica) — corta e cauteriza tecido durante a cirurgia por eletrocirurgia ou energia ultrassônica.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%BISTURI%');

update itens set resumo_uso = 'Agulha de Chiba — agulha longa e fina usada pra puncionar o rim pela pele (acesso percutâneo) guiada por imagem, primeiro passo de uma nefrostomia ou nefrolitotripsia percutânea.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%')
  and unaccent(itens.nome) ilike unaccent('%CHIBA%');

update itens set resumo_uso = 'Agulha usada em procedimento urológico — função exata (punção percutânea, acesso vascular) varia conforme o tipo e a indicação.'
where exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — UROLOGIA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%');

