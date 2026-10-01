-- Objetivo: continuação da revisão iniciada no item 63 (`OPME — ONCOLOGICA`,
-- 25 itens) — pedido do Everton por uma "revisão geral" antes do próximo
-- resultado. Cobre os outros 3 grupos pequenos de OPME que eu tinha
-- apontado como candidatos ("mesma mistura de instrumental geral sob nome
-- de grupo mais específico"): `OPME — GINECOLOGIA` (12 itens),
-- `OPME — CIRURGIA PLASTICA REPARADORA` (11 itens) e
-- `OPME — OTORRINOLARINGOLOGIA` (2 itens) — 25 itens revisados item a item,
-- nomes extraídos do CSV original.
--
-- **Diferença em relação ao item 63**: esses 3 grupos, ao contrário de
-- `OPME — ONCOLOGICA`, já eram **nomeados corretamente** como categoria
-- clínica de verdade (os itens são mesmo específicos de cirurgia
-- ginecológica/plástica reparadora/otorrino, não uma mistura disfarçada de
-- instrumental genérico) — não é o mesmo tipo de bug. O problema aqui era
-- só granularidade: a descrição de grupo ("Materiais especiais usados em
-- procedimentos cirúrgicos ginecológicos.") é genérica demais pra dizer o
-- que cada dispositivo específico faz, mesmo pedido do Everton de descrição
-- mais detalhada por item. Mesmo assim, nota importante preservada onde
-- cabe: próteses mamárias/glúteas e manipuladores uterinos são usados tanto
-- em contexto oncológico (reconstrução pós-mastectomia, histerectomia por
-- câncer) quanto em cirurgia eletiva/benigna (aumento estético, miomas) —
-- não são exclusivos de câncer, mesma ressalva do item 63.
--
-- **Outros 2 grupos de OPME avaliados nesta revisão e deliberadamente NÃO
-- alterados agora**:
--   - `OPME — UROLOGIA` (80 itens) — revisado por amostragem: são de fato
--     dispositivos urológicos específicos (cateteres duplo J, bainhas de
--     acesso ureteral, fibras de laser de litotripsia, eletrodos de
--     ressectoscópio, próteses penianas/testiculares) — grupo e descrição
--     já corretos, só não tem detalhe por item ainda. Volume grande demais
--     (80) pra revisar item a item nesta entrega; fica como candidato
--     futuro se o Everton pedir continuidade.
--   - `OPME — OPME` (140 itens, o "catch-all" genérico) — já tinha
--     `descricao_uso` vazia de propósito desde o item 56 (reconhecido como
--     genérico demais pra uma frase só) — é uma mistura real de
--     ortopedia/coluna, vascular, cardíaco e GI, a maioria sem relação
--     direta com nenhuma especialidade do HMK. Deixar sem descrição
--     (estado atual) é mais honesto que forçar uma frase genérica errada —
--     não é o mesmo problema do item 63 (lá a descrição existia e estava
--     errada; aqui simplesmente não existe). Revisão item a item desse
--     grupo também fica como trabalho futuro, é o maior e mais heterogêneo.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63): conhecimento geral
-- de uso típico de material cirúrgico/OPME, não validado por nenhum
-- profissional clínico do HUV/HMK — sem nota disso na UI (regra do item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso` (pelos 25
-- `cod_soulmv` destes 3 grupos, compartilhados entre HUV e HMK). Não mexe
-- em `grupos`/`item_grupos`/`item_areas`. Só grava onde `resumo_uso` ainda
-- está vazio — nunca sobrescreve edição manual feita depois desta
-- migration. Idempotente.

update itens set resumo_uso =
  case cod_soulmv
    -- OPME — GINECOLOGIA (12 itens: instrumental de cirurgia laparoscópica
    -- ginecológica — trocartes, manipuladores uterinos, pinça/tesoura de
    -- energia — usados em histerectomia por câncer ou por causa benigna)
    when '13662' then 'Lâmina de inserção do sistema de trocarte Marseal 5Plus (Maryland) — usada pra criar a pequena incisão inicial na parede abdominal por onde o trocarte laparoscópico é inserido.'
    when '13663' then 'Trocarte descartável de 11mm, com lâmina cortante — cria o portal de acesso laparoscópico na parede abdominal; calibre maior, usado tipicamente pro primeiro acesso, pela câmera ou pra retirada de espécime/peça cirúrgica.'
    when '13664' then 'Trocarte descartável de 5mm, com lâmina cortante — portal de acesso laparoscópico de calibre menor, usado pra instrumentos acessórios (pinças, tesoura).'
    when '14856' then 'Manipulador uterino descartável (modelo Manopla Plus, tamanho extra-grande) — instrumento inserido pela vagina durante histerectomia laparoscópica pra mobilizar e posicionar o útero, facilitando a dissecção e demarcando o fórnice vaginal pro fechamento. Usado tanto em histerectomia por câncer quanto por causa benigna (miomas, sangramento).'
    when '14857' then 'Trocarte descartável de 5mm, tipo bladeless (ponta cônica que afasta o tecido em vez de cortar) — portal de acesso laparoscópico com menor risco de lesão de vaso/órgão na hora da inserção.'
    when '14858' then 'Trocarte descartável de 10mm, tipo bladeless — mesma função do de 5mm, calibre maior pra câmera ou instrumentos maiores.'
    when '14859' then 'Pinça bipolar de energia (eletrocautério), 5mm de diâmetro, haste de 36cm — coagula e, em alguns modelos, secciona tecido/vasos durante cirurgia laparoscópica (ex: ligadura dos pedículos uterinos/ovarianos numa histerectomia).'
    when '15644' then 'Manipulador uterino VCare, tamanho médio (copo de 34mm) — mesma função dos outros manipuladores desta lista (mobiliza o útero e demarca o fórnice vaginal na histerectomia laparoscópica/robótica), modelo/fabricante diferente.'
    when '20495' then 'Trocarte descartável XCEL/Endopath, 11mm, tipo bladeless (sem lâmina) — portal de acesso laparoscópico de calibre maior, menor risco de lesão na inserção por não ter ponta cortante.'
    when '20496' then 'Trocarte descartável XCEL/Endopath, 5mm, tipo bladeless — mesma função, calibre menor pra instrumentos acessórios.'
    when '20497' then 'Tesoura laparoscópica com coagulação bipolar integrada, 5mm, 36cm, lâmina curva — corta e cauteriza tecido/vasos numa única ferramenta, numa única passagem, durante cirurgia laparoscópica.'
    when '21769' then 'Manipulador uterino descartável (modelo Manopla Plus Cirúrgico, tamanho médio) — mesma função dos demais manipuladores uterinos desta lista.'

    -- OPME — CIRURGIA PLASTICA REPARADORA (11 itens: próteses mamárias/
    -- glúteas e expansores de tecido — usados tanto em reconstrução
    -- pós-mastectomia (oncológico) quanto em cirurgia estética eletiva)
    when '8141' then 'Expansor de tecido — balão inflável de silicone implantado sob a pele, inflado aos poucos ao longo de semanas (por injeções seriadas de soro através de uma válvula) pra esticar gradualmente a pele e criar espaço suficiente pra uma reconstrução posterior (ex: reconstrução mamária em dois tempos, depois de uma mastectomia) ou outra área que precise de pele extra.'
    when '8142' then 'Par de próteses de silicone pra região glútea — implante usado em cirurgia plástica de aumento ou reconstrução dos glúteos; procedimento tipicamente estético/eletivo, não ligado a câncer.'
    when '8143' then 'Prótese mamária de silicone — implante usado tanto em reconstrução da mama após mastectomia (contexto oncológico) quanto em cirurgia estética de aumento mamário eletivo; não é exclusivo de câncer.'
    when '15854' then 'Expansor de tecido pra região mamária, volume máximo 500ml — mesma função do expansor de tecido comum (esticar a pele aos poucos por injeções seriadas), formato específico pra preparar a área mamária antes da colocação da prótese definitiva, geralmente após mastectomia.'
    when '15855' then 'Prótese mamária de silicone, linha Absolute, 400ml — implante de silicone pra reconstrução pós-mastectomia ou aumento estético; o volume é escolhido conforme a anatomia e o resultado desejado.'
    when '15856' then 'Prótese mamária de silicone, linha Absolute, 450ml — mesma função do item 15855, volume maior.'
    when '16068' then 'Prótese mamária de silicone, linha Absolute, 375ml — mesma função dos demais implantes desta linha, volume intermediário.'
    when '16213' then 'Expansor de tecido com válvula de enchimento remota, formato redondo, 400cc — mesma função dos expansores desta lista (esticar a pele aos poucos); a válvula fica numa porta separada do balão principal, acessada por agulha através da pele, o que facilita as injeções seriadas sem risco de furar o próprio expansor.'
    when '16214' then 'Expansor de tecido com válvula de enchimento remota, formato redondo, 500cc — mesma função do item 16213, volume maior.'
    when '19698' then 'Prótese mamária de silicone, linha Absolute, 225ml — mesma função dos demais implantes desta linha, volume menor (indicado conforme a anatomia da paciente).'
    when '19699' then 'Prótese mamária de silicone, linha Absolute, 275ml — mesma função dos demais implantes desta linha.'

    -- OPME — OTORRINOLARINGOLOGIA (2 itens: splints nasais pós-cirúrgicos)
    when '13167' then 'Splint (tampão) nasal externo, com fio e tubo — fixado por fora do nariz após cirurgia nasal (rinoplastia, septoplastia) pra proteger e manter o novo formato da pirâmide nasal durante a cicatrização.'
    when '13168' then 'Splint nasal interno canulado (modelo Hortron) — lâmina de silicone inserida dentro das narinas depois de cirurgia do septo nasal (septoplastia), evita aderências e sangramento enquanto cicatriza; o canal interno permite respirar pelo nariz durante a recuperação, sem precisar remover o splint na respiração.'
    else resumo_uso
  end
where cod_soulmv in (
  '13662','13663','13664','14856','14857','14858','14859','15644','20495','20496','20497','21769',
  '8141','8142','8143','15854','15855','15856','16068','16213','16214','19698','19699',
  '13167','13168'
)
and (resumo_uso = '' or resumo_uso is null);
