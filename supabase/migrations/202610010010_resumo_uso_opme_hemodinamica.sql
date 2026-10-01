-- Objetivo: revisão item a item (por padrão de nome/função) do grupo
-- `OPME — HEMODINAMICA` (685 itens reais, o 2º maior do catálogo) —
-- continuação da revisão geral pedida pelo Everton (item 64), seguindo a
-- fila por tamanho decrescente combinada com ele depois do item 65
-- (`OPME — ORTOPEDICA`).
--
-- **Resultado da amostragem completa (os 685 nomes reais lidos por
-- completo, via clustering automático por palavra)**: grupo **corretamente
-- nomeado e muito mais homogêneo que ORTOPEDICA** — é quase inteiramente
-- material de cateterismo cardíaco/angioplastia coronária: 408 stents
-- (226 farmacológicos/drug-eluting + o resto convencionais), 231 cateteres
-- (balão de angioplastia, guia, diagnóstico/angiográfico, extrator de
-- trombo, extensão de cateter-guia, e alguns de eletrofisiologia —
-- quadripolar/decapolar/ablação, que tecnicamente seriam de
-- `OPME — ELETROFISIOLOGIA` mas aparecem aqui no SoulMV), 26 fios-guia,
-- 12 kits introdutores, e pequenos grupos de bainha/agulha/selador
-- hemostático. **Nenhuma anomalia de classificação encontrada** (diferente
-- do achado em `OPME — ORTOPEDICA`, item 65) — todo item bate em algum
-- padrão esperado de hemodinâmica/cateterismo.
--
-- **Cobertura: 100% dos 685 itens** (nenhum ficou sem padrão reconhecido),
-- com 20 regras ordenadas (mais específica primeiro — ex: "STENT
-- FARMACOLOGICO" antes do catch-all genérico "STENT"; os subtipos de
-- cateter de eletrofisiologia antes do catch-all de "CATETER"), cada uma
-- batendo as palavras-chave via `unaccent(...) ilike` (mesmo método do
-- item 65). Validado por script de simulação contra os 685 nomes reais
-- extraídos do CSV original antes de virar SQL — todas as 20 regras têm
-- pelo menos 1 item correspondente, nenhuma órfã.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63/64/65): conhecimento
-- geral de uso típico de material de hemodinâmica, não validado por
-- nenhum profissional clínico do HUV/HMK — sem nota disso na UI (regra do
-- item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso`, sempre
-- escopado a itens do grupo `OPME — HEMODINAMICA` (via `item_grupos`/
-- `grupos`) e só onde `resumo_uso` ainda está vazio — nunca sobrescreve
-- edição manual. Não mexe em `grupos`/`item_grupos`/`item_areas`.
-- Idempotente. A ordem dos `UPDATE` importa (mais específico primeiro).

update itens set resumo_uso = 'Stent farmacológico (drug-eluting) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, mantém o vaso aberto; a superfície é revestida com medicamento que reduz o risco de reestreitamento (reestenose) do vaso depois do procedimento.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%')
  and unaccent(itens.nome) ilike unaccent('%FARMAC%');

update itens set resumo_uso = 'Stent coronário convencional (sem revestimento farmacológico) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, pra manter o vaso aberto depois da dilatação com o balão.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STENT%');

update itens set resumo_uso = 'Stent coronário convencional (sem revestimento farmacológico) — malha metálica expansível implantada numa artéria coronária estreitada durante uma angioplastia, pra manter o vaso aberto depois da dilatação com o balão.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%STNET%');

update itens set resumo_uso = 'Cateter-balão de angioplastia — inflado dentro de uma artéria coronária estreitada pra dilatá-la (abrir a passagem de sangue), usado antes e/ou depois da colocação de um stent.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%BALAO%');

update itens set resumo_uso = 'Cateter extrator de trombos (aspiração) — aspira o coágulo (trombo) de dentro de uma artéria coronária obstruída, usado em infarto agudo antes ou em vez de colocar um stent.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%EXTRATOR%');

update itens set resumo_uso = 'Cateter de extensão do cateter-guia — estende o alcance e aumenta o suporte do cateter-guia dentro da artéria, facilitando a passagem de outros instrumentos em lesões mais difíceis de alcançar.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%EXTENSAO%');

update itens set resumo_uso = 'Cateter de eletrofisiologia com 4 eletrodos (quadripolar) — usado dentro do coração pra registrar a atividade elétrica cardíaca ou estimular o coração durante um estudo eletrofisiológico.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%QUADRIPOLAR%');

update itens set resumo_uso = 'Cateter de eletrofisiologia com 10 eletrodos (decapolar) — mesma função do cateter quadripolar (registrar/estimular a atividade elétrica do coração), com mais pontos de contato ao longo do cateter.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%DECAPOLAR%');

update itens set resumo_uso = 'Cateter de ablação — usado dentro do coração pra localizar e cauterizar (ablacionar) o ponto de tecido responsável por uma arritmia cardíaca, num estudo eletrofisiológico.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%ABLA%');

update itens set resumo_uso = 'Cateter angiográfico (diagnóstico) — posicionado num vaso sanguíneo pra injetar contraste e permitir a visualização por raio-X (angiografia) antes de qualquer intervenção.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%ANGIOGRAF%');

update itens set resumo_uso = 'Cateter diagnóstico — posicionado num vaso sanguíneo pra injetar contraste e permitir a visualização por raio-X (angiografia) antes de qualquer intervenção; o formato da ponta varia conforme a artéria a ser estudada.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%DIAGNOSTICO%');

update itens set resumo_uso = 'Cateter-guia — proporciona um caminho estável da entrada arterial até a origem da artéria coronária, por dentro do qual passam o fio-guia, o cateter-balão e o stent durante a angioplastia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%')
  and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Cateter usado em procedimento de hemodinâmica/cateterismo cardíaco — a função exata (diagnóstico, intervenção ou eletrofisiologia) varia conforme o tipo e formato específico.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%CATETER%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do vaso sanguíneo, serve de caminho pra avançar cateteres, balões e stents até o local da lesão.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%FIO%');

update itens set resumo_uso = 'Fio-guia — fio fino avançado primeiro dentro do vaso sanguíneo, serve de caminho pra avançar cateteres, balões e stents até o local da lesão.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%GUIA%');

update itens set resumo_uso = 'Bainha introdutora longa — mantém um acesso estável dentro do vaso sanguíneo durante o procedimento, por onde passam cateteres e outros instrumentos.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%BAINHA%');

update itens set resumo_uso = 'Kit introdutor (bainha + dilatador, às vezes com agulha) — estabelece o acesso inicial ao vaso sanguíneo (artéria radial ou femoral, geralmente) no começo do procedimento de hemodinâmica.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%INTRODUTOR%');

update itens set resumo_uso = 'Agulha usada pra puncionar o vaso sanguíneo (ou o septo entre as câmaras do coração, no caso da agulha transseptal) no início de um procedimento de hemodinâmica/eletrofisiologia.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%AGULHA%');

update itens set resumo_uso = 'Selador hemostático vascular — fecha o local da punção na artéria ao final do procedimento, controlando o sangramento sem precisar de compressão manual prolongada.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%SELADOR%');

update itens set resumo_uso = 'Cateter-balão de angioplastia — inflado dentro de uma artéria coronária estreitada pra dilatá-la (abrir a passagem de sangue), usado antes e/ou depois da colocação de um stent.'
where (resumo_uso = '' or resumo_uso is null)
and exists (
  select 1 from item_grupos ig join grupos g on g.id = ig.grupo_id
  where ig.item_id = itens.id and g.nome = 'OPME — HEMODINAMICA'
)
and unaccent(itens.nome) ilike unaccent('%BALAO%');

