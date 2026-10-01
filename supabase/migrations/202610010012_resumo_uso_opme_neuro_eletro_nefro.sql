-- Objetivo: fecha a fila de grupos "OPME — [especialidade]" de risco
-- médio/alto da revisão geral (itens 64-67) — os 3 últimos, pequenos o
-- suficiente pra revisar item a item em vez de por padrão de nome:
-- `OPME — NEUROLOGIA` (33 itens), `OPME — ELETROFISIOLOGIA` (32 itens) e
-- `OPME — NEFROLOGIA` (9 itens).
--
-- **`OPME — NEFROLOGIA` (9 itens)**: grupo pequeno e homogêneo, todos
-- materiais de diálise (cateter de hemodiálise de duplo lúmen, cateter
-- peritoneal tipo Tenckhoff, conjuntos de troca de diálise peritoneal —
-- CAPD/DPA — inclusive de treinamento do paciente, dilatador e fio-guia de
-- implante) — grupo corretamente nomeado, sem nenhuma anomalia.
--
-- **`OPME — NEUROLOGIA` (33 itens)**: mistura de instrumental
-- neurocirúrgico "puro" (cateter ventricular externo, cateter parenquimal
-- de PIC, pinça bipolar, broca/fresa craniana, agentes hemostáticos,
-- selante dural, matriz de regeneração dural) **e instrumental de fixação
-- de coluna** (cage cervical, placa cervical, parafusos pediculares/
-- cervicais, hastes, cross-link) — **não é anomalia de classificação**
-- (diferente do achado real em CARDIACA/item 67): cirurgia de coluna é
-- feita tanto por ortopedistas quanto por neurocirurgiões, então esse
-- instrumental aparecer também sob OPME — NEUROLOGIA reflete uso real
-- (neurocirurgia da coluna), não erro de cadastro. Revisado item a item,
-- com texto reaproveitado entre os códigos que são a mesma peça em
-- variações de tamanho/modelo (broca diamantada, broca de trepanação,
-- fresa cortante).
--
-- **`OPME — ELETROFISIOLOGIA` (32 itens)**: material de estudo
-- eletrofisiológico/ablação cardíaca (cateteres diagnósticos/de
-- mapeamento/de ablação, cabos conectores, bainhas direcionáveis, agulha
-- transseptal, eletrodo neutro, patch de referência de navegação 3D, kit
-- de pericardiocentese) — grupo corretamente nomeado. **1 anomalia real**:
-- o código 16960 tem nome `UND` no cadastro de origem do SoulMV — só a
-- abreviação de "unidade", sem nenhuma informação do que o item realmente
-- é; impossível descrever com confiança, tratado à parte recomendando
-- revisão do cadastro em vez de inventar uma descrição.
--
-- Mesmo aviso de sempre (itens 52/53/56/58/59/61/62/63/64/65/66/67):
-- conhecimento geral de uso típico de material clínico, não validado por
-- nenhum profissional do HUV/HMK — sem nota disso na UI (regra do item 57).
--
-- Impacto: aditivo/corretivo, só `UPDATE` em `itens.resumo_uso` pelos
-- `cod_soulmv` dos 3 grupos (compartilhados entre HUV e HMK). Não mexe em
-- `grupos`/`item_grupos`/`item_areas`. Só grava onde `resumo_uso` ainda
-- está vazio — nunca sobrescreve edição manual. Idempotente.

update itens set resumo_uso =
  case cod_soulmv
    -- OPME — NEFROLOGIA (9 itens)
    when '8144' then 'Cateter venoso central de duplo lúmen para hemodiálise — inserido na veia subclávia (ou outra veia central), permite retirar o sangue do paciente, levá-lo até a máquina de hemodiálise e devolvê-lo, cada direção num lúmen separado.'
    when '8145' then 'Cateter peritoneal tipo Tenckhoff, de longa permanência — implantado cirurgicamente na cavidade abdominal, permite infundir e drenar a solução de diálise peritoneal (CAPD/DPA) continuamente, por meses ou anos.'
    when '8146' then 'Conjunto de troca para diálise peritoneal automatizada (DPA) com instalação domiciliar — conecta o cateter peritoneal do paciente à máquina cicladora, que troca a solução de diálise automaticamente, geralmente durante a noite.'
    when '8147' then 'Conjunto de troca para diálise peritoneal automatizada (DPA) — conecta o cateter peritoneal à máquina cicladora que troca a solução de diálise automaticamente.'
    when '8148' then 'Conjunto de troca para diálise peritoneal ambulatorial contínua (DPAC/CAPD) — permite a troca manual da solução de diálise peritoneal, feita várias vezes ao dia pelo próprio paciente, sem máquina.'
    when '8149' then 'Conjunto de troca usado no treinamento do paciente (ou cuidador) pra aprender a fazer a troca da solução de diálise peritoneal sozinho, antes de começar o tratamento em casa.'
    when '8150' then 'Conjunto de troca usado no treinamento do paciente (ou cuidador) pra aprender a fazer a troca da solução de diálise peritoneal sozinho, antes de começar o tratamento em casa.'
    when '8151' then 'Dilatador — alarga o trajeto da pele até a veia antes de inserir o cateter de duplo lúmen para hemodiálise, facilitando a passagem do cateter.'
    when '8152' then 'Fio-guia metálico — posicionado primeiro dentro da veia, serve de caminho pra avançar o dilatador e depois o cateter de duplo lúmen até a posição final.'

    -- OPME — NEUROLOGIA (33 itens)
    when '12031' then 'Cateter ventricular externo (DVE) — inserido dentro de um dos ventrículos cerebrais pra drenar líquido cefalorraquidiano (líquor) pra fora do crânio, aliviando a pressão intracraniana elevada (ex: hemorragia, hidrocefalia).'
    when '12229' then 'Cateter parenquimal de monitorização — inserido diretamente no tecido cerebral pra medir continuamente a pressão (e, em alguns modelos, a temperatura) intracraniana, sem precisar drenar líquor.'
    when '12582' then 'Cabo de silicone da pinça bipolar — conecta a pinça bipolar ao gerador de eletrocautério, conduz a energia usada pra coagular tecido/vasos durante a cirurgia.'
    when '12583' then 'Pinça bipolar — coagula tecido e pequenos vasos por eletrocautério durante a cirurgia, aplicando energia só entre as duas pontas da pinça (mais preciso e seguro perto de estruturas delicadas, como no cérebro).'
    when '13966' then 'Cage (gaiola) intervertebral cervical — implantado entre duas vértebras do pescoço depois da retirada do disco, mantém o espaço e favorece a fusão óssea numa cirurgia de coluna cervical.'
    when '13967' then 'Placa de fixação da coluna cervical, posicionada pela frente do pescoço (via anterior) — fixada com parafusos nas vértebras, usada em cirurgias de artrodese ou fratura cervical.'
    when '13968' then 'Parafuso de bloqueio usado em placas de fixação da coluna cervical — trava diretamente na placa, criando um conjunto de ângulo fixo.'
    when '13969' then 'Parafuso usado em placas de fixação da coluna cervical (pescoço).'
    when '13970' then 'Placa de fixação óssea (formato 1/3 de cana, 7 furos) — usada em cirurgia de coluna ou crânio pra fixar um segmento ósseo, conforme a técnica do cirurgião.'
    when '13971' then 'Âncora de sutura — pequeno implante fixado no osso com um fio preso, usado pra reinserir tecido mole (ex: ligamento, membrana) no local de origem.'
    when '14320' then 'Parafuso pedicular poliaxial — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna; a cabeça poliaxial permite ajustar o ângulo de conexão com a haste.'
    when '14321' then 'Cross-link (conector transversal) — conecta duas barras/hastes paralelas de uma construção de fixação da coluna, uma de cada lado da vértebra, aumentando a rigidez da estrutura.'
    when '14322' then 'Contraparafuso (parafuso de trava) — rosca sobre outro parafuso ou haste pra travar a posição, evitando que a construção de fixação da coluna se solte.'
    when '14326' then 'Haste de fixação da coluna — conecta os parafusos pediculares entre vértebras diferentes, formando a estrutura rígida de uma artrodese vertebral.'
    when '14892' then 'Broca cirúrgica com ponta diamantada — instrumento rotativo usado pra desgastar osso com precisão (ex: no crânio ou na coluna), mais indicada perto de estruturas delicadas que uma broca convencional.'
    when '17194' then 'Parafuso pedicular poliaxial — ancorado no pedículo de uma vértebra, usado em construções de fixação/artrodese da coluna; a cabeça poliaxial permite ajustar o ângulo de conexão com a haste.'
    when '17195' then 'Cross-link (conector transversal) — conecta duas barras/hastes paralelas de uma construção de fixação da coluna, uma de cada lado da vértebra, aumentando a rigidez da estrutura.'
    when '17196' then 'Haste perpendicular — conecta-se às hastes/barras principais de uma construção de fixação da coluna, formando um ângulo diferente pra aumentar a estabilidade da estrutura.'
    when '17197' then 'Agente hemostático absorvível (Surgidry) — aplicado sobre uma superfície de sangramento (ex: no cérebro ou na coluna) pra ajudar a estancar o sangue; é absorvido pelo corpo com o tempo, não precisa ser retirado.'
    when '17198' then 'Fresa cirúrgica cortante — instrumento rotativo usado pra perfurar ou desgastar o osso do crânio durante a cirurgia (ex: craniotomia).'
    when '17200' then 'Broca cirúrgica com ponta diamantada — instrumento rotativo usado pra desgastar osso com precisão (ex: no crânio ou na coluna), mais indicada perto de estruturas delicadas que uma broca convencional.'
    when '17202' then 'Sistema de derivação ventricular externa — kit completo (cateter + bolsa coletora com régua de controle de altura/pressão) pra drenar líquido cefalorraquidiano do ventrículo cerebral pra fora do crânio, controlando a pressão intracraniana.'
    when '20792' then 'Kit de cânula pra bloqueio — usado pra localizar um nervo e injetar anestésico/medicação ao redor dele (bloqueio nervoso), guiado por estimulação elétrica.'
    when '23206' then 'Broca de trepanação — perfura um orifício circular no crânio (trépano), o primeiro passo de uma craniotomia ou pra inserir um dreno ventricular.'
    when '23207' then 'Broca de trepanação — perfura um orifício circular no crânio (trépano), o primeiro passo de uma craniotomia ou pra inserir um dreno ventricular.'
    when '23208' then 'Clipe hemostático — ocluiu um pequeno vaso sanguíneo ou estrutura (ex: durante uma craniotomia), função mecânica de hemostasia.'
    when '23209' then 'Fresa cirúrgica cortante — instrumento rotativo usado pra perfurar ou desgastar o osso do crânio durante a cirurgia (ex: craniotomia).'
    when '23240' then 'Selante dural/craniano — aplicado sobre a dura-máter (membrana que envolve o cérebro) ao final da cirurgia, reforça o fechamento e reduz o risco de vazamento de líquor.'
    when '23241' then 'Matriz de regeneração dural — material (geralmente colágeno) usado pra reconstruir ou reforçar a dura-máter quando ela precisa ser removida ou não pode ser fechada diretamente.'
    when '23242' then 'Matriz de regeneração dural — material (geralmente colágeno) usado pra reconstruir ou reforçar a dura-máter quando ela precisa ser removida ou não pode ser fechada diretamente.'
    when '23243' then 'Gel hemostático — aplicado sobre uma superfície de sangramento difuso (ex: no cérebro) pra ajudar a estancar o sangue.'
    when '23244' then 'Pó hemostático de gelatina absorvível — aplicado sobre uma superfície de sangramento, absorve sangue e forma uma matriz que ajuda a coagulação; é absorvido pelo corpo com o tempo.'
    when '23245' then 'Agente hemostático (Hemadrain) — aplicado sobre uma superfície de sangramento durante a cirurgia pra ajudar a estancar o sangue.'

    -- OPME — ELETROFISIOLOGIA (32 itens, 1 anomalia: 16960)
    when '16948' then 'Cateter diagnóstico decapolar (10 eletrodos) — usado dentro do coração pra registrar a atividade elétrica cardíaca num estudo eletrofisiológico; pode ter curva fixa ou direcionável pelo operador, conforme o modelo.'
    when '16949' then 'Cabo conector decapolar (10 pinos) — liga um cateter decapolar ao equipamento de registro/estimulação elétrica durante um estudo eletrofisiológico.'
    when '16950' then 'Cateter diagnóstico quadripolar (4 eletrodos) — mesma função do cateter decapolar (registrar a atividade elétrica cardíaca), com menos eletrodos; pode ter curva fixa ou direcionável.'
    when '16951' then 'Cateter diagnóstico quadripolar (4 eletrodos) — mesma função do cateter decapolar (registrar a atividade elétrica cardíaca), com menos eletrodos; pode ter curva fixa ou direcionável.'
    when '16952' then 'Cabo conector quadripolar (4 pinos) — liga um cateter quadripolar ao equipamento de registro/estimulação elétrica.'
    when '16956' then 'Cateter de ablação cardíaca por radiofrequência — localiza e cauteriza (ablaciona) o ponto de tecido responsável por uma arritmia cardíaca.'
    when '16957' then 'Cabo do cateter de ablação — liga o cateter de ablação ao gerador de radiofrequência (e, em sistemas com navegação 3D, também ao sistema de mapeamento eletroanatômico).'
    when '16960' then 'Nome incompleto/incompreensível no cadastro de origem do SoulMV — só consta "UND" (abreviação de "unidade"), sem nenhuma informação do que o item realmente é. Não é possível descrever com confiança; recomenda-se à Central de Compras revisar o cadastro deste código.'
    when '16964' then 'Conjunto de tubos de irrigação — leva soro fisiológico até a ponta de um cateter de ablação irrigado, resfriando a ponta durante a aplicação de radiofrequência.'
    when '16965' then 'Bainha direcionável — guia e posiciona um cateter dentro do coração com mais controle; o operador consegue ajustar a curva da bainha durante o procedimento.'
    when '16966' then 'Agulha de punção transseptal — atravessa o septo entre os átrios do coração pra dar acesso ao lado esquerdo em procedimentos de eletrofisiologia/estruturais.'
    when '16967' then 'Eletrodo neutro (placa de retorno) — colado na pele do paciente, fecha o circuito elétrico do gerador de radiofrequência durante a ablação.'
    when '17104' then 'Kit de drenagem pericárdica (pericardiocentese) — drena líquido acumulado ao redor do coração (derrame pericárdico), guiado por punção.'
    when '17179' then 'Cateter de ablação cardíaca por radiofrequência, com irrigação — mesma função do cateter de ablação comum, com um canal interno que libera soro na ponta pra resfriá-la, permitindo aplicar mais energia com segurança.'
    when '18234' then 'Cateter de mapeamento circular (formato de anel) — registra a atividade elétrica ao redor de uma estrutura circular do coração (ex: veias pulmonares), comum em ablação de fibrilação atrial.'
    when '18235' then 'Cabo conector do cateter de mapeamento circular — liga o cateter ao equipamento de registro elétrico.'
    when '18236' then 'Cateter de ablação cardíaca por radiofrequência — localiza e cauteriza (ablaciona) o ponto de tecido responsável por uma arritmia cardíaca.'
    when '18237' then 'Cabo do cateter de ablação irrigado com sistema de navegação 3D — liga o cateter ao gerador de radiofrequência e ao sistema de mapeamento eletroanatômico.'
    when '18238' then 'Patch de referência de impedância — colado na pele do paciente, serve de referência pro sistema de mapeamento eletroanatômico (navegação 3D) localizar a posição dos cateteres dentro do coração.'
    when '18239' then 'Bainha de acesso de curva fixa — guia um cateter até uma região específica do coração durante um estudo eletrofisiológico.'
    when '18240' then 'Cateter de ablação cardíaca por radiofrequência — localiza e cauteriza (ablaciona) o ponto de tecido responsável por uma arritmia cardíaca.'
    when '18241' then 'Cabo do cateter de mapeamento com curva direcionável — liga o cateter ao equipamento de registro elétrico.'
    when '18242' then 'Cateter de mapeamento decapolar (10 eletrodos), com curva direcionável — registra a atividade elétrica cardíaca num estudo eletrofisiológico; a curva é ajustável pelo operador pra alcançar diferentes regiões.'
    when '18243' then 'Cateter de ablação cardíaca por radiofrequência, com curva direcionável — localiza e cauteriza o ponto de tecido responsável por uma arritmia cardíaca.'
    when '18244' then 'Cateter de mapeamento quadripolar (4 eletrodos), com curva direcionável — mesma função do cateter decapolar, com menos eletrodos.'
    when '18245' then 'Cabo do cateter de mapeamento com curva direcionável — liga o cateter ao equipamento de registro elétrico.'
    when '18246' then 'Introdutor femoral — estabelece o acesso vascular inicial na virilha (veia/artéria femoral) no começo de um procedimento de eletrofisiologia ou hemodinâmica.'
    when '19538' then 'Cabo conector decapolar (10 pinos) — liga um cateter decapolar ao equipamento de registro/estimulação elétrica durante um estudo eletrofisiológico.'
    when '20066' then 'Cateter de mapeamento circular (formato de anel) — registra a atividade elétrica ao redor de uma estrutura circular do coração (ex: veias pulmonares), comum em ablação de fibrilação atrial.'
    when '20067' then 'Cateter de ablação cardíaca por radiofrequência — localiza e cauteriza (ablaciona) o ponto de tecido responsável por uma arritmia cardíaca.'
    when '20068' then 'Bainha direcionável — guia e posiciona um cateter dentro do coração com mais controle; o operador consegue ajustar a curva da bainha durante o procedimento.'
    when '20521' then 'Patch de referência de impedância — colado na pele do paciente, serve de referência pro sistema de mapeamento eletroanatômico (navegação 3D) localizar a posição dos cateteres dentro do coração.'
    else resumo_uso
  end
where cod_soulmv in (
  '8144','8145','8146','8147','8148','8149','8150','8151','8152',
  '12031','12229','12582','12583','13966','13967','13968','13969','13970','13971',
  '14320','14321','14322','14326','14892','17194','17195','17196','17197','17198',
  '17200','17202','20792','23206','23207','23208','23209','23240','23241','23242',
  '23243','23244','23245',
  '16948','16949','16950','16951','16952','16956','16957','16960','16964','16965',
  '16966','16967','17104','17179','18234','18235','18236','18237','18238','18239',
  '18240','18241','18242','18243','18244','18245','18246','19538','20066','20067',
  '20068','20521'
)
and (resumo_uso = '' or resumo_uso is null);
