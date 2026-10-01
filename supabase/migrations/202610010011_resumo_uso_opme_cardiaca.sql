-- Objetivo: revisão item a item (por padrão de nome/função) do grupo
-- `OPME — CARDIACA` (156 itens reais) — continuação da revisão geral
-- (itens 64/65/66), seguindo a fila por tamanho decrescente.
--
-- **Resultado da amostragem completa**: grupo corretamente nomeado — é
-- material de cirurgia cardíaca aberta e dispositivos cardíacos
-- implantáveis (31 válvulas protéticas, 18 marcapassos/componentes, 11
-- introdutores, 9 cateteres, 8 cânulas de CEC, 7 enxertos arteriais, 6
-- anéis de anuloplastia, 6 patches de pericárdio, oxigenadores,
-- hemoconcentradores, bombas centrífugas, conjuntos de circulação
-- extracorpórea, cardioversores/CDI, endopróteses aórticas, selantes
-- cirúrgicos, coils de embolização, etc.) — bem mais variado que
-- HEMODINAMICA, mas todo item claramente de especialidade cardíaca.
--
-- **Achado de classificação, mesma família do item 65**: 2 itens
-- claramente mal classificados — um parafuso ortopédico cortical
-- autorrosqueante e uma placa ortopédica 1/3 tubular, ambos da mesma
-- família de implantes já vista (corretamente) no grupo
-- `OPME — ORTOPEDICA`. Tratados individualmente por `cod_soulmv` com texto
-- explicando que não são material cardíaco, em vez de herdar a descrição
-- genérica do grupo.
--
-- **Cobertura: 100% dos 156 itens** (as 2 anomalias incluídas), com 31
-- regras ordenadas por especificidade (ex: "ENDOPROTESE" antes do
-- catch-all que inclui "PROTESE", "CARDIOVERSOR"/"MARCAPASSO" antes do
-- catch-all de "ELETRODO", 3 subtipos de "CONJUNTO" antes do catch-all
-- genérico), cada uma batendo as palavras-chave via
-- `unaccent(...) ilike`. Validado por script de simulação contra os 156
-- nomes reais extraídos do CSV original — 0 item sem correspondência.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63/64/65/66):
-- conhecimento geral de uso típico de material de cirurgia cardíaca, não
-- validado por nenhum profissional clínico do HUV/HMK — sem nota disso na
-- UI (regra do item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso`, sempre
-- escopado a itens do grupo `OPME — CARDIACA` (via `item_grupos`/`grupos`,
-- exceto as 2 anomalias por `cod_soulmv`) e só onde `resumo_uso` ainda está
-- vazio — nunca sobrescreve edição manual. Não mexe em
-- `grupos`/`item_grupos`/`item_areas`. Idempotente.

update itens set resumo_uso =
  case cod_soulmv
    when '7505' then 'Parafuso ortopédico (cortical, autorrosqueante) — não é material cardíaco. Aparenta erro de classificação no cadastro de origem do SoulMV (mesma família de parafusos já encontrada no grupo OPME — ORTOPEDICA); recomenda-se à Central de Compras revisar essa classificação.'
    when '12713' then 'Placa ortopédica (1/3 tubular) — não é material cardíaco. Mesma situação do código 7505: aparenta erro de classificação no SoulMV (mesma família de placas do grupo OPME — ORTOPEDICA).'
    else resumo_uso
  end
where cod_soulmv in ('7505','12713')
and (resumo_uso = '' or resumo_uso is null);

update itens set resumo_uso = 'Endoprótese (stent-graft) aórtica ou torácica — tubo revestido implantado por dentro da artéria (geralmente por acesso percutâneo, sem abrir o tórax/abdome) pra tratar um aneurisma, excluindo-o da circulação sanguínea por dentro.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ENDOPROTESE%');

update itens set resumo_uso = 'Válvula cardíaca protética (biológica ou mecânica, aórtica ou mitral) — substitui uma válvula nativa danificada (por estenose, insuficiência ou outra doença). A biológica não exige anticoagulação permanente mas dura menos; a mecânica é mais durável mas exige anticoagulação pelo resto da vida.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%VALVULA%');

update itens set resumo_uso = 'Anel de anuloplastia — não substitui a válvula, só reforça/remodela o anel fibroso ao redor dela numa cirurgia de reparo valvar (plástica), geralmente da válvula mitral ou tricúspide.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ANEL%');

update itens set resumo_uso = 'Conjunto de tubos (linha arterial/venosa) da circulação extracorpórea — tubulação que conecta o paciente à máquina coração-pulmão durante uma cirurgia cardíaca com CEC (circulação extracorpórea).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%TUBOS%');

update itens set resumo_uso = 'Conjunto pra autotransfusão intraoperatória (cell saver) — recolhe, filtra e devolve ao paciente o próprio sangue perdido durante a cirurgia, reduzindo a necessidade de transfusão de banco de sangue.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%TRANSFUSAO%');

update itens set resumo_uso = 'Conjunto completo da circulação extracorpórea pediátrica/neonatal — tubulação e componentes da máquina coração-pulmão dimensionados pro volume sanguíneo menor de crianças/recém-nascidos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%')
  and unaccent(itens.nome) ilike unaccent('%CIRCULACAO%');

update itens set resumo_uso = 'Conjunto de materiais montado pra um procedimento específico de cirurgia cardíaca/circulação extracorpórea — o conteúdo exato varia conforme o procedimento.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONJUNTO%');

update itens set resumo_uso = 'Agulha de punção transseptal — atravessa o septo entre os átrios do coração (de dentro pra fora, via veia femoral) pra dar acesso ao lado esquerdo do coração em procedimentos estruturais ou de eletrofisiologia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%');

update itens set resumo_uso = 'Bainha de punção transseptal — acompanha a agulha transseptal, mantém o acesso aberto através do septo interatrial depois da punção.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Introdutor (bainha de acesso) — usado pra implantar um eletrodo de marcapasso/CDI numa veia, ou como acesso vascular durante um procedimento de hemodinâmica/eletrofisiologia cardíaca.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Cardioversor desfibrilador implantável (CDI) ou um de seus componentes (gerador, eletrodo) — dispositivo implantado que detecta arritmias ventriculares graves e aplica um choque elétrico interno pra reverter o ritmo cardíaco; pode ter função combinada de marcapasso.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CARDIOVERSOR%');

update itens set resumo_uso = 'Marcapasso cardíaco implantável (ou um de seus componentes, como o eletrodo) — dispositivo que gera estímulos elétricos pra manter o coração batendo num ritmo adequado quando o próprio sistema elétrico do coração falha (bradicardia, bloqueio); câmara única ou dupla conforme a necessidade do paciente.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%MARCAPASSO%');

update itens set resumo_uso = 'Eletrodo (cabo-eletrodo) de marcapasso ou cardioversor — fio implantado dentro ou na superfície do coração que conduz o estímulo elétrico do gerador até o músculo cardíaco, ou capta a atividade elétrica do coração.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ELETRODO%');

update itens set resumo_uso = 'Cateter usado em procedimento de cirurgia cardíaca, hemodinâmica ou eletrofisiologia — a função exata varia conforme o tipo específico.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%');

update itens set resumo_uso = 'Enxerto arterial (tubular, bifurcado ou valvado, orgânico ou inorgânico) — conduto vascular usado pra substituir ou desviar (bypass) um segmento de artéria doente, incluindo a aorta.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ENXERTO%');

update itens set resumo_uso = 'Patch (remendo) de pericárdio bovino ou material sintético — usado pra fechar ou reforçar uma abertura no coração ou num vaso sanguíneo durante a cirurgia (ex: fechamento de um septo, ampliação de uma artéria).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%PATCH%');

update itens set resumo_uso = 'Cânula de circulação extracorpórea — tubo rígido inserido numa artéria, veia ou direto no coração; conecta o paciente à máquina coração-pulmão (drenagem venosa, retorno arterial) ou entrega solução de cardioplegia que para o coração durante a cirurgia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CANULA%');

update itens set resumo_uso = 'Stent (convencional ou farmacológico) pra artéria coronária ou periférica — malha metálica expansível que mantém o vaso aberto depois de uma angioplastia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%');

update itens set resumo_uso = 'Oxigenador de membrana — componente da máquina coração-pulmão que faz a troca de gases (oxigênio/gás carbônico) no sangue do paciente durante a circulação extracorpórea, substituindo a função dos pulmões durante a cirurgia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%OXIGENADOR%');

update itens set resumo_uso = 'Shunt intracoronário temporário — pequeno tubo inserido dentro da artéria coronária durante uma cirurgia de revascularização sem circulação extracorpórea (coração batendo), mantém o sangue fluindo enquanto o cirurgião costura o enxerto.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SHUNT%');

update itens set resumo_uso = 'Hemoconcentrador de membrana — componente da circulação extracorpórea que remove excesso de água/fluido do sangue do paciente durante ou depois da cirurgia cardíaca, concentrando as células sanguíneas.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%HEMOCONCENTRADOR%');

update itens set resumo_uso = 'Selante cirúrgico biológico (cola) — aplicado sobre uma sutura ou superfície de tecido pra reforçar a vedação e reduzir sangramento/vazamento.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SELANTE%');

update itens set resumo_uso = 'Cone descartável da bomba centrífuga — peça que entra em contato com o sangue dentro da bomba centrífuga da circulação extracorpórea, bombeando o sangue sem precisar comprimir um tubo (diferente da bomba de rolete).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%FLOPUMP%');

update itens set resumo_uso = 'Conduto valvado — tubo com uma válvula embutida, usado pra reconstruir a conexão entre um ventrículo e uma grande artéria (aorta ou pulmonar) em cirurgias cardíacas complexas, incluindo correções congênitas.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%CONDUTO%');

update itens set resumo_uso = 'Bomba centrífuga — impulsiona o sangue do paciente através do circuito de circulação extracorpórea durante a cirurgia cardíaca, fazendo o papel do coração enquanto ele está parado.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%BOMBA%');

update itens set resumo_uso = 'Reservatório da circulação extracorpórea — recipiente que acumula temporariamente o sangue (venoso) ou a solução de cardioplegia antes de retornar ao paciente ou ser infundida no coração.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%RESERVAT%');

update itens set resumo_uso = 'Estabilizador de tecido cardíaco (Octopus) — fixa por sucção uma pequena área do coração batendo, imobilizando-a localmente pra permitir a sutura do enxerto numa cirurgia de revascularização sem circulação extracorpórea (coração batendo).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%OCTOPUS%');

update itens set resumo_uso = 'Adesivo cirúrgico biológico (cola, ex: BioGlue) — reforça uma sutura ou linha de grampeamento, reduzindo sangramento/vazamento em tecido cardíaco ou vascular.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%ADESIVO%');

update itens set resumo_uso = 'Ímã pra marcapasso/CDI — posicionado sobre a pele acima do dispositivo implantado pra suspender temporariamente sua função (ex: durante uma cirurgia com bisturi elétrico, que pode interferir no dispositivo).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%IMA%');

update itens set resumo_uso = 'Coils (molas) de embolização — pequenas molas metálicas implantadas dentro de um vaso sanguíneo ou estrutura anômala (ex: canal arterial persistente, fístula) pra ocluí-la.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%COILS%');

update itens set resumo_uso = 'Sistema com múltiplos componentes pra um procedimento específico de cirurgia cardíaca ou eletrofisiologia (ex: eletrodos de estimulação multi-sítio) — o conteúdo exato varia conforme o procedimento.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%SISTEMA%');

update itens set resumo_uso = 'Guia e filtro pra veia cava — dispositivo usado pra guiar e posicionar um filtro de veia cava (previne que um coágulo das pernas chegue ao pulmão).'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Membrana de pericárdio sintético (ex: Preclude/Gore-Tex) — usada pra revestir o coração após a cirurgia, reduzindo aderências numa possível reoperação.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — CARDIACA'
)
and unaccent(itens.nome) ilike unaccent('%MEMBRANA%');

