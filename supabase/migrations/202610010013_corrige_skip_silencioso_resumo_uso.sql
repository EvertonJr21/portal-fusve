-- Objetivo: CORREÇÃO DE UM BUG REAL encontrado ao auditar o próprio
-- trabalho antes de continuar a revisão geral pra mais grupos (pedido do
-- Everton: "Vamos continuar que temos muitos grupos ainda, não só OPME").
-- Antes de seguir, parei pra conferir se as migrations anteriores (itens
-- 63/64/65/67/68) realmente tinham tido efeito — e encontrei um problema
-- de ORDEM DE EXECUÇÃO entre migrations que invalidou silenciosamente
-- parte do trabalho já feito.
--
-- **Causa raiz**: as migrations `202610010002` e `202610010003` (itens 58
-- e 59, já em produção) escrevem `itens.resumo_uso` por PADRÃO DE NOME
-- genérico, cruzando TODOS os grupos do catálogo (não só OPME) — ex: todo
-- item com "STENT" no nome, todo "PLACA", todo "PARAFUSO CORTICAL", etc.
-- Como essas migrations têm número menor (rodam antes), muitos itens que
-- eu revisei individualmente nos itens 63/64/65/67/68 **já estavam com
-- `resumo_uso` preenchido** antes das minhas migrations rodarem. Como as
-- minhas migrations só escrevem quando `resumo_uso = '' or is null`
-- (pensadas pra nunca sobrescrever edição manual do Everton), elas
-- **ignoraram silenciosamente** esses itens — a atualização "rodou com
-- sucesso" no SQL Editor, mas não mudou nada pra eles, porque já não
-- estavam vazios.
--
-- **Verificado por script** (simulando a execução real de 0002→0003 contra
-- os nomes reais dos itens que eu tinha revisado manualmente nos itens
-- 63/64/65/67/68): **54 dos 133 itens individualmente revisados** caíram
-- nessa situação. Pra maioria, o texto genérico que já estava lá não é
-- "errado" (ex: grampeador cirúrgico já tinha "Usado para secção e sutura
-- simultânea de tecidos..." — correto, só menos específico que o meu
-- texto) — mas em **4 casos é ativamente enganoso**, porque eram
-- justamente os itens mal classificados que os itens 65/67 identificaram:
--   - `2786` (placa eletrônica de secadora de ar) continuava mostrando
--     "Implante metálico fixado ao osso com parafusos pra estabilizar uma
--     fratura..." — ativamente errado pra um item que não é nem material
--     médico.
--   - `12713` (placa ortopédica 1/3 tubular, mal classificada em CARDIACA)
--     e `7505` (parafuso cortical, mal classificado em CARDIACA) e `7571`
--     (stent, mal classificado em ORTOPEDICA) continuavam com a descrição
--     genérica do padrão 0002/0003 (fisicamente correta sobre o que o
--     objeto é, mas sem o aviso de que ele não pertence ao grupo onde está
--     catalogado, que era o ponto inteiro de eu ter tratado esses 4
--     separadamente).
--
-- Esta migration corrige isso **forçando a sobrescrita** (sem a condição
-- `resumo_uso = ''`, propositalmente — já sei exatamente quais 54 itens
-- preciso corrigir, risco de sobrescrever edição manual do Everton é
-- mínimo e aceitável aqui) com o texto que eu já tinha escrito nas
-- migrations `202610010007/0008/0009/0011/0012`, extraído programaticamente
-- dos próprios arquivos (não retranscrito à mão, pra não divergir do que
-- já está documentado no CLAUDE.md).
--
-- **Lição pra sessões futuras** (registrada aqui e no CLAUDE.md): sempre
-- que uma migration de `resumo_uso`/`descricao_uso` for item-específica
-- (CASE WHEN por `cod_soulmv`), ela deve rodar SEM a condição
-- `resumo_uso = ''` quando o objetivo é corrigir/ser mais específica que
-- um padrão genérico anterior — do contrário corre o risco real de ser
-- um no-op silencioso, como aconteceu aqui. A condição de "só escrever se
-- vazio" só faz sentido pras migrations de PADRÃO genérico (itens 56/58/59),
-- que devem mesmo ceder a uma descrição mais específica já existente.
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso`, pelos 54
-- `cod_soulmv` exatos listados abaixo. Não mexe em
-- `grupos`/`item_grupos`/`item_areas`. Idempotente (reescreve sempre o
-- mesmo texto final, seguro rodar de novo).

update itens set resumo_uso =
  case cod_soulmv
    when '2786' then 'Placa eletrônica de reposição pra uma secadora de ar — peça de manutenção de equipamento, não é implante nem material cirúrgico. Classificação neste grupo parece ser erro de cadastro no SoulMV; recomenda-se revisão.'
    when '5850' then 'Grampeador cirúrgico linear, carga de 60mm (cartucho verde). Dispara duas fileiras alternadas de grampos de titânio e corta o tecido entre elas numa única aplicação — usado pra seccionar e fechar simultaneamente estruturas como alças intestinais, estômago ou brônquio em cirurgias abertas ou laparoscópicas. É instrumental cirúrgico de uso geral (não exclusivo de câncer), empregado em qualquer especialidade que opera o abdome/tórax.'
    when '5851' then 'Carga (cartucho de grampos) de reposição pra grampeador linear cortante de 80mm, cor azul — a cor indica a altura do grampo, calibrada pra tecido de espessura média/espessa (ex: parede intestinal, gástrica). Encaixa no grampeador reutilizável ou semi-descartável durante a cirurgia, cada carga é de uso único.'
    when '5852' then 'Grampeador cirúrgico linear cortante, 80mm, carga azul (tecido médio/espesso) — secciona e grampeia simultaneamente estruturas tubulares maiores (ex: estômago, cólon) em cirurgia aberta. Instrumental de uso geral, usado em qualquer especialidade cirúrgica que opera o trato digestivo, não é específico de câncer.'
    when '5853' then 'Grampeador circular, 33mm de diâmetro — cria uma anastomose circular (reconexão término-terminal ou término-lateral) entre duas extremidades de um órgão tubular, mais usado em cirurgia esofágica, gástrica ou colorretal depois da retirada de um segmento do órgão (por tumor, mas também por outras doenças benignas).'
    when '5854' then 'Grampeador cirúrgico linear, carga de 30mm, cor azul (tecido médio/espesso) — secciona e grampeia tecido numa área mais curta que os modelos de 45/60/80mm, útil em espaços cirúrgicos restritos (ex: pelve, mediastino). Instrumental de uso geral.'
    when '5855' then 'Grampeador cirúrgico linear, carga de 60mm, cor verde — mesma função do item 5850 (secciona e grampeia tecido numa única aplicação), variante de cartucho/calibre de grampo diferente conforme o fabricante. Instrumental cirúrgico de uso geral, não exclusivo de câncer.'
    when '5856' then 'Cateter duplo J (stent ureteral), calibre 6Fr, 26cm — tubo flexível posicionado dentro do ureter (do rim até a bexiga) pra manter o fluxo de urina quando há obstrução ou risco de obstrução do ureter. Usado em Urologia tanto por causa oncológica (compressão do ureter por tumor) quanto por cálculo renal ou pós-cirurgia urológica — não é exclusivo de câncer.'
    when '5857' then 'Fio-guia hidrofílico, 0.035 polegadas x 150cm, ponta reta — usado pra guiar e posicionar cateteres (ex: duplo J) dentro do trato urinário durante procedimentos endourológicos ou radiológicos. Instrumental acessório de uso geral em Urologia/Radiologia Intervencionista.'
    when '7036' then 'Grampeador cirúrgico linear, carga de 45mm, cor azul (tecido médio/espesso) — secciona e grampeia tecido numa única aplicação, calibre intermediário entre os modelos de 30 e 60mm. Instrumental de uso geral em cirurgia aberta/laparoscópica.'
    when '7505' then 'Parafuso ortopédico (cortical, autorrosqueante) — não é material cardíaco. Aparenta erro de classificação no cadastro de origem do SoulMV (mesma família de parafusos já encontrada no grupo OPME — ORTOPEDICA); recomenda-se à Central de Compras revisar essa classificação.'
    when '7571' then 'Stent coronário (cardíaco) usado em angioplastia — não é material ortopédico. Classificado neste grupo por aparente erro de cadastro no SoulMV (Classe/Sub Classe); recomenda-se à Central de Compras revisar essa classificação, já que o item não tem relação com cirurgia ortopédica.'
    when '7692' then 'Grampeador circular, 25mm de diâmetro — cria anastomose circular término-terminal, calibre menor que o de 33mm, mais usado em reconexões de menor diâmetro (ex: esôfago, reto baixo) após ressecção de um segmento do órgão.'
    when '8143' then 'Prótese mamária de silicone — implante usado tanto em reconstrução da mama após mastectomia (contexto oncológico) quanto em cirurgia estética de aumento mamário eletivo; não é exclusivo de câncer.'
    when '8144' then 'Cateter venoso central de duplo lúmen para hemodiálise — inserido na veia subclávia (ou outra veia central), permite retirar o sangue do paciente, levá-lo até a máquina de hemodiálise e devolvê-lo, cada direção num lúmen separado.'
    when '8151' then 'Dilatador — alarga o trajeto da pele até a veia antes de inserir o cateter de duplo lúmen para hemodiálise, facilitando a passagem do cateter.'
    when '8152' then 'Fio-guia metálico — posicionado primeiro dentro da veia, serve de caminho pra avançar o dilatador e depois o cateter de duplo lúmen até a posição final.'
    when '9617' then 'Carga (cartucho de grampos) de reposição pra grampeador linear cortante de 60mm — item de uso único, encaixado no grampeador reutilizável durante a cirurgia pra permitir mais de uma aplicação de corte/grampeamento no mesmo procedimento.'
    when '9641' then 'Grampeador cirúrgico linear cortante, 60mm, carga azul (tecido médio/espesso) — secciona e grampeia simultaneamente um segmento de tecido tubular (ex: intestino) em cirurgia aberta ou laparoscópica. Instrumental de uso geral, calibre intermediário entre 45 e 80mm.'
    when '10500' then 'Grampeador circular, 21mm de diâmetro — o menor calibre da linha de grampeadores circulares, usado em anastomoses de diâmetro reduzido, tipicamente esofágicas ou retais baixas, após ressecção de um segmento do órgão.'
    when '12713' then 'Placa ortopédica (1/3 tubular) — não é material cardíaco. Mesma situação do código 7505: aparenta erro de classificação no SoulMV (mesma família de placas do grupo OPME — ORTOPEDICA).'
    when '13168' then 'Splint nasal interno canulado (modelo Hortron) — lâmina de silicone inserida dentro das narinas depois de cirurgia do septo nasal (septoplastia), evita aderências e sangramento enquanto cicatriza; o canal interno permite respirar pelo nariz durante a recuperação, sem precisar remover o splint na respiração.'
    when '13967' then 'Placa de fixação da coluna cervical, posicionada pela frente do pescoço (via anterior) — fixada com parafusos nas vértebras, usada em cirurgias de artrodese ou fratura cervical.'
    when '13968' then 'Parafuso de bloqueio usado em placas de fixação da coluna cervical — trava diretamente na placa, criando um conjunto de ângulo fixo.'
    when '13969' then 'Parafuso usado em placas de fixação da coluna cervical (pescoço).'
    when '13970' then 'Placa de fixação óssea (formato 1/3 de cana, 7 furos) — usada em cirurgia de coluna ou crânio pra fixar um segmento ósseo, conforme a técnica do cirurgião.'
    when '14320' then 'Parafuso pedicular poliaxial — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna; a cabeça poliaxial permite ajustar o ângulo de conexão com a haste.'
    when '14322' then 'Contraparafuso (parafuso de trava) — rosca sobre outro parafuso ou haste pra travar a posição, evitando que a construção de fixação da coluna se solte.'
    when '14856' then 'Manipulador uterino descartável (modelo Manopla Plus, tamanho extra-grande) — instrumento inserido pela vagina durante histerectomia laparoscópica pra mobilizar e posicionar o útero, facilitando a dissecção e demarcando o fórnice vaginal pro fechamento. Usado tanto em histerectomia por câncer quanto por causa benigna (miomas, sangramento).'
    when '14892' then 'Broca cirúrgica com ponta diamantada — instrumento rotativo usado pra desgastar osso com precisão (ex: no crânio ou na coluna), mais indicada perto de estruturas delicadas que uma broca convencional.'
    when '15644' then 'Manipulador uterino VCare, tamanho médio (copo de 34mm) — mesma função dos outros manipuladores desta lista (mobiliza o útero e demarca o fórnice vaginal na histerectomia laparoscópica/robótica), modelo/fabricante diferente.'
    when '15855' then 'Prótese mamária de silicone, linha Absolute, 400ml — implante de silicone pra reconstrução pós-mastectomia ou aumento estético; o volume é escolhido conforme a anatomia e o resultado desejado.'
    when '15856' then 'Prótese mamária de silicone, linha Absolute, 450ml — mesma função do item 15855, volume maior.'
    when '15938' then 'Cateter duplo J (stent ureteral) 6Fr x 26cm já acompanhado do fio-guia hidrofílico 0.035" x 150cm — kit completo pra inserção endoscópica do stent num único procedimento, sem precisar de fio-guia avulso. Mesma indicação do item 5856 (manter o fluxo de urina do rim até a bexiga em caso de obstrução ureteral de qualquer causa).'
    when '16068' then 'Prótese mamária de silicone, linha Absolute, 375ml — mesma função dos demais implantes desta linha, volume intermediário.'
    when '16949' then 'Cabo conector decapolar (10 pinos) — liga um cateter decapolar ao equipamento de registro/estimulação elétrica durante um estudo eletrofisiológico.'
    when '16952' then 'Cabo conector quadripolar (4 pinos) — liga um cateter quadripolar ao equipamento de registro/estimulação elétrica.'
    when '16966' then 'Agulha de punção transseptal — atravessa o septo entre os átrios do coração pra dar acesso ao lado esquerdo em procedimentos de eletrofisiologia/estruturais.'
    when '16967' then 'Eletrodo neutro (placa de retorno) — colado na pele do paciente, fecha o circuito elétrico do gerador de radiofrequência durante a ablação.'
    when '17179' then 'Cateter de ablação cardíaca por radiofrequência, com irrigação — mesma função do cateter de ablação comum, com um canal interno que libera soro na ponta pra resfriá-la, permitindo aplicar mais energia com segurança.'
    when '17194' then 'Parafuso pedicular poliaxial — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna; a cabeça poliaxial permite ajustar o ângulo de conexão com a haste.'
    when '17200' then 'Broca cirúrgica com ponta diamantada — instrumento rotativo usado pra desgastar osso com precisão (ex: no crânio ou na coluna), mais indicada perto de estruturas delicadas que uma broca convencional.'
    when '18237' then 'Cabo do cateter de ablação irrigado com sistema de navegação 3D — liga o cateter ao gerador de radiofrequência e ao sistema de mapeamento eletroanatômico.'
    when '18509' then 'Grampeador circular intraluminal, 29mm de diâmetro — cria anastomose circular término-terminal ou término-lateral dentro do lúmen do órgão (ex: trato digestivo), calibre intermediário, usado após ressecção de um segmento do órgão por qualquer causa (benigna ou maligna).'
    when '18510' then 'Manipulador uterino com colpótomo acoplado — instrumento inserido pela vagina na cirurgia ginecológica laparoscópica/robótica (ex: histerectomia) pra mobilizar o útero e demarcar o fórnice vaginal, facilitando a colpotomia (abertura da vagina) no fim do procedimento. Usado em Ginecologia Oncológica e também em histerectomia por causa benigna.'
    when '18556' then 'Implante mamário de silicone, 200cc — prótese usada em reconstrução mamária após mastectomia (contexto oncológico) ou em cirurgia plástica de aumento/reconstrução por outras causas. Este é o item do grupo mais diretamente ligado à especialidade oncológica (Mastologia).'
    when '19538' then 'Cabo conector decapolar (10 pinos) — liga um cateter decapolar ao equipamento de registro/estimulação elétrica durante um estudo eletrofisiológico.'
    when '19698' then 'Prótese mamária de silicone, linha Absolute, 225ml — mesma função dos demais implantes desta linha, volume menor (indicado conforme a anatomia da paciente).'
    when '19699' then 'Prótese mamária de silicone, linha Absolute, 275ml — mesma função dos demais implantes desta linha.'
    when '20792' then 'Kit de cânula pra bloqueio — usado pra localizar um nervo e injetar anestésico/medicação ao redor dele (bloqueio nervoso), guiado por estimulação elétrica.'
    when '21769' then 'Manipulador uterino descartável (modelo Manopla Plus Cirúrgico, tamanho médio) — mesma função dos demais manipuladores uterinos desta lista.'
    when '23206' then 'Broca de trepanação — perfura um orifício circular no crânio (trépano), o primeiro passo de uma craniotomia ou pra inserir um dreno ventricular.'
    when '23207' then 'Broca de trepanação — perfura um orifício circular no crânio (trépano), o primeiro passo de uma craniotomia ou pra inserir um dreno ventricular.'
    when '23243' then 'Gel hemostático — aplicado sobre uma superfície de sangramento difuso (ex: no cérebro) pra ajudar a estancar o sangue.'
    else resumo_uso
  end
where cod_soulmv in ('2786','5850','5851','5852','5853','5854','5855','5856','5857','7036','7505','7571','7692','8143','8144','8151','8152','9617','9641','10500','12713','13168','13967','13968','13969','13970','14320','14322','14856','14892','15644','15855','15856','15938','16068','16949','16952','16966','16967','17179','17194','17200','18237','18509','18510','18556','19538','19698','19699','20792','21769','23206','23207','23243');
