-- Objetivo: tornar o resumo de uso do Catálogo de Materiais mais específico
-- por ITEM (ou por tipo real de produto), não só por grupo amplo — pedido do
-- Everton ao ver "SONDA NASOGASTRICA 18 LONGA" usando a descrição genérica
-- do grupo "SONDAS" (que mistura sonda vesical, nasogástrica etc.): "Precisa
-- ser mais específico aqui... Como a sonda nasogástrica é usada, não precisa
-- guiar pelo tamanho. Quero em todos os itens."
--
-- Escrever um resumo único pra cada um dos ~5.382 itens não é viável (nem
-- seria mais preciso que isso — muitos são só variações de tamanho do mesmo
-- produto, exatamente o ponto do Everton). A solução aqui é por PADRÃO DE
-- NOME: `itens.resumo_uso` passa a ser preenchido quando o nome do item bate
-- com um tipo de produto reconhecível (ex: todo "SONDA NASOGASTRICA %",
-- não importa o tamanho), usando `unaccent()` pra não depender de acento
-- (o export do SoulMV tem "PINÇA"/"PINCA" e "ANATÔMICA"/"ANATOMICA"
-- misturados pro mesmo tipo de item).
--
-- **Mesmo aviso de sempre (itens 53/56)**: é conhecimento geral de uso
-- típico de cada tipo de material, não validado por profissional clínico
-- do HUV. Cobre 2676 dos 5400 itens da Espécie 002 com uma
-- descrição específica do TIPO de produto (não do tamanho/variante) — o
-- restante continua caindo no fallback da descrição geral do grupo (item 56),
-- que já existia. `resumo_uso` só é gravado quando ainda está vazio — não
-- sobrescreve nada que o Everton já tenha editado manualmente pela tela de
-- Gestão.
--
-- Impacto: aditivo, só UPDATE em `itens.resumo_uso` (nunca mexe em
-- `grupos`/`item_grupos`/`item_areas`). Idempotente — toda condição
-- inclui `resumo_uso = ''`, seguro rodar de novo.
-- Rollback: UPDATE itens SET resumo_uso = '' WHERE resumo_uso IN (<as frases
-- abaixo>) -- ou, mais simples, não há necessidade: o campo tem override
-- manual pela tela a qualquer momento.

create extension if not exists unaccent;

update itens set resumo_uso = 'Prótese metálica expansível implantada numa artéria (coronária ou periférica) para manter o vaso aberto após uma angioplastia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%STENT%'));

update itens set resumo_uso = 'Usado em procedimentos de angioplastia para dilatar um vaso sanguíneo obstruído.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER BALAO%'));

update itens set resumo_uso = 'Usado para direcionar fios, balões ou stents até o local do procedimento vascular.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER GUIA%'));

update itens set resumo_uso = 'Usado para injeção de contraste e realização de angiografias diagnósticas.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER ANGIOGRAFICO%'));

update itens set resumo_uso = 'Cateter com duas vias (duplo lúmen), usado para infusão e aspiração simultâneas ou hemodiálise.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER DUPLO%'));

update itens set resumo_uso = 'Usado para acesso venoso, administração de medicação e fluidos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER INTRAVENOSO%')
     or unaccent(nome) ilike unaccent('%CATETER VENOSO%'));

update itens set resumo_uso = 'Usada para isolar e ventilar um dos pulmões separadamente durante cirurgia torácica.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CATETER ENDOBRONQUIAL%')
     or unaccent(nome) ilike unaccent('%SONDA ENDOBRONQUIAL%'));

update itens set resumo_uso = 'Fio metálico fino usado para guiar cateteres até o local de um procedimento vascular.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FIO GUIA%'));

update itens set resumo_uso = 'Usado para criar e manter um acesso vascular durante um procedimento.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%INTRODUTOR PARA%')
     or unaccent(nome) ilike unaccent('%KIT INTRODUTOR%'));

update itens set resumo_uso = 'Prótese implantada para substituir uma valva cardíaca doente.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%VALVULA CARDIACA%'));

update itens set resumo_uso = 'Dispositivo implantável usado para regular o ritmo cardíaco.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%MARCAPASSO CARDIACO%'));

update itens set resumo_uso = 'Prótese usada para substituir ou reparar um segmento de vaso sanguíneo.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%ENXERTO VASCULAR%'));

update itens set resumo_uso = 'Usado para corte e coagulação de tecido por eletrocautério durante a cirurgia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%ELETRODO ELETROCIRURGICO%')
     or unaccent(nome) ilike unaccent('%ELETRODO PARA%'));

update itens set resumo_uso = 'Implante ortopédico usado pra fixação em osso cortical (a camada mais densa), em cirurgias de fratura.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO CORTICAL%'));

update itens set resumo_uso = 'Implante ortopédico usado pra fixação em osso esponjoso (mais poroso), comum nas extremidades dos ossos longos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO ESPONJOSO%'));

update itens set resumo_uso = 'Parafuso ortopédico com canal interno, inserido sobre um fio-guia pra maior precisão na fixação óssea.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO CANULADO%'));

update itens set resumo_uso = 'Parafuso que trava na placa de fixação, aumentando a estabilidade da osteossíntese.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO BLOQUEIO%')
     or unaccent(nome) ilike unaccent('%PARAFUSO BLOQ%'));

update itens set resumo_uso = 'Parafuso ortopédico que cria sua própria rosca no osso durante a inserção.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO AUTOROSQUEANTE%')
     or unaccent(nome) ilike unaccent('%PARAFUSO AUTO ROSQ%')
     or unaccent(nome) ilike unaccent('%PARAFUSO AUTO%'));

update itens set resumo_uso = 'Usado em fraturas do colo do fêmur, permite compressão controlada do foco da fratura.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO DESLIZANTE%'));

update itens set resumo_uso = 'Usado na fixação de fraturas na face volar (palmar) do rádio/punho.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO VOLAR%'));

update itens set resumo_uso = 'Usado na fixação de lesões da articulação acrômio-clavicular (ombro).'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PARAFUSO A/C%')
     or unaccent(nome) ilike unaccent('%PARAFUSO AC%'));

update itens set resumo_uso = 'Implante inserido dentro do canal do osso longo pra estabilizar uma fratura (o tamanho/local varia conforme o osso tratado).'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%HASTE FEMORAL%')
     or unaccent(nome) ilike unaccent('%HASTE TIBIAL%')
     or unaccent(nome) ilike unaccent('%HASTE INTRAMEDULAR%')
     or unaccent(nome) ilike unaccent('%HASTE BLOQUEADA%'));

update itens set resumo_uso = 'Implante metálico fixado ao osso com parafusos pra estabilizar uma fratura — o formato (reta, L, volar, DHS etc.) varia conforme a região óssea tratada, não o tipo de uso.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PLACA %')
     or unaccent(nome) ilike unaccent('%MINI PLACA%'));

update itens set resumo_uso = 'Implante metálico usado pra fixação temporária ou definitiva de fragmentos ósseos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PINO DE%')
     or unaccent(nome) ilike unaccent('%PINO DESLIZANTE%'));

update itens set resumo_uso = 'Componente de uma prótese articular (ex: joelho/quadril) que substitui a superfície do osso correspondente.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%COMPONENTE FEMORAL%')
     or unaccent(nome) ilike unaccent('%COMPONENTE TIBIAL%')
     or unaccent(nome) ilike unaccent('%PLATO TIBIAL%'));

update itens set resumo_uso = 'Implante usado para substituir uma articulação do quadril danificada.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PROTESE FEMORAL%')
     or unaccent(nome) ilike unaccent('%PROTESE DE QUADRIL%'));

update itens set resumo_uso = 'Dispositivo usado para estabilizar uma fratura por fora do corpo, sem implante interno.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FIXADOR EXTERNO%'));

update itens set resumo_uso = 'Sistema de fixação bloqueada usado em fraturas de ossos longos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FIXADOR LINEFIX%')
     or unaccent(nome) ilike unaccent('%ORTOLOCK FEMORAL%'));

update itens set resumo_uso = 'Dispositivo de imobilização usado para proteger a coluna cervical.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%COLAR CERVICAL%'));

update itens set resumo_uso = 'Instrumento cirúrgico usado para segurar e guiar a agulha durante a sutura de tecidos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PORTA AGULHA%'));

update itens set resumo_uso = 'Instrumento usado para segurar e manipular tecidos delicados durante a dissecção cirúrgica.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PINÇA ANATOMICA%')
     or unaccent(nome) ilike unaccent('%PINCA ANATOMICA%')
     or unaccent(nome) ilike unaccent('%PINÇA ADSON%')
     or unaccent(nome) ilike unaccent('%PINCA ADSON%')
     or unaccent(nome) ilike unaccent('%PINÇA DISSEC%')
     or unaccent(nome) ilike unaccent('%PINCA DISSEC%')
     or unaccent(nome) ilike unaccent('%PINCA DEBAKEY%')
     or unaccent(nome) ilike unaccent('%PINÇA DEBAKEY%'));

update itens set resumo_uso = 'Instrumento usado para segurar e tracionar tecidos ou compressas durante a cirurgia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PINÇA ALLIS%')
     or unaccent(nome) ilike unaccent('%PINCA ALLIS%')
     or unaccent(nome) ilike unaccent('%PINÇA FOERSTER%')
     or unaccent(nome) ilike unaccent('%PINCA FOERSTER%')
     or unaccent(nome) ilike unaccent('%PINCA APREENSAO%')
     or unaccent(nome) ilike unaccent('%PINÇA APREENSAO%'));

update itens set resumo_uso = 'Pinça hemostática, usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PINÇA ROCHESTER%')
     or unaccent(nome) ilike unaccent('%PINCA ROCHESTER%')
     or unaccent(nome) ilike unaccent('%PINÇA KOCHER%')
     or unaccent(nome) ilike unaccent('%PINCA KOCHER%')
     or unaccent(nome) ilike unaccent('%PINÇA KELLY%')
     or unaccent(nome) ilike unaccent('%PINCA KELLY%')
     or unaccent(nome) ilike unaccent('%PINÇA MIXTER%')
     or unaccent(nome) ilike unaccent('%PINCA MIXTER%')
     or unaccent(nome) ilike unaccent('%PINÇA HALSTEAD%')
     or unaccent(nome) ilike unaccent('%PINCA HALSTEAD%')
     or unaccent(nome) ilike unaccent('%PINÇA MOSQUITO%')
     or unaccent(nome) ilike unaccent('%PINCA MOSQUITO%')
     or unaccent(nome) ilike unaccent('%PINÇA HEMOSTÁTICA%')
     or unaccent(nome) ilike unaccent('%PINCA HEMOSTATICA%'));

update itens set resumo_uso = 'Tesoura cirúrgica robusta usada para corte de tecidos mais resistentes e fios de sutura grossos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%TESOURA MAYO%'));

update itens set resumo_uso = 'Tesoura delicada usada para dissecção e corte de tecidos finos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%TESOURA METZENBAUM%')
     or unaccent(nome) ilike unaccent('%TESOURA METZ%'));

update itens set resumo_uso = 'Usado para afastar as bordas da incisão e manter o campo cirúrgico exposto.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%AFASTADOR FARABEUF%'));

update itens set resumo_uso = 'Afastador usado especificamente em cirurgias bucomaxilofaciais.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%AFASTADOR OBWEGESER%'));

update itens set resumo_uso = 'Instrumento usado para raspagem (curetagem) de tecido, comum em procedimentos ginecológicos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CURETA SIMON%'));

update itens set resumo_uso = 'Cabo usado para acoplar a lâmina de bisturi durante incisões cirúrgicas.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CABO DE BISTURI%')
     or unaccent(nome) ilike unaccent('%CABO DE %'));

update itens set resumo_uso = 'Tecido estéril usado para delimitar e proteger a área ao redor do campo cirúrgico.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CAMPO CIRURGICO%'));

update itens set resumo_uso = 'Caixa usada para acondicionar e organizar instrumentais cirúrgicos antes da esterilização.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%ESTOJO DE%'));

update itens set resumo_uso = 'Clampe vascular usado para ocluir temporariamente um vaso durante a cirurgia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CLAMP BULLDOG%'));

update itens set resumo_uso = 'Usado para secção e sutura simultânea de tecidos em cirurgias, como ressecções intestinais.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%GRAMPEADOR LINEAR%'));

update itens set resumo_uso = 'Usado para sutura de tecidos após uma incisão cirúrgica ou ferimento — o tipo de fio varia conforme o tempo de absorção/resistência necessário, não o uso em si.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FIO DE SUTURA%')
     or unaccent(nome) ilike unaccent('%FIO VICRYL%')
     or unaccent(nome) ilike unaccent('%FIO PROLENE%')
     or unaccent(nome) ilike unaccent('%FIO MONONYLON%'));

update itens set resumo_uso = 'Usada para punção, aplicação de medicação ou coleta de sangue.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%AGULHA PARA%')
     or unaccent(nome) ilike unaccent('%AGULHA TIPO%')
     or unaccent(nome) ilike unaccent('%AGULHA P/%'));

update itens set resumo_uso = 'Usada para manutenção de via aérea ou acesso a estruturas durante um procedimento.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CANULA DE%'));

update itens set resumo_uso = 'Inserido na via aérea pra garantir ventilação durante anestesia geral ou suporte respiratório.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%TUBO ENDOTRAQUEAL%'));

update itens set resumo_uso = 'Inserida pelo nariz até o estômago, usada para alimentação, administração de medicação ou drenagem do conteúdo gástrico.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%SONDA NASOGASTRICA%')
     or unaccent(nome) ilike unaccent('%SONDA NASO GASTRICA%'));

update itens set resumo_uso = 'Sonda inserida na bexiga através da uretra, usada para drenagem contínua de urina.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%SONDA FOLEY%')
     or unaccent(nome) ilike unaccent('%SONDA URETRAL%')
     or unaccent(nome) ilike unaccent('%SONDA VESICAL%'));

update itens set resumo_uso = 'Usado para escoamento de fluidos e secreções de uma cavidade corporal, geralmente após cirurgia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%DRENO DE%'));

update itens set resumo_uso = 'Usado para administração de soluções e medicação por via intravenosa.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%EQUIPO DE%')
     or unaccent(nome) ilike unaccent('%EQUIPO PARA%'));

update itens set resumo_uso = 'Usada para administração de medicação, aspiração de fluidos ou lavagem.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%SERINGA DESCARTAVEL%')
     or unaccent(nome) ilike unaccent('%SERINGA DESCARTÁVEL%'));

update itens set resumo_uso = 'Equipamento de proteção individual estéril, usado em procedimentos invasivos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%LUVA ESTERIL%')
     or unaccent(nome) ilike unaccent('%LUVA DE PROCEDIMENTO%'));

update itens set resumo_uso = 'Usada para suporte ventilatório ou proteção das vias aéreas durante um procedimento.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%MASCARA FACIAL%'));

update itens set resumo_uso = 'Usada para imobilização da região facial/cervical durante sessões de radioterapia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%MASCARA TERMOPLASTICA%'));

update itens set resumo_uso = 'Usada para identificação do paciente, garantindo segurança na assistência.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PULSEIRA DE%'));

update itens set resumo_uso = 'Recipiente usado para coleta de amostras biológicas para exame laboratorial.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%COLETOR DE%'));

update itens set resumo_uso = 'Usada pra fixação de curativos, imobilização e compressão em grandes áreas do corpo.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%ATADURA DE%'));

update itens set resumo_uso = 'Usado pra embalagem de materiais que serão esterilizados — permite a entrada do agente esterilizante e mantém a esterilidade até o uso.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%PAPEL GRAU%'));

update itens set resumo_uso = 'Usada pra higiene e conforto de pacientes com incontinência ou mobilidade reduzida.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FRALDA DESCARTAVEL%'));

update itens set resumo_uso = 'Usada pra fixação de curativos nos membros, sem precisar de fita adesiva direto na pele.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%MALHA TUBULAR%'));

update itens set resumo_uso = 'Bolsa coletora usada no manejo de eliminações do paciente (ex: colostomia).'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%BOLSA DE COLOSTOMIA%')
     or unaccent(nome) ilike unaccent('%BOLSA COLETORA%'));

update itens set resumo_uso = 'Usado em linhas de infusão ou ventilação pra reter partículas ou ar.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%FILTRO DE AR%')
     or unaccent(nome) ilike unaccent('%FILTRO DE LINHA%'));

update itens set resumo_uso = 'Usado pra administração controlada e contínua de medicação ou fluidos.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%INFUSOR DE%'));

update itens set resumo_uso = 'Usado para criar e manter um acesso vascular durante um procedimento.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%KIT INTRODUTOR%'));

update itens set resumo_uso = 'Conjunto usado pra aspiração de secreções durante um procedimento.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%KIT ASPIRAÇÃO%')
     or unaccent(nome) ilike unaccent('%KIT ASPIRACAO%'));

update itens set resumo_uso = 'Sistema fechado de aspiração traqueal usado em pacientes com via aérea artificial.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%TRACH CARE%'));

update itens set resumo_uso = 'Prótese usada em cirurgia de reconstrução ou aumento mamário.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%IMPLANTE MAMARIO%'));

update itens set resumo_uso = 'Cânula usada para coleta ou injeção de gordura em procedimentos de lipoenxertia.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%CAN LIPOFILLING%')
     or unaccent(nome) ilike unaccent('%CÂN LIPOFILLING%'));

update itens set resumo_uso = 'Conjunto de dispositivos usado para suporte respiratório não invasivo.'
  where deleted_at is null and resumo_uso = ''
  and (unaccent(nome) ilike unaccent('%SISTEMA CPAP%'));

