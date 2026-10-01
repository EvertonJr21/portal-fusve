-- Objetivo: corrigir um bug real de precisão clínica achado pelo Everton na
-- migration anterior (202610010002) e ampliar a cobertura de resumo de uso
-- específico por tipo de produto no Catálogo de Materiais.
--
-- **Bug reportado**: pesquisando "sonda", o Everton viu "SONDA DE FOLEY 08 02
-- VIAS" (uso urinário) e "SONDA DE ASPIRACAO TRAQUEAL 04" (aspiração de via
-- aérea) mostrando a MESMA descrição genérica errada ("...alimentação,
-- drenagem ou monitorização..."): "Esses dois itens clinicamente são bem
-- diferentes. A Sonda de Foley não é para alimentação, é para urina."
--
-- **Causa raiz**: a migration 202610010002 casava por FRASE EXATA via ILIKE
-- (ex: `%SONDA FOLEY%`), que exige as palavras adjacentes com um espaço
-- simples entre elas. O nome real no banco é "SONDA DE FOLEY..." — a palavra
-- de conexão "DE" quebra o casamento por substring, e o item cai silenciosamente
-- no fallback genérico do grupo. Mesmo problema, confirmado em mais 2 lugares
-- ao investigar: "SONDA  ENDOBRONQUIAL..." (espaço duplo no nome real, que
-- também quebra a adjacência exata) e nenhuma regra existia pra "SONDA DE
-- ASPIRACAO TRAQUEAL" (gap, não só bug). Achado um terceiro problema do mesmo
-- tipo, não reportado mas da mesma classe: "CATETER DUPLO%" misturava
-- "CATETER DUPLO J" (stent ureteral, usado no rim/ureter) com "CATETER DUPLO
-- LUMEN" (cateter venoso/hemodiálise) sob uma única descrição — dispositivos
-- clinicamente muito diferentes.
--
-- **Correção estrutural**: toda regra agora casa por CONJUNTO de palavras
-- (`unaccent(nome) ilike '%PALAVRA%'` em AND pra cada palavra), não por uma
-- frase única — robusto a conector ("DE"), espaço duplo, barra/hífen no meio
-- e ordem das palavras. As regras continuam indo da mais específica pra mais
-- genérica (a primeira que casa "ganha" — sondas urinárias/gástricas/
-- traqueais/retais foram todas separadas antes de qualquer fallback de
-- "SONDA" genérica).
--
-- **Escopo ampliado** — pedido explícito do Everton ("Preciso que faça uma
-- pesquisa extensa dos itens... quero em todos os itens", com tempo
-- autorizado pra pesquisa): além de corrigir os 3 bugs, a cobertura por TIPO
-- de produto passou de ~2.676 pra ~3.612 dos 5.382 itens da Espécie 002
-- (67,1%) — famílias novas cobertas: cateteres cardíacos/vasculares
-- adicionais (hemodiálise, venoso central, embolectomia, duplo J),
-- instrumental cirúrgico (pinças Crile/Backhaus/Cheron/Kerrison/Debakey,
-- tesouras, afastadores, curetas, osteótomos), implantes ortopédicos
-- (componente femoral/tibial, acetábulo, fixador externo, restritor de
-- cimento), fios de sutura por material (catgut/vicryl/PDS/prolene/
-- mononylon/ethibond/algodão/linho), vias aéreas (tubo orotraqueal,
-- traqueostomia, CPAP/VNI), equipos por finalidade (irrigação ≠ enteral ≠
-- intravenoso — mesmo bug de conflação, corrigido antes de virar reclamação),
-- entre outras.
--
-- **Mesmo aviso de sempre (itens 53/56)**: é conhecimento geral de uso
-- típico de cada tipo de material, não validado por profissional clínico do
-- HUV — mas essa correção foi tratada com prioridade e cuidado redobrado
-- justamente por ser uma reclamação de correção clínica, não só de estilo.
--
-- Impacto: aditivo, só UPDATE em `itens.resumo_uso` (nunca mexe em
-- `grupos`/`item_grupos`/`item_areas`/schema). Idempotente — toda condição
-- aceita re-execução (`resumo_uso = ''` ou ainda contendo um dos 70 textos
-- genéricos da migration anterior); nunca sobrescreve um resumo editado
-- manualmente pela tela de Gestão (qualquer texto que não seja nem vazio nem
-- um dos 70 textos antigos fica intocado).
-- Rollback: não há necessidade — o campo tem override manual pela tela a
-- qualquer momento; se preciso, `UPDATE itens SET resumo_uso = ''` restaura
-- o fallback do grupo.

create extension if not exists unaccent;

-- Tabela temporária com os 70 textos gerados pela migration anterior
-- (202610010002) — usada só pra permitir que as regras novas, mais
-- precisas, substituam esse texto genérico/incorreto sem tocar em
-- nenhum resumo editado manualmente pela tela de Gestão.
drop table if exists _old_resumo_textos;
create temp table _old_resumo_textos (texto text);
insert into _old_resumo_textos (texto) values
  ('Prótese metálica expansível implantada numa artéria (coronária ou periférica) para manter o vaso aberto após uma angioplastia.'),
  ('Usado em procedimentos de angioplastia para dilatar um vaso sanguíneo obstruído.'),
  ('Usado para direcionar fios, balões ou stents até o local do procedimento vascular.'),
  ('Usado para injeção de contraste e realização de angiografias diagnósticas.'),
  ('Cateter com duas vias (duplo lúmen), usado para infusão e aspiração simultâneas ou hemodiálise.'),
  ('Usado para acesso venoso, administração de medicação e fluidos.'),
  ('Usada para isolar e ventilar um dos pulmões separadamente durante cirurgia torácica.'),
  ('Fio metálico fino usado para guiar cateteres até o local de um procedimento vascular.'),
  ('Usado para criar e manter um acesso vascular durante um procedimento.'),
  ('Prótese implantada para substituir uma valva cardíaca doente.'),
  ('Dispositivo implantável usado para regular o ritmo cardíaco.'),
  ('Prótese usada para substituir ou reparar um segmento de vaso sanguíneo.'),
  ('Usado para corte e coagulação de tecido por eletrocautério durante a cirurgia.'),
  ('Implante ortopédico usado pra fixação em osso cortical (a camada mais densa), em cirurgias de fratura.'),
  ('Implante ortopédico usado pra fixação em osso esponjoso (mais poroso), comum nas extremidades dos ossos longos.'),
  ('Parafuso ortopédico com canal interno, inserido sobre um fio-guia pra maior precisão na fixação óssea.'),
  ('Parafuso que trava na placa de fixação, aumentando a estabilidade da osteossíntese.'),
  ('Parafuso ortopédico que cria sua própria rosca no osso durante a inserção.'),
  ('Usado em fraturas do colo do fêmur, permite compressão controlada do foco da fratura.'),
  ('Usado na fixação de fraturas na face volar (palmar) do rádio/punho.'),
  ('Usado na fixação de lesões da articulação acrômio-clavicular (ombro).'),
  ('Implante inserido dentro do canal do osso longo pra estabilizar uma fratura (o tamanho/local varia conforme o osso tratado).'),
  ('Implante metálico fixado ao osso com parafusos pra estabilizar uma fratura — o formato (reta, L, volar, DHS etc.) varia conforme a região óssea tratada, não o tipo de uso.'),
  ('Implante metálico usado pra fixação temporária ou definitiva de fragmentos ósseos.'),
  ('Componente de uma prótese articular (ex: joelho/quadril) que substitui a superfície do osso correspondente.'),
  ('Implante usado para substituir uma articulação do quadril danificada.'),
  ('Dispositivo usado para estabilizar uma fratura por fora do corpo, sem implante interno.'),
  ('Sistema de fixação bloqueada usado em fraturas de ossos longos.'),
  ('Dispositivo de imobilização usado para proteger a coluna cervical.'),
  ('Instrumento cirúrgico usado para segurar e guiar a agulha durante a sutura de tecidos.'),
  ('Instrumento usado para segurar e manipular tecidos delicados durante a dissecção cirúrgica.'),
  ('Instrumento usado para segurar e tracionar tecidos ou compressas durante a cirurgia.'),
  ('Pinça hemostática, usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'),
  ('Tesoura cirúrgica robusta usada para corte de tecidos mais resistentes e fios de sutura grossos.'),
  ('Tesoura delicada usada para dissecção e corte de tecidos finos.'),
  ('Usado para afastar as bordas da incisão e manter o campo cirúrgico exposto.'),
  ('Afastador usado especificamente em cirurgias bucomaxilofaciais.'),
  ('Instrumento usado para raspagem (curetagem) de tecido, comum em procedimentos ginecológicos.'),
  ('Cabo usado para acoplar a lâmina de bisturi durante incisões cirúrgicas.'),
  ('Tecido estéril usado para delimitar e proteger a área ao redor do campo cirúrgico.'),
  ('Caixa usada para acondicionar e organizar instrumentais cirúrgicos antes da esterilização.'),
  ('Clampe vascular usado para ocluir temporariamente um vaso durante a cirurgia.'),
  ('Usado para secção e sutura simultânea de tecidos em cirurgias, como ressecções intestinais.'),
  ('Usado para sutura de tecidos após uma incisão cirúrgica ou ferimento — o tipo de fio varia conforme o tempo de absorção/resistência necessário, não o uso em si.'),
  ('Usada para punção, aplicação de medicação ou coleta de sangue.'),
  ('Usada para manutenção de via aérea ou acesso a estruturas durante um procedimento.'),
  ('Inserido na via aérea pra garantir ventilação durante anestesia geral ou suporte respiratório.'),
  ('Inserida pelo nariz até o estômago, usada para alimentação, administração de medicação ou drenagem do conteúdo gástrico.'),
  ('Sonda inserida na bexiga através da uretra, usada para drenagem contínua de urina.'),
  ('Usado para escoamento de fluidos e secreções de uma cavidade corporal, geralmente após cirurgia.'),
  ('Usado para administração de soluções e medicação por via intravenosa.'),
  ('Usada para administração de medicação, aspiração de fluidos ou lavagem.'),
  ('Equipamento de proteção individual estéril, usado em procedimentos invasivos.'),
  ('Usada para suporte ventilatório ou proteção das vias aéreas durante um procedimento.'),
  ('Usada para imobilização da região facial/cervical durante sessões de radioterapia.'),
  ('Usada para identificação do paciente, garantindo segurança na assistência.'),
  ('Recipiente usado para coleta de amostras biológicas para exame laboratorial.'),
  ('Usada pra fixação de curativos, imobilização e compressão em grandes áreas do corpo.'),
  ('Usado pra embalagem de materiais que serão esterilizados — permite a entrada do agente esterilizante e mantém a esterilidade até o uso.'),
  ('Usada pra higiene e conforto de pacientes com incontinência ou mobilidade reduzida.'),
  ('Usada pra fixação de curativos nos membros, sem precisar de fita adesiva direto na pele.'),
  ('Bolsa coletora usada no manejo de eliminações do paciente (ex: colostomia).'),
  ('Usado em linhas de infusão ou ventilação pra reter partículas ou ar.'),
  ('Usado pra administração controlada e contínua de medicação ou fluidos.'),
  ('Usado para criar e manter um acesso vascular durante um procedimento.'),
  ('Conjunto usado pra aspiração de secreções durante um procedimento.'),
  ('Sistema fechado de aspiração traqueal usado em pacientes com via aérea artificial.'),
  ('Prótese usada em cirurgia de reconstrução ou aumento mamário.'),
  ('Cânula usada para coleta ou injeção de gordura em procedimentos de lipoenxertia.'),
  ('Conjunto de dispositivos usado para suporte respiratório não invasivo.');

update itens set resumo_uso = 'Sonda inserida na bexiga através da uretra, usada para drenagem contínua de urina — fica fixa internamente por um balão inflável (diferente de uma simples sonda de alívio).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%FOLEY%'));

update itens set resumo_uso = 'Sonda inserida na bexiga através da uretra, usada para drenagem de urina.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%VESICAL%'));

update itens set resumo_uso = 'Sonda introduzida pela uretra, usada para drenagem de urina ou calibração/dilatação do canal uretral.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%URETRAL%'));

update itens set resumo_uso = 'Usado para criar um acesso direto à bexiga através da parede abdominal (cistostomia), quando não é possível passar sonda pela uretra.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TROCATER%')
       and unaccent(nome) ilike unaccent('%CISTOSTOMIA%'));

update itens set resumo_uso = 'Sonda introduzida pelo nariz até o estômago, usada para alimentação enteral, administração de medicação ou descompressão/drenagem do conteúdo gástrico.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%NASOGASTRICA%'));

update itens set resumo_uso = 'Sonda introduzida pelo nariz até o estômago, usada para alimentação enteral, administração de medicação ou descompressão/drenagem do conteúdo gástrico.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%NASO%')
       and unaccent(nome) ilike unaccent('%GASTRICA%'));

update itens set resumo_uso = 'Sonda introduzida pela boca até o estômago (via alternativa à nasogástrica, comum em recém-nascidos), usada para alimentação enteral ou descompressão gástrica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%OROGASTRICA%'));

update itens set resumo_uso = 'Sonda implantada diretamente no estômago através da parede abdominal (gastrostomia), usada para alimentação enteral de longo prazo quando a via oral não é possível.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%GASTROSTOMIA%'));

update itens set resumo_uso = 'Usada para aspirar secreções da via aérea de um paciente com tubo endotraqueal ou traqueostomia, mantendo a via aérea desobstruída.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%ASPIRACAO%')
       and unaccent(nome) ilike unaccent('%TRAQUEAL%'));

update itens set resumo_uso = 'Sistema fechado de aspiração traqueal, usado para remover secreções da via aérea sem desconectar o paciente do ventilador.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TRACH%')
       and unaccent(nome) ilike unaccent('%CARE%'));

update itens set resumo_uso = 'Sonda/tubo com dois lumens inserido numa das vias aéreas principais (brônquio), usado para isolar e ventilar separadamente cada pulmão durante cirurgias torácicas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%ENDOBRONQ%'));

update itens set resumo_uso = 'Sonda introduzida pelo reto, usada para descompressão intestinal (eliminação de gases/fezes retidos) ou administração de enema.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%RETAL%'));

update itens set resumo_uso = 'Sonda com balões infláveis usada para tamponar hemorragia digestiva alta por varizes esofágicas/gástricas, comprimindo o sangramento até o tratamento definitivo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SENGSTAKEN%'));

update itens set resumo_uso = 'Sonda com balões infláveis usada para tamponar hemorragia digestiva alta por varizes esofágicas/gástricas, comprimindo o sangramento até o tratamento definitivo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%BLAKEMORE%'));

update itens set resumo_uso = 'Sistema fechado de aspiração traqueal, usado para remover secreções da via aérea sem desconectar o paciente do ventilador.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SONDA%')
       and unaccent(nome) ilike unaccent('%C%')
       and unaccent(nome) ilike unaccent('%SISTEMA%')
       and unaccent(nome) ilike unaccent('%FECHADO%'));

update itens set resumo_uso = 'Tubo inserido pela boca até a traqueia pra garantir ventilação durante anestesia geral ou suporte respiratório — a variante "com aspiração subglótica" permite remover secreções acumuladas acima do balão.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TUBO%')
       and unaccent(nome) ilike unaccent('%OROTRAQUEAL%'));

update itens set resumo_uso = 'Tubo inserido na via aérea pra garantir ventilação durante anestesia geral ou suporte respiratório em UTI.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TUBO%')
       and unaccent(nome) ilike unaccent('%ENDOTRAQUEAL%'));

update itens set resumo_uso = 'Cânula inserida numa abertura cirúrgica na traqueia (traqueostomia), usada pra manter a via aérea de um paciente que precisa de suporte respiratório prolongado.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CANULA%')
       and unaccent(nome) ilike unaccent('%TRAQUEOSTOMIA%'));

update itens set resumo_uso = 'Prótese metálica expansível implantada numa artéria (coronária ou periférica) para manter o vaso aberto após uma angioplastia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%STENT%'));

update itens set resumo_uso = 'Usado em procedimentos de angioplastia para dilatar um vaso sanguíneo obstruído, por insuflação de um balão na ponta do cateter.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%BALAO%'));

update itens set resumo_uso = 'Usado para direcionar fios, balões ou stents até o local do procedimento vascular.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%GUIA%'));

update itens set resumo_uso = 'Usado para injeção de contraste e realização de angiografias diagnósticas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%ANGIOGRAFICO%'));

update itens set resumo_uso = 'Stent ureteral (duplo J) implantado dentro do ureter, ligando o rim à bexiga, pra manter o canal aberto e desobstruir o fluxo de urina.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%DUPLO%')
       and unaccent(nome) ilike unaccent('%J%'));

update itens set resumo_uso = 'Cateter com duas vias (duplo lúmen) para infusão e aspiração simultâneas ou hemodiálise.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%DUPLO%')
       and unaccent(nome) ilike unaccent('%LUMEN%'));

update itens set resumo_uso = 'Cateter com duas vias (duplo lúmen), usado para infusão e aspiração simultâneas ou hemodiálise.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%DUPLO%'));

update itens set resumo_uso = 'Cateter venoso central de longa permanência, usado como acesso para sessões de hemodiálise.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%HEMODIALISE%'));

update itens set resumo_uso = 'Inserido numa veia de grande calibre (central), usado para infusão de medicação, fluidos, nutrição parenteral ou monitorização em pacientes graves.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%VENOSO%')
       and unaccent(nome) ilike unaccent('%CENTRAL%'));

update itens set resumo_uso = 'Usado para acesso venoso periférico, administração de medicação e fluidos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%INTRAVENOSO%'));

update itens set resumo_uso = 'Cateter com balão inflável (tipo Fogarty) usado pra remover um coágulo/êmbolo de dentro de um vaso sanguíneo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%EMBOLECTOMIA%'));

update itens set resumo_uso = 'Dispositivo nasal (cânula tipo óculos) usado para administrar oxigênio suplementar de baixo fluxo ao paciente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%OCULOS%')
       and unaccent(nome) ilike unaccent('%OXIGENIO%'));

update itens set resumo_uso = 'Filtro usado na máquina de hemodiálise para remover toxinas e excesso de líquido do sangue, substituindo a função renal.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DIALISADOR%'));

update itens set resumo_uso = 'Fio metálico fino usado para guiar cateteres/balões/stents até o local de um procedimento vascular.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%GUIA%'));

update itens set resumo_uso = 'Usado para criar e manter um acesso vascular durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%INTRODUTOR%')
       and unaccent(nome) ilike unaccent('%PARA%'));

update itens set resumo_uso = 'Usado para criar e manter um acesso vascular durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%INTRODUTOR%'));

update itens set resumo_uso = 'Usado para criar e manter um acesso vascular na artéria/veia femoral durante um procedimento (ex: cateterismo).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%INTRODUTOR%')
       and unaccent(nome) ilike unaccent('%FEMORAL%'));

update itens set resumo_uso = 'Prótese implantada para substituir uma valva cardíaca doente — a versão biológica usa tecido animal processado, a mecânica é feita de material sintético duradouro.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%VALVULA%')
       and unaccent(nome) ilike unaccent('%CARDIACA%'));

update itens set resumo_uso = 'Dispositivo implantável usado para regular o ritmo cardíaco de pacientes com arritmias ou bloqueios de condução.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MARCAPASSO%')
       and unaccent(nome) ilike unaccent('%CARDIACO%'));

update itens set resumo_uso = 'Fio/eletrodo implantado junto ao coração, conectado ao marcapasso, que transmite o estímulo elétrico que regula o ritmo cardíaco.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ELETRODO%')
       and unaccent(nome) ilike unaccent('%MARCAPASSO%'));

update itens set resumo_uso = 'Prótese usada para substituir ou fazer um desvio (bypass) de um segmento de vaso sanguíneo doente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ENXERTO%')
       and unaccent(nome) ilike unaccent('%VASCULAR%'));

update itens set resumo_uso = 'Prótese usada para substituir ou fazer um desvio (bypass) de um segmento de artéria doente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ENXERTO%')
       and unaccent(nome) ilike unaccent('%ARTERIAL%'));

update itens set resumo_uso = 'Anel protético implantado ao redor de uma valva cardíaca pra corrigir/reforçar seu anel de sustentação (anuloplastia).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ANEL%')
       and unaccent(nome) ilike unaccent('%ANULOPLASTIA%'));

update itens set resumo_uso = 'Usado para infundir a solução que interrompe temporariamente os batimentos do coração durante a cirurgia cardíaca com circulação extracorpórea.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SISTEMA%')
       and unaccent(nome) ilike unaccent('%CARDIOPLEGIA%'));

update itens set resumo_uso = 'Instrumento usado para dilatar progressivamente um vaso sanguíneo durante um procedimento vascular.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GARRET%')
       and unaccent(nome) ilike unaccent('%VASCULAR%'));

update itens set resumo_uso = 'Alça inserida pelo endoscópio/colonoscópio pra laçar e remover (ressecar) um pólipo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ALCA%')
       and unaccent(nome) ilike unaccent('%POLIPECTOMIA%'));

update itens set resumo_uso = 'Usado para corte e coagulação de tecido por eletrocautério durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ELETRODO%')
       and unaccent(nome) ilike unaccent('%ELETROCIRURGICO%'));

update itens set resumo_uso = 'Usado para monitorização cardíaca (ECG) ou de outros sinais elétricos do paciente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ELETRODO%'));

update itens set resumo_uso = 'Cateter periférico curto (tipo jelco/abocath), inserido numa veia periférica pra acesso venoso e administração de medicação/fluidos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DISPOSITIVO%')
       and unaccent(nome) ilike unaccent('%INTRAVENOSO%'));

update itens set resumo_uso = 'Implante ortopédico usado pra fixação em osso cortical (a camada mais densa e externa), em cirurgias de fratura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%CORTICAL%'));

update itens set resumo_uso = 'Implante ortopédico usado pra fixação em osso esponjoso (mais poroso), comum nas extremidades dos ossos longos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%ESPONJOSO%'));

update itens set resumo_uso = 'Parafuso ortopédico com canal interno, inserido sobre um fio-guia pra maior precisão na fixação de fraturas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%CANULADO%'));

update itens set resumo_uso = 'Parafuso que trava na placa/haste de fixação, aumentando a estabilidade da osteossíntese.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%BLOQ%'));

update itens set resumo_uso = 'Parafuso ortopédico que cria sua própria rosca no osso durante a inserção, sem precisar de perfuração prévia com macho de rosca.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%AUTOROSQ%'));

update itens set resumo_uso = 'Parafuso ortopédico que cria sua própria rosca no osso durante a inserção, sem precisar de perfuração prévia com macho de rosca.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%AUTO%')
       and unaccent(nome) ilike unaccent('%ROSQ%'));

update itens set resumo_uso = 'Usado em fraturas do colo do fêmur, permite compressão controlada do foco da fratura conforme o paciente se movimenta.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%DESLIZANTE%'));

update itens set resumo_uso = 'Usado na fixação de fraturas na face volar (palmar) do rádio/punho.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%VOLAR%'));

update itens set resumo_uso = 'Implante inserido no pedículo de uma vértebra, usado em cirurgias de fixação da coluna vertebral.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%PEDICULAR%'));

update itens set resumo_uso = 'Parafuso usado pra fixar o componente acetabular (lado da bacia) de uma prótese de quadril.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%ACETABULAR%'));

update itens set resumo_uso = 'Usado na fixação de lesões da articulação acrômio-clavicular (ombro).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%A/C%'));

update itens set resumo_uso = 'Usado na fixação de lesões da articulação acrômio-clavicular (ombro).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%')
       and unaccent(nome) ilike unaccent('%AC%'));

update itens set resumo_uso = 'Implante ortopédico (parafuso) usado para fixação de fraturas ósseas ou de uma placa/haste de osteossíntese.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PARAFUSO%'));

update itens set resumo_uso = 'Implante inserido dentro do canal do fêmur pra estabilizar uma fratura do osso longo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%HASTE%')
       and unaccent(nome) ilike unaccent('%FEMORAL%'));

update itens set resumo_uso = 'Implante inserido dentro do canal da tíbia pra estabilizar uma fratura do osso longo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%HASTE%')
       and unaccent(nome) ilike unaccent('%TIBIAL%'));

update itens set resumo_uso = 'Implante inserido dentro do canal medular de um osso longo pra estabilizar uma fratura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%HASTE%')
       and unaccent(nome) ilike unaccent('%INTRAMEDULAR%'));

update itens set resumo_uso = 'Implante metálico fixado ao osso com parafusos pra estabilizar uma fratura — o formato (reta, L, T, DHS) e a região (ex: tíbia, clavícula) variam conforme a fratura a tratar.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PLACA%'));

update itens set resumo_uso = 'Implante metálico de pequeno porte, fixado com parafusos, usado em fraturas de ossos pequenos (mãos, face).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MINI%')
       and unaccent(nome) ilike unaccent('%PLACA%'));

update itens set resumo_uso = 'Pino rosqueado inserido no osso, usado como ponto de fixação de um fixador externo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINO%')
       and unaccent(nome) ilike unaccent('%SCHANZ%'));

update itens set resumo_uso = 'Pino usado pra travar/estabilizar um implante ortopédico (ex: haste intramedular) no osso.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINO%')
       and unaccent(nome) ilike unaccent('%TRAVA%'));

update itens set resumo_uso = 'Usado em fraturas do colo do fêmur, permite compressão controlada do foco da fratura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINO%')
       and unaccent(nome) ilike unaccent('%DESLIZANTE%'));

update itens set resumo_uso = 'Implante metálico usado pra fixação temporária ou definitiva de fragmentos ósseos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINO%'));

update itens set resumo_uso = 'Componente de uma prótese articular (joelho/quadril) que substitui a superfície do fêmur.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%COMPONENTE%')
       and unaccent(nome) ilike unaccent('%FEMORAL%'));

update itens set resumo_uso = 'Componente de uma prótese de joelho que substitui a superfície articular da tíbia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%COMPONENTE%')
       and unaccent(nome) ilike unaccent('%TIBIAL%'));

update itens set resumo_uso = 'Componente de uma prótese de joelho (platô tibial) que substitui a superfície articular da tíbia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PLATO%')
       and unaccent(nome) ilike unaccent('%TIBIAL%'));

update itens set resumo_uso = 'Componente de uma prótese de quadril que substitui a cavidade óssea (acetábulo) onde a cabeça do fêmur se encaixa.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ACETABULO%'));

update itens set resumo_uso = 'Revestimento interno do componente acetabular de uma prótese de quadril, por onde a cabeça femoral desliza.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LINER%')
       and unaccent(nome) ilike unaccent('%ACETABULO%'));

update itens set resumo_uso = 'Componente esférico de uma prótese de quadril que substitui a cabeça do fêmur, encaixando no acetábulo.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CABECA%')
       and unaccent(nome) ilike unaccent('%FEMORAL%'));

update itens set resumo_uso = 'Implante usado para substituir uma articulação do quadril danificada.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PROTESE%')
       and unaccent(nome) ilike unaccent('%FEMORAL%'));

update itens set resumo_uso = 'Prótese parcial de quadril (substitui só a cabeça do fêmur, não o acetábulo), usada principalmente em fraturas do colo do fêmur de pacientes idosos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PROTESE%')
       and unaccent(nome) ilike unaccent('%THOMPSON%'));

update itens set resumo_uso = 'Dispositivo usado para estabilizar uma fratura por fora do corpo, com pinos que atravessam a pele até o osso, sem implante interno.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIXADOR%')
       and unaccent(nome) ilike unaccent('%EXTERNO%'));

update itens set resumo_uso = 'Dispositivo usado para imobilizar e proteger a coluna cervical, geralmente após trauma.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%COLAR%')
       and unaccent(nome) ilike unaccent('%CERVICAL%'));

update itens set resumo_uso = 'Usado dentro do canal do osso pra limitar até onde o cimento ósseo se espalha durante a fixação de uma prótese.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%RESTRITOR%')
       and unaccent(nome) ilike unaccent('%CIMENTO%'));

update itens set resumo_uso = 'Instrumento usado para cortar ou esculpir osso durante uma cirurgia ortopédica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%OSTEOTOMO%'));

update itens set resumo_uso = 'Instrumento cirúrgico usado para remover (raspar) pequenos fragmentos de osso.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GOIVA%'));

update itens set resumo_uso = 'Instrumento usado para alavancar/mobilizar fragmentos ósseos durante uma cirurgia ortopédica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ALAVANCA%')
       and unaccent(nome) ilike unaccent('%OSSEA%'));

update itens set resumo_uso = 'Usada para perfurar o osso antes da inserção de um parafuso ou pino.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%BROCA%'));

update itens set resumo_uso = 'Instrumento cirúrgico usado para segurar e guiar a agulha durante a sutura de tecidos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PORTA%')
       and unaccent(nome) ilike unaccent('%AGULHA%'));

update itens set resumo_uso = 'Instrumento usado para segurar e manipular tecidos delicados durante a dissecção cirúrgica, sem esmagá-los.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%ANATOMICA%'));

update itens set resumo_uso = 'Instrumento usado para segurar e manipular tecidos durante a dissecção cirúrgica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%DISSEC%'));

update itens set resumo_uso = 'Pinça de preensão usada em cirurgias delicadas (ex: neurocirurgia, cirurgia plástica) para manipular tecidos pequenos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%ADSON%'));

update itens set resumo_uso = 'Instrumento usado para segurar e tracionar tecidos ou compressas durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%ALLIS%'));

update itens set resumo_uso = 'Pinça de preensão em anel, usada para segurar compressas/curativos ou tecidos durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%FOERSTER%'));

update itens set resumo_uso = 'Pinça hemostática, usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%ROCHESTER%'));

update itens set resumo_uso = 'Pinça hemostática com dentes na ponta, usada para pinçar tecidos/vasos com firmeza durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%KOCHER%'));

update itens set resumo_uso = 'Pinça hemostática, usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%KELLY%'));

update itens set resumo_uso = 'Pinça hemostática, usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%CRILE%'));

update itens set resumo_uso = 'Pinça hemostática curva de ponta fina, usada para dissecar e contornar estruturas (ex: vasos, ductos) em espaços profundos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%MIXTER%'));

update itens set resumo_uso = 'Pinça hemostática de pequeno porte (mosquito), usada para pinçar vasos finos e controlar sangramento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%HALSTE%'));

update itens set resumo_uso = 'Pinça hemostática de pequeno porte, usada para pinçar vasos finos e controlar sangramento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%MOSQUITO%'));

update itens set resumo_uso = 'Pinça usada para pinçar vasos sanguíneos e controlar sangramento durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%HEMOSTATICA%'));

update itens set resumo_uso = 'Pinça usada para fixar os campos cirúrgicos à pele do paciente, delimitando a área da cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%BACKHAUS%'));

update itens set resumo_uso = 'Pinça usada para antissepsia do campo cirúrgico e manipulação de gazes/compressas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%CHERON%'));

update itens set resumo_uso = 'Pinça usada em cirurgias de coluna/neurocirurgia para remover (ressecar) osso e tecido ligamentar.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%KERRISON%'));

update itens set resumo_uso = 'Pinça de preensão atraumática, usada principalmente em cirurgia vascular e cardíaca para manipular tecidos delicados e vasos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%DEBAKEY%'));

update itens set resumo_uso = 'Pinça de preensão com dentes finos, usada para segurar tecidos com firmeza durante a sutura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PINCA%')
       and unaccent(nome) ilike unaccent('%DENTE%')
       and unaccent(nome) ilike unaccent('%RATO%'));

update itens set resumo_uso = 'Instrumento cirúrgico usado para segurar e guiar a agulha durante a sutura de tecidos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PORTA%')
       and unaccent(nome) ilike unaccent('%AGULHAS%'));

update itens set resumo_uso = 'Tesoura cirúrgica robusta usada para corte de tecidos mais resistentes e fios de sutura grossos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TESOURA%')
       and unaccent(nome) ilike unaccent('%MAYO%'));

update itens set resumo_uso = 'Tesoura delicada usada para dissecção e corte de tecidos finos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TESOURA%')
       and unaccent(nome) ilike unaccent('%METZ%'));

update itens set resumo_uso = 'Tesoura delicada usada para dissecção e corte de tecidos finos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TES%')
       and unaccent(nome) ilike unaccent('%METZ%'));

update itens set resumo_uso = 'Tesoura cirúrgica robusta usada para corte de tecidos mais resistentes e fios de sutura grossos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TES%')
       and unaccent(nome) ilike unaccent('%MAYO%'));

update itens set resumo_uso = 'Usado para afastar as bordas da incisão e manter o campo cirúrgico exposto.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AFASTADOR%')
       and unaccent(nome) ilike unaccent('%FARABEUF%'));

update itens set resumo_uso = 'Afastador usado especificamente em cirurgias bucomaxilofaciais.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AFASTADOR%')
       and unaccent(nome) ilike unaccent('%OBWEGESER%'));

update itens set resumo_uso = 'Afastador de ponta romba/dentada, usado para afastar tecidos moles e manter o campo cirúrgico exposto.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AFASTADOR%')
       and unaccent(nome) ilike unaccent('%VOLKMANN%'));

update itens set resumo_uso = 'Instrumento usado para raspagem (curetagem) de tecido, comum em procedimentos ginecológicos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CURETA%')
       and unaccent(nome) ilike unaccent('%SIMON%'));

update itens set resumo_uso = 'Instrumento cirúrgico usado para raspagem (curetagem) de tecido ou osso.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CURETA%'));

update itens set resumo_uso = 'Cabo usado para acoplar a lâmina de bisturi durante incisões cirúrgicas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CABO%')
       and unaccent(nome) ilike unaccent('%BISTURI%'));

update itens set resumo_uso = 'Lâmina cortante descartável, encaixada no cabo de bisturi, usada em incisões cirúrgicas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LAMINA%')
       and unaccent(nome) ilike unaccent('%BISTURI%'));

update itens set resumo_uso = 'Tecido estéril usado para delimitar e proteger a área ao redor do campo cirúrgico.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CAMPO%')
       and unaccent(nome) ilike unaccent('%CIRURGICO%'));

update itens set resumo_uso = 'Caixa usada para acondicionar e organizar instrumentais cirúrgicos antes da esterilização.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ESTOJO%'));

update itens set resumo_uso = 'Clampe vascular usado para ocluir temporariamente um vaso durante a cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CLAMP%')
       and unaccent(nome) ilike unaccent('%BULLDOG%'));

update itens set resumo_uso = 'Usado para secção e sutura simultânea de tecidos em cirurgias, como ressecções intestinais.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GRAMPEADOR%')
       and unaccent(nome) ilike unaccent('%LINEAR%'));

update itens set resumo_uso = 'Usado para criar uma anastomose (reconexão) circular entre duas estruturas tubulares, como no intestino.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GRAMPEADOR%')
       and unaccent(nome) ilike unaccent('%CIRCULAR%'));

update itens set resumo_uso = 'Usado para fechamento de pele/tecido, em substituição ou complemento à sutura com fio.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GRAMPO%'));

update itens set resumo_uso = 'Cânula rígida de aspiração usada em neurocirurgia pra remover sangue/fluidos do campo operatório com precisão.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ASPIRADOR%')
       and unaccent(nome) ilike unaccent('%FRAZIER%'));

update itens set resumo_uso = 'Instrumento usado para descolar/separar planos de tecido durante a dissecção cirúrgica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DESCOLADOR%'));

update itens set resumo_uso = 'Fita usada pra identificar/organizar instrumentais cirúrgicos entre as caixas da Central de Material e Esterilização.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FITA%')
       and unaccent(nome) ilike unaccent('%MARCA%'));

update itens set resumo_uso = 'Usados pra identificar visualmente a qual caixa/kit cirúrgico pertence cada instrumental, na Central de Material e Esterilização.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MARCADORES%')
       and unaccent(nome) ilike unaccent('%INSTRUMENTAIS%'));

update itens set resumo_uso = 'Usada na limpeza manual de instrumentais cirúrgicos antes da esterilização, removendo resíduos de sangue/tecido.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ESCOVA%')
       and unaccent(nome) ilike unaccent('%LIMPEZA%')
       and unaccent(nome) ilike unaccent('%INSTRUMENTAL%'));

update itens set resumo_uso = 'Tesoura microcirúrgica usada em cirurgia vascular/cardíaca para corte de precisão em vasos finos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DIETHRICH%'));

update itens set resumo_uso = 'Fio de sutura absorvível, usado para suturar tecidos internos que não precisam de retirada posterior do fio.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%CATGUT%'));

update itens set resumo_uso = 'Fio de sutura absorvível, usado para suturar tecidos internos que não precisam de retirada posterior do fio.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%CATGUT%'));

update itens set resumo_uso = 'Fio de sutura sintético absorvível, usado para suturar tecidos internos (músculo, subcutâneo).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%VICRYL%'));

update itens set resumo_uso = 'Fio de sutura sintético absorvível, usado para suturar tecidos internos (músculo, subcutâneo).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%VICRYL%'));

update itens set resumo_uso = 'Fio de sutura sintético absorvível de longa duração, usado em suturas que precisam de mais tempo de sustentação (ex: parede abdominal).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%PDS%'));

update itens set resumo_uso = 'Fio de sutura sintético não absorvível, usado em suturas de pele ou vasculares que precisam de resistência duradoura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%PROLENE%'));

update itens set resumo_uso = 'Fio de sutura sintético não absorvível, usado em suturas de pele ou vasculares que precisam de resistência duradoura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%PROLENE%'));

update itens set resumo_uso = 'Fio de sutura sintético não absorvível, usado principalmente para sutura de pele.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%MONONYLON%'));

update itens set resumo_uso = 'Fio de sutura sintético não absorvível, usado principalmente para sutura de pele.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%MONONYLON%'));

update itens set resumo_uso = 'Fio de sutura sintético trançado não absorvível, usado em suturas que exigem alta resistência (ex: tendão, ortopedia).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%ETHIBOND%'));

update itens set resumo_uso = 'Fio de sutura sintético não absorvível, usado em suturas de pele ou vasculares que precisam de resistência duradoura.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%POLIPROPILENO%'));

update itens set resumo_uso = 'Fio de sutura não absorvível de algodão, usado para ligaduras e suturas que não exigem absorção.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%ALGODAO%'));

update itens set resumo_uso = 'Fio de sutura não absorvível de linho, usado para ligaduras e suturas que não exigem absorção.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%LINHO%'));

update itens set resumo_uso = 'Fio de sutura não absorvível, usado para ligaduras e suturas que não exigem absorção.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%POLYCOT%'));

update itens set resumo_uso = 'Fio de sutura sintético absorvível, usado para suturar tecidos internos (músculo, subcutâneo).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%')
       and unaccent(nome) ilike unaccent('%ACIDO%')
       and unaccent(nome) ilike unaccent('%POLIGLICOLICO%'));

update itens set resumo_uso = 'Usado para sutura de tecidos após uma incisão cirúrgica ou ferimento — o tipo de fio varia conforme o tecido e o tempo de cicatrização necessário.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FIO%')
       and unaccent(nome) ilike unaccent('%SUTURA%'));

update itens set resumo_uso = 'Agulha de ponta não cortante, usada para puncionar um cateter/port implantado sem danificar a membrana de silicone.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AGULHA%')
       and unaccent(nome) ilike unaccent('%HUBER%'));

update itens set resumo_uso = 'Agulha fina usada para anestesia raquidiana (espinhal), injetando anestésico no espaço subaracnóideo da coluna.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AGULHA%')
       and unaccent(nome) ilike unaccent('%RAQUI%'));

update itens set resumo_uso = 'Usada para punção, aplicação de medicação ou coleta de sangue.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%AGULHA%'));

update itens set resumo_uso = 'Agulha com asas usada para punção venosa periférica, comum em pediatria e neonatologia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SCALP%'));

update itens set resumo_uso = 'Seringa de grande volume usada acoplada a uma bomba de infusão, para administração controlada e contínua de medicação.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SERINGA%')
       and unaccent(nome) ilike unaccent('%PERFUSORA%'));

update itens set resumo_uso = 'Usada para administração de medicação, aspiração de fluidos ou lavagem.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SERINGA%'));

update itens set resumo_uso = 'Dispositivo inserido pelo nariz até a faringe, usado para manter a via aérea desobstruída em pacientes com rebaixamento do nível de consciência.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CANULA%')
       and unaccent(nome) ilike unaccent('%NASOFARINGEA%'));

update itens set resumo_uso = 'Dispositivo inserido pela boca, usado para manter a via aérea desobstruída em pacientes sedados ou inconscientes.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CANULA%')
       and unaccent(nome) ilike unaccent('%GUEDEL%'));

update itens set resumo_uso = 'Interface nasal usada para fornecer pressão positiva contínua nas vias aéreas (CPAP), geralmente em suporte respiratório neonatal.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CANULA%')
       and unaccent(nome) ilike unaccent('%CPAP%'));

update itens set resumo_uso = 'Interface nasal usada para fornecer pressão positiva contínua nas vias aéreas (CPAP), geralmente em suporte respiratório neonatal.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PRONGA%')
       and unaccent(nome) ilike unaccent('%NASAL%'));

update itens set resumo_uso = 'Usada para manutenção de via aérea ou acesso a estruturas durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CANULA%'));

update itens set resumo_uso = 'Cateter periférico curto (jelco/abocath), inserido numa veia periférica pra acesso venoso.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DISPOSITIVO%')
       and unaccent(nome) ilike unaccent('%INTRAVENOSO%'));

update itens set resumo_uso = 'Tubo inserido no tórax pra drenar ar, sangue ou outros fluidos do espaço pleural, permitindo o pulmão reexpandir.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DRENO%')
       and unaccent(nome) ilike unaccent('%TORAX%'));

update itens set resumo_uso = 'Dreno em forma de "T" colocado na via biliar após cirurgia, usado para drenar bile e descomprimir o ducto enquanto cicatriza.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DRENO%')
       and unaccent(nome) ilike unaccent('%KEHR%'));

update itens set resumo_uso = 'Dreno laminar flexível usado para escoamento passivo de fluidos/secreções de uma cavidade cirúrgica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DRENO%')
       and unaccent(nome) ilike unaccent('%PENROSE%'));

update itens set resumo_uso = 'Usado para escoamento de fluidos e secreções de uma cavidade corporal, geralmente após cirurgia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%DRENO%'));

update itens set resumo_uso = 'Bolsa coletora usada no manejo de eliminações intestinais em pacientes com colostomia/ileostomia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%BOLSA%')
       and unaccent(nome) ilike unaccent('%COLOSTOMIA%'));

update itens set resumo_uso = 'Bolsa (tipo ambu/balão de anestesia) usada para ventilação manual do paciente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%BOLSA%')
       and unaccent(nome) ilike unaccent('%VENTILATORIA%'));

update itens set resumo_uso = 'Torneira/conector de múltiplas vias, usado para conectar várias linhas de infusão a um mesmo acesso venoso.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%POLIFIX%'));

update itens set resumo_uso = 'Usada para abrir múltiplos acessos numa mesma linha de infusão intravenosa.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TORNEIRA%'));

update itens set resumo_uso = 'Interface facial/nasal usada para suporte ventilatório não invasivo (VNI), sem necessidade de tubo na via aérea.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%VNI%'));

update itens set resumo_uso = 'Interface de máscara facial total usada para suporte ventilatório não invasivo (VNI).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%FITLIFE%'));

update itens set resumo_uso = 'Interface de máscara facial total usada para suporte ventilatório não invasivo (VNI).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%FACIAL%')
       and unaccent(nome) ilike unaccent('%TOTAL%'));

update itens set resumo_uso = 'Máscara acoplada ao circuito de anestesia, usada para ventilar o paciente antes da intubação ou em anestesia por máscara.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%FACIAL%')
       and unaccent(nome) ilike unaccent('%ANESTESIA%'));

update itens set resumo_uso = 'Usada para suporte ventilatório ou proteção das vias aéreas durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%FACIAL%'));

update itens set resumo_uso = 'Usada para imobilização da região facial/cervical durante sessões de radioterapia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MASCARA%')
       and unaccent(nome) ilike unaccent('%TERMOPLASTICA%'));

update itens set resumo_uso = 'Conjunto de dispositivos usado para suporte respiratório não invasivo, mantendo pressão positiva contínua nas vias aéreas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%SISTEMA%')
       and unaccent(nome) ilike unaccent('%CPAP%'));

update itens set resumo_uso = 'Guia flexível (bougie) inserido antes do tubo endotraqueal pra facilitar a intubação em vias aéreas difíceis.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%INTRODUTOR%')
       and unaccent(nome) ilike unaccent('%INTUBACAO%'));

update itens set resumo_uso = 'Equipamento de proteção individual estéril, usado em procedimentos invasivos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LUVA%')
       and unaccent(nome) ilike unaccent('%ESTERIL%'));

update itens set resumo_uso = 'Equipamento de proteção individual, usado em qualquer contato com o paciente ou manuseio de material contaminado.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LUVA%')
       and unaccent(nome) ilike unaccent('%PROCEDIMENTO%'));

update itens set resumo_uso = 'Equipamento de proteção individual estéril, usado em procedimentos cirúrgicos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LUVA%')
       and unaccent(nome) ilike unaccent('%CIR%'));

update itens set resumo_uso = 'Usada para identificar visualmente a classificação de risco/prioridade de atendimento do paciente, pelo protocolo de Manchester.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PULSEIRA%')
       and unaccent(nome) ilike unaccent('%MANCHESTER%'));

update itens set resumo_uso = 'Usada para identificar visualmente a classificação de risco/prioridade de atendimento do paciente.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PULSEIRA%')
       and unaccent(nome) ilike unaccent('%CLASSIFICACAO%'));

update itens set resumo_uso = 'Usada para identificação do paciente, garantindo segurança na assistência.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PULSEIRA%'));

update itens set resumo_uso = 'Recipiente usado para coleta de amostras biológicas para exame laboratorial.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%COLETOR%'));

update itens set resumo_uso = 'Usada para fixação de curativos, imobilização e compressão em grandes áreas do corpo, como tronco ou membros.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ATADURA%'));

update itens set resumo_uso = 'Usada para fixação de curativos nos membros, sem precisar de fita adesiva direto na pele.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MALHA%')
       and unaccent(nome) ilike unaccent('%TUBULAR%'));

update itens set resumo_uso = 'Fita adesiva hipoalergênica usada pra fixação de curativos e cateteres na pele.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MICROPORE%'));

update itens set resumo_uso = 'Usado para embalagem de materiais que serão esterilizados — permite a entrada do agente esterilizante mas barra a recontaminação depois.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PAPEL%')
       and unaccent(nome) ilike unaccent('%GRAU%')
       and unaccent(nome) ilike unaccent('%CIRURGICO%'));

update itens set resumo_uso = 'Usada para higiene e conforto de pacientes com incontinência ou mobilidade reduzida.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%FRALDA%'));

update itens set resumo_uso = 'Instrumento usado para afastar as paredes de uma cavidade corporal (ex: vaginal) e permitir o exame/procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ESPECULO%'));

update itens set resumo_uso = 'Usado para proteger os olhos do recém-nascido durante a fototerapia (tratamento de icterícia com luz).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PROTETOR%')
       and unaccent(nome) ilike unaccent('%OCULAR%'));

update itens set resumo_uso = 'Papel usado para registro impresso do traçado do eletrocardiograma.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%BOBINA%')
       and unaccent(nome) ilike unaccent('%ECG%'));

update itens set resumo_uso = 'Prótese usada em cirurgia de reconstrução ou aumento mamário.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%PROTESE%')
       and unaccent(nome) ilike unaccent('%MAMA%'));

update itens set resumo_uso = 'Prótese usada em cirurgia de reconstrução ou aumento mamário.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%IMPLANTE%')
       and unaccent(nome) ilike unaccent('%MAMARIO%'));

update itens set resumo_uso = 'Cânula usada para coleta ou injeção de gordura em procedimentos de lipoenxertia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CAN%')
       and unaccent(nome) ilike unaccent('%LIPOFILLING%'));

update itens set resumo_uso = 'Instrumento inserido no útero pra mobilizá-lo e expor melhor o campo durante cirurgias ginecológicas laparoscópicas.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%MANIPULADOR%')
       and unaccent(nome) ilike unaccent('%UTERINO%'));

update itens set resumo_uso = 'Dispositivo descartável usado para realizar a circuncisão, protegendo a glande durante a secção do prepúcio.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ANEL%')
       and unaccent(nome) ilike unaccent('%CIRCUNCISAO%'));

update itens set resumo_uso = 'Cateter usado em procedimentos de ablação por cardioversão/eletrofisiologia para destruir o foco de tecido cardíaco responsável por uma arritmia.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%CATETER%')
       and unaccent(nome) ilike unaccent('%ABLACAO%'));

update itens set resumo_uso = 'Tubo usado para aspirar e/ou irrigar fluidos durante um procedimento cirúrgico endoscópico (ex: artroscopia, laparoscopia).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%TUBO%')
       and unaccent(nome) ilike unaccent('%ASPIRACAO%')
       and unaccent(nome) ilike unaccent('%IRRIGACAO%'));

update itens set resumo_uso = 'Usado para irrigação contínua de uma cavidade/articulação durante um procedimento cirúrgico (ex: artroscopia) ou lavagem vesical.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%EQUIPO%')
       and unaccent(nome) ilike unaccent('%IRRIGA%'));

update itens set resumo_uso = 'Usado para administração de dieta/nutrição enteral através de sonda, geralmente numa bomba de infusão.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%EQUIPO%')
       and unaccent(nome) ilike unaccent('%ENTERAL%'));

update itens set resumo_uso = 'Usado para administração controlada e contínua de medicação/fluidos via bomba de infusão.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%EQUIPO%')
       and unaccent(nome) ilike unaccent('%BOMBA%'));

update itens set resumo_uso = 'Usado para administração de soluções e medicação por via intravenosa.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%EQUIPO%'));

update itens set resumo_uso = 'Usado para administração controlada e contínua de medicação/fluidos via bomba de infusão.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%INFUSOR%')
       and unaccent(nome) ilike unaccent('%BOMBA%'));

update itens set resumo_uso = 'Usado para administração controlada e contínua de medicação ou fluidos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%INFUSOR%'));

update itens set resumo_uso = 'Conectado a um cateter arterial/venoso, converte a pressão sanguínea em sinal elétrico pro monitor exibir em tempo real.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%TRANSDUTOR%')
       and unaccent(nome) ilike unaccent('%PRESSAO%'));

update itens set resumo_uso = 'Tubo usado para conduzir o sangue do paciente até o dialisador e de volta, durante a hemodiálise.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%LINHA%')
       and unaccent(nome) ilike unaccent('%SANGUE%'));

update itens set resumo_uso = 'Conjunto usado pra aspiração de secreções durante um procedimento.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%ASPIRACAO%'));

update itens set resumo_uso = 'Usado para lavagem de fluidos/secreções durante procedimentos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%IRRIGADOR%'));

update itens set resumo_uso = 'Usado para aspiração de fluidos/secreções durante procedimentos.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%ASPIRADOR%'));

update itens set resumo_uso = 'Conjunto de materiais usado para o implante cirúrgico de um cateter de longa permanência (ex: quimioterapia, diálise).'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%IMPLANTE%')
       and unaccent(nome) ilike unaccent('%CATETER%'));

update itens set resumo_uso = 'Componente usado para vedar a entrada de instrumentos numa bainha/trocarte durante cirurgia laparoscópica.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%KIT%')
       and unaccent(nome) ilike unaccent('%VEDANTE%'));

update itens set resumo_uso = 'Instrumento usado para dilatar progressivamente um vaso sanguíneo durante um procedimento vascular.'
  where deleted_at is null
    and (resumo_uso = '' or resumo_uso in (select texto from _old_resumo_textos))
    and (unaccent(nome) ilike unaccent('%GARRET%'));


drop table if exists _old_resumo_textos;
