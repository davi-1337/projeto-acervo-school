/* O ACERVO — js/data/acervo.js
   Todo o texto da obra em um só lugar: fichas técnicas reais, legendas quebradas
   e as falas da entidade. O que é histórico aqui é verdadeiro; o resto, não. */
(function (A) {
  'use strict';

  /* Fichas reais — o acervo cita corretamente o que saqueou. */
  var PLATES = {
    piranesi_torre: {
      titulo: 'A Torre Redonda', autor: 'Giovanni Battista Piranesi', ano: '1761',
      tecnica: 'água-forte, 2ª edição de Le Carceri d’Invenzione',
      fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'Piranesi dizia desenhar prisões que nunca existiram. Nenhuma delas tem saída desenhada.'
    },
    piranesi_arco: {
      titulo: 'O Arco Gótico', autor: 'Giovanni Battista Piranesi', ano: '1761',
      tecnica: 'água-forte', fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'A escala não fecha: as figuras são pequenas demais para a arquitetura.'
    },
    piranesi_poco: {
      titulo: 'O Poço', autor: 'Giovanni Battista Piranesi', ano: '1761',
      tecnica: 'água-forte', fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'Escadas que descem para dentro de nada.'
    },
    goya_cao: {
      titulo: 'O Cão', autor: 'Francisco de Goya', ano: '1819–1823',
      tecnica: 'óleo sobre reboco, das Pinturas Negras',
      fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'Uma cabeça no canto de uma tela quase vazia. Goya pintou isto nas paredes da própria casa.'
    },
    goya_sono: {
      titulo: 'O sono da razão produz monstros', autor: 'Francisco de Goya', ano: '1799',
      tecnica: 'água-forte e água-tinta, Los Caprichos, prancha 43',
      fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'A legenda original diz apenas: “a fantasia abandonada pela razão produz monstros impossíveis”.'
    },
    dore_caronte: {
      titulo: 'Caronte', autor: 'Gustave Doré', ano: '1861',
      tecnica: 'xilogravura para o Inferno de Dante, Canto III',
      fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'A travessia é de mão única e não se paga com dinheiro.'
    },
    redon_olho: {
      titulo: 'O olho, como um balão bizarro, dirige-se ao infinito', autor: 'Odilon Redon', ano: '1882',
      tecnica: 'litografia, série Para Edgar Poe',
      fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'Um olho que sobe levando uma cabeça cortada. Redon chamava isso de “meu retrato”.'
    },
    friedrich_monge: {
      titulo: 'O Monge à Beira-Mar', autor: 'Caspar David Friedrich', ano: 'c. 1808–1810',
      tecnica: 'óleo sobre tela', fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'A figura é menor que um grão de areia do quadro. O mar ocupa quase tudo.'
    },
    bosch_inferno: {
      titulo: 'O Jardim das Delícias Terrenas — painel do inferno', autor: 'Hieronymus Bosch', ano: 'c. 1490–1510',
      tecnica: 'óleo sobre madeira', fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'O instrumento musical aparece como objeto de tortura. Nada aqui é metáfora.'
    },
    vesalius_figura: {
      titulo: 'Figura muscular', autor: 'Andreas Vesalius', ano: '1543',
      tecnica: 'xilogravura, De humani corporis fabrica',
      fonte: 'Wellcome Collection', licenca: 'CC BY 4.0',
      nota: 'O corpo é mostrado como paisagem: as pessoas ficam olhando a própria pele retirada.'
    },
    agoty_anatomia: {
      titulo: 'Anatomie générale des viscères', autor: 'Jacques-Fabien Gautier d’Agoty', ano: 'século XVIII',
      tecnica: 'maneira negra colorida à mão', fonte: 'Wellcome Collection', licenca: 'CC BY 4.0',
      nota: 'A cor existe para vender o livro. A cor existe porque a morte era bonita de ver.'
    },
    durer_melancolia: {
      titulo: 'Melencolia I', autor: 'Albrecht Dürer', ano: '1514',
      tecnica: 'gravura em metal', fonte: 'Wikimedia Commons', licenca: 'Domínio público',
      nota: 'Um anjo sentado, com todos os instrumentos do conhecimento ao redor, sem fazer nada.'
    },
    atget_sala: {
      titulo: 'A Embaixada da Áustria, 57 Rue de Varenne', autor: 'Eugène Atget', ano: 'c. 1900',
      tecnica: 'fotografia em placa de vidro', fonte: 'Getty Museum', licenca: 'Domínio público',
      nota: 'Atget fotografava Paris vazia para vender a referência a pintores. Ninguém aparece.'
    },
    vanitas: {
      titulo: 'Memento mori', autor: 'anônimo (Rijksmuseum)', ano: 'século XVII',
      tecnica: 'gravura', fonte: 'Rijksmuseum', licenca: 'CC0',
      nota: 'Na série original, cada estampa traz uma caveira. É uma coleção de avisos.' 
    }
  };

  /* Legendas da Sala das Legendas. Uma delas não descreve nada. */
  var LABELS = [
    { id: 'arq', texto: 'arquitetura para um corpo que não volta' },
    { id: 'cao', texto: 'o cão olha o que não está lá' },
    { id: 'sono', texto: 'o sono da razão, prancha 43' },
    { id: 'olho', texto: 'olho, balão, infinito' },
    { id: 'monge', texto: 'o monge não vê o mar' },
    { id: 'corpo', texto: 'coração exposto, fig. 7' },
    { id: 'orfa', texto: 'sem objeto' }
  ];

  var LINES = {
    entrada1: 'BEM-VINDO DE VOLTA.',
    entrada1b: 'esta é a sua primeira vez aqui. o registro discorda.',
    entrada2: 'o registro diz que você já esteve aqui.',
    pergunta: 'você já esteve neste lugar?',
    sim: 'então você sabe o que vem depois. eu não.',
    nao: 'então por que voltou?',
    arq3: 'segure ESPAÇO com os olhos fechados. a porta chega perto.',
    esp: 'alguém está repetindo o que você já fez, com atraso.',
    esp2: 'mantenha-se perto. encoste no que você foi.',
    esp3: 'não era você.',
    acervo: 'AQUI ESTÁ O QUE VOCÊ DEIXOU.',
    fim: 'o acervo agradece a sua doação.',
    fim2: 'a porta que você abriu continua aberta.'
  };

  /* As três portas da Sala da Arquitetura — cada uma é uma escolha registrada. */
  var PORTAS = [
    { id: 'I', nome: 'A Torre Redonda', nota: 'a primeira gravura da série. nenhuma delas tem saída desenhada.' },
    { id: 'V', nome: 'O Poço', nota: 'escadas que descem para dentro de nada.' },
    { id: 'XIII', nome: 'O Arco Gótico', nota: 'a escala não fecha: as figuras são pequenas demais.' }
  ];

  /* Quatro desfechos distintos. O que decide é o que o visitante fez. */
  var FINAIS = {
    desvio: {
      sig: 'DESVIO',
      titulo: 'você não entrou.',
      corpo: ['a porta ficou aberta atrás de você.', 'o acervo não registra quem passa direto.'],
      nota: 'não há nada seu nesta parede. nem aqui, nem em nenhuma outra.'
    },
    doacao: {
      sig: 'DOAÇÃO',
      titulo: 'o acervo agradece a sua doação.',
      corpo: ['o que você deixou foi apagado por você mesmo.', 'guardamos uma cópia de tudo.'],
      nota: 'você não vai se lembrar disto. o acervo vai.'
    },
    aquisicao: {
      sig: 'AQUISIÇÃO',
      titulo: 'o acervo adquiriu a sua obra.',
      corpo: ['ela fica na parede, para sempre, com número de tombo e ficha técnica.', 'você pode voltar para vê-la. ela não vai mudar.'],
      nota: 'coleção particular de um museu que não existe.'
    },
    indecisao: {
      sig: 'INDECISÃO',
      titulo: 'você não decidiu nada.',
      corpo: ['o acervo decidiu por você: guardou tudo, sem apagar nada.', 'não é bondade. é arquivo.'],
      nota: 'o que não é decidido também é registrado.'
    }
  };

  /* Selos: a lista do que foi escolhido, impressa no fim. */
  var SELOS = {
    resposta: { sim: 'disse que já esteve aqui', nao: 'disse que não', nao_sei: 'disse que não sabe' },
    porta: { I: 'atravessou a porta I', V: 'atravessou a porta V', XIII: 'atravessou a porta XIII' },
    via: { olhos_fechados: 'de olhos fechados', imovel: 'sem se mexer' },
    parede: { corrigir: 'corrigiu a parede', recusar: 'recusou corrigir a parede' },
    duplo: { encostar: 'encostou no duplo', fugir: 'fugiu do duplo' },
    fim: { apagar: 'apagou o que deixou', deixar: 'deixou na parede', nada: 'não decidiu nada' }
  };

  /* Fechos por temperamento da visita (conforme · misto · recusa · imóvel). */
  var FECHOS = {
    conforme: ['você fez exatamente o que o acervo pediu. é o que ele esperava de você.',
      'sem resistência nenhuma. a visita saiu limpa.',
      'você colaborou com tudo. o acervo não sente nada, mas registra gratidão.'],
    misto: ['você cedeu em umas coisas e recusou outras. a visita ficou no meio.',
      'nada aqui foi inteiro — nem a sua obediência, nem a sua recusa.',
      'o acervo registra o meio como registra o resto: sem julgar.'],
    recusa: ['você não concordou com quase nada. o acervo guardou isso também.',
      'recusar é uma forma de responder, e foi a sua.',
      'a obra ficou torta porque você quis que ficasse.'],
    imovel: ['você mal se mexeu. quase não há você nesta parede.',
      'a tinta ficou quase vazia. também é um retrato.',
      'não fazer nada é a única coisa que o acervo não consegue arquivar.']
  };

  A.data = { PLATES: PLATES, LABELS: LABELS, LINES: LINES, PORTAS: PORTAS, FINAIS: FINAIS, SELOS: SELOS, FECHOS: FECHOS };
})(window.ACERVO = window.ACERVO || {});
