-- Objetivo: corrigir descrições de uso genéricas/erradas herdadas do grupo
-- `OPME — ONCOLOGICA` (item 56), achado real reportado pelo Everton duas
-- vezes agora (mesma classe de bug do item 59, achado numa área diferente):
-- "HEMOLOCK ROXO - VENDA" aparecia com "Como é usado": "Materiais especiais
-- usados em procedimentos cirúrgicos oncológicos" e a lista de áreas dava a
-- entender que é um material exclusivo de cirurgia oncológica — na
-- realidade clínica, Hem-o-lok é um clipe de ligadura hemostática de
-- polímero **universal**, usado em praticamente qualquer cirurgia
-- laparoscópica (colecistectomia, apendicectomia, bariátrica, hérnia),
-- benigna ou maligna, não é exclusivo de câncer.
--
-- **Causa raiz, mais ampla que esse item**: `OPME — ONCOLOGICA` no SoulMV
-- não é uma categoria clínica ("só serve pra tratar câncer") — é uma
-- **categoria de faturamento/OPME** do hospital, usada pro serviço de
-- oncologia cobrar materiais especiais, que na prática reúne sobretudo
-- **instrumental cirúrgico de uso geral** (grampeadores, clipes
-- hemostáticos, trocartes, cateter ureteral duplo J) que só calham de ser
-- comprados/faturados sob esse código quando usados numa cirurgia do
-- serviço de oncologia — não porque o material em si seja especializado em
-- câncer. Confirmado revisando os 25 itens reais do grupo (nenhum é
-- implante oncológico de verdade, exceto o implante mamário de silicone,
-- usado em reconstrução pós-mastectomia).
--
-- Pedido explícito do Everton: "Eu já havia feito o comando para uma
-- revisão completa dos materiais e uma descrição mais específica, não
-- precisa nem ser tão resumida, temos espaço para a escrita ali e isso
-- agregaria muito" — por isso os textos abaixo são mais longos e
-- específicos por item (o que o dispositivo é e faz clinicamente), não um
-- resumo genérico de 1 frase reaproveitado do grupo. Como o grupo inteiro
-- tem só 25 itens (confirmado contra o CSV original), deu pra revisar item
-- a item em vez de só por padrão de nome.
--
-- Também corrige `grupos.descricao_uso` do próprio grupo (item 56), que
-- continua existindo como fallback pra item sem resumo próprio, mas agora
-- com um texto honesto sobre o que o grupo realmente é (categoria de
-- faturamento, não especialidade clínica) em vez de implicar uso exclusivo
-- em câncer.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62): conhecimento geral de
-- uso típico de material cirúrgico/OPME, não validado por nenhum
-- profissional clínico do HMK/HUV — sem nota disso na UI (regra do item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso` (pelos 25
-- `cod_soulmv` deste grupo, compartilhados entre HUV e HMK) e em
-- `grupos.descricao_uso` (1 linha). Não mexe em `item_grupos`/`item_areas`
-- — a área (Centro Cirúrgico + especialidades cirúrgicas do HMK) continua
-- correta, o problema era só a descrição de texto, não o vínculo.
-- Idempotente — sempre sobrescreve com o texto final (seguro rodar de
-- novo), mas nunca mexe em item que já tenha edição manual diferente desta
-- lista feita depois desta migration.

update grupos set descricao_uso =
  'Categoria de faturamento/OPME do SoulMV usada pelo serviço de Oncologia — não significa que o material em si seja exclusivo de cirurgia de câncer. Reúne majoritariamente instrumental cirúrgico de uso geral (grampeadores, clipes hemostáticos, trocartes, cateter ureteral) comum a qualquer cirurgia laparoscópica ou aberta, benigna ou maligna, faturado sob este código por ter sido usado numa cirurgia do serviço de oncologia. Veja o resumo específico de cada item, mais preciso que esta descrição geral.'
where nome = 'OPME — ONCOLOGICA';

update itens set resumo_uso =
  case cod_soulmv
    when '5850' then 'Grampeador cirúrgico linear, carga de 60mm (cartucho verde). Dispara duas fileiras alternadas de grampos de titânio e corta o tecido entre elas numa única aplicação — usado pra seccionar e fechar simultaneamente estruturas como alças intestinais, estômago ou brônquio em cirurgias abertas ou laparoscópicas. É instrumental cirúrgico de uso geral (não exclusivo de câncer), empregado em qualquer especialidade que opera o abdome/tórax.'
    when '5851' then 'Carga (cartucho de grampos) de reposição pra grampeador linear cortante de 80mm, cor azul — a cor indica a altura do grampo, calibrada pra tecido de espessura média/espessa (ex: parede intestinal, gástrica). Encaixa no grampeador reutilizável ou semi-descartável durante a cirurgia, cada carga é de uso único.'
    when '5852' then 'Grampeador cirúrgico linear cortante, 80mm, carga azul (tecido médio/espesso) — secciona e grampeia simultaneamente estruturas tubulares maiores (ex: estômago, cólon) em cirurgia aberta. Instrumental de uso geral, usado em qualquer especialidade cirúrgica que opera o trato digestivo, não é específico de câncer.'
    when '5853' then 'Grampeador circular, 33mm de diâmetro — cria uma anastomose circular (reconexão término-terminal ou término-lateral) entre duas extremidades de um órgão tubular, mais usado em cirurgia esofágica, gástrica ou colorretal depois da retirada de um segmento do órgão (por tumor, mas também por outras doenças benignas).'
    when '5854' then 'Grampeador cirúrgico linear, carga de 30mm, cor azul (tecido médio/espesso) — secciona e grampeia tecido numa área mais curta que os modelos de 45/60/80mm, útil em espaços cirúrgicos restritos (ex: pelve, mediastino). Instrumental de uso geral.'
    when '5855' then 'Grampeador cirúrgico linear, carga de 60mm, cor verde — mesma função do item 5850 (secciona e grampeia tecido numa única aplicação), variante de cartucho/calibre de grampo diferente conforme o fabricante. Instrumental cirúrgico de uso geral, não exclusivo de câncer.'
    when '5856' then 'Cateter duplo J (stent ureteral), calibre 6Fr, 26cm — tubo flexível posicionado dentro do ureter (do rim até a bexiga) pra manter o fluxo de urina quando há obstrução ou risco de obstrução do ureter. Usado em Urologia tanto por causa oncológica (compressão do ureter por tumor) quanto por cálculo renal ou pós-cirurgia urológica — não é exclusivo de câncer.'
    when '5857' then 'Fio-guia hidrofílico, 0.035 polegadas x 150cm, ponta reta — usado pra guiar e posicionar cateteres (ex: duplo J) dentro do trato urinário durante procedimentos endourológicos ou radiológicos. Instrumental acessório de uso geral em Urologia/Radiologia Intervencionista.'
    when '7036' then 'Grampeador cirúrgico linear, carga de 45mm, cor azul (tecido médio/espesso) — secciona e grampeia tecido numa única aplicação, calibre intermediário entre os modelos de 30 e 60mm. Instrumental de uso geral em cirurgia aberta/laparoscópica.'
    when '7692' then 'Grampeador circular, 25mm de diâmetro — cria anastomose circular término-terminal, calibre menor que o de 33mm, mais usado em reconexões de menor diâmetro (ex: esôfago, reto baixo) após ressecção de um segmento do órgão.'
    when '9617' then 'Carga (cartucho de grampos) de reposição pra grampeador linear cortante de 60mm — item de uso único, encaixado no grampeador reutilizável durante a cirurgia pra permitir mais de uma aplicação de corte/grampeamento no mesmo procedimento.'
    when '9641' then 'Grampeador cirúrgico linear cortante, 60mm, carga azul (tecido médio/espesso) — secciona e grampeia simultaneamente um segmento de tecido tubular (ex: intestino) em cirurgia aberta ou laparoscópica. Instrumental de uso geral, calibre intermediário entre 45 e 80mm.'
    when '10500' then 'Grampeador circular, 21mm de diâmetro — o menor calibre da linha de grampeadores circulares, usado em anastomoses de diâmetro reduzido, tipicamente esofágicas ou retais baixas, após ressecção de um segmento do órgão.'
    when '15938' then 'Cateter duplo J (stent ureteral) 6Fr x 26cm já acompanhado do fio-guia hidrofílico 0.035" x 150cm — kit completo pra inserção endoscópica do stent num único procedimento, sem precisar de fio-guia avulso. Mesma indicação do item 5856 (manter o fluxo de urina do rim até a bexiga em caso de obstrução ureteral de qualquer causa).'
    when '18508' then 'Carga (cartucho de grampos) roxa de reposição pra endogrampeador de 60mm — a cor roxa geralmente indica calibre pra tecido espesso (ex: bariátrica, ressecção gástrica/pulmonar). Item de uso único, encaixado no grampeador durante a cirurgia.'
    when '18509' then 'Grampeador circular intraluminal, 29mm de diâmetro — cria anastomose circular término-terminal ou término-lateral dentro do lúmen do órgão (ex: trato digestivo), calibre intermediário, usado após ressecção de um segmento do órgão por qualquer causa (benigna ou maligna).'
    when '18510' then 'Manipulador uterino com colpótomo acoplado — instrumento inserido pela vagina na cirurgia ginecológica laparoscópica/robótica (ex: histerectomia) pra mobilizar o útero e demarcar o fórnice vaginal, facilitando a colpotomia (abertura da vagina) no fim do procedimento. Usado em Ginecologia Oncológica e também em histerectomia por causa benigna.'
    when '18511' then 'Trocarte descartável de 12mm — dispositivo que cria e mantém um portal de acesso na parede abdominal pra entrada de câmera/instrumentos em cirurgia laparoscópica. Instrumental de acesso cirúrgico de uso geral, usado em qualquer especialidade que opera por via laparoscópica.'
    when '18512' then 'Clipador de clipes de ligadura (LigaClip LT400, calibre grande) — pinça aplicadora de clipes de titânio/polímero usados pra ocluir vasos sanguíneos ou ductos antes de seccioná-los em cirurgia laparoscópica ou aberta. Função puramente mecânica de hemostasia/oclusão, usado em praticamente qualquer cirurgia (vesícula, apêndice, bariátrica, ginecológica, urológica, oncológica) — não é exclusivo de câncer.'
    when '18513' then 'Clipe de ligadura Hem-o-lok, polímero, tamanho grande (roxo) — clipe travável usado pra ligar (ocluir) com segurança vasos sanguíneos, ductos ou estruturas tubulares (ex: ducto cístico, vasos renais, coto apendicular) antes de seccioná-los, em cirurgia laparoscópica. É um dispositivo de hemostasia mecânica **universal**: usado em colecistectomia, apendicectomia, cirurgia bariátrica, hérnia, nefrectomia, histerectomia e também em cirurgia oncológica — a presença do item nesta categoria reflete o código de faturamento do procedimento em que foi usado, não uma limitação clínica do próprio clipe.'
    when '18514' then 'Clipe de ligadura Hem-o-lok, polímero, tamanho médio (dourado) — mesma função do item 18513 (oclusão mecânica de vasos/ductos antes de seccioná-los), calibre menor pra estruturas de diâmetro reduzido. Dispositivo universal de hemostasia, não exclusivo de cirurgia oncológica.'
    when '18556' then 'Implante mamário de silicone, 200cc — prótese usada em reconstrução mamária após mastectomia (contexto oncológico) ou em cirurgia plástica de aumento/reconstrução por outras causas. Este é o item do grupo mais diretamente ligado à especialidade oncológica (Mastologia).'
    when '18936' then 'Clipe de ligadura (LigaClip/Hem-o-lok), tamanho pequeno (200) — mesma função de oclusão mecânica de vasos/ductos dos itens 18512-18514, calibre menor pra estruturas de diâmetro reduzido (ex: vasos de pequeno calibre, ducto cístico estreito). Dispositivo universal, não exclusivo de câncer.'
    when '19087' then 'Carga (cartucho de grampos) bege de reposição pra grampeador de 60mm — a cor bege geralmente indica calibre pra tecido fino/delicado (ex: vascular, pulmonar). Item de uso único, encaixado no grampeador durante a cirurgia.'
    when '20054' then 'Grampeador cirúrgico curvo, 40mm, carga verde — variante com mandíbula curva que facilita o acesso a estruturas de difícil alcance (ex: anastomoses baixas na pelve/reto), secciona e grampeia tecido numa única aplicação. Instrumental de uso geral em cirurgia colorretal/pélvica.'
    else resumo_uso
  end
where cod_soulmv in (
  '5850','5851','5852','5853','5854','5855','5856','5857','7036','7692',
  '9617','9641','10500','15938','18508','18509','18510','18511','18512',
  '18513','18514','18556','18936','19087','20054'
)
and (resumo_uso = '' or resumo_uso is null);
