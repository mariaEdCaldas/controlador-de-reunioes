/**
 * Relação oficial Bairro → Região Urbana de Campo Grande/MS (as 7 regiões:
 * Centro, Segredo, Prosa, Bandeira, Anhanduizinho, Lagoa e Imbirussu),
 * transcrita da tabela de regiões do município.
 *
 * Serve para AGRUPAR as reuniões da agenda por região a partir do bairro
 * informado em cada reunião — o campo "Bairro / região" da reunião pode vir
 * como "Amambaí/Centro" (com a região após a barra) ou só como o bairro
 * ("Caiçara"). Nos dois casos `regiaoDaReuniao()` descobre a região.
 */

/** Ordem em que as regiões aparecem na tela (do centro para as bordas). */
export const REGIOES_ORDEM = [
  'Centro',
  'Segredo',
  'Prosa',
  'Bandeira',
  'Anhanduizinho',
  'Lagoa',
  'Imbirussu',
];

/** Rótulo mostrado para cada região (o Segredo aparece como "Mata do Segredo"). */
export const REGIAO_ROTULO = {
  Centro: 'Centro',
  Segredo: 'Mata do Segredo',
  Prosa: 'Prosa',
  Bandeira: 'Bandeira',
  Anhanduizinho: 'Anhanduizinho',
  Lagoa: 'Lagoa',
  Imbirussu: 'Imbirussu',
  'Sem região': 'Sem região definida',
};

/**
 * Cor de cada região no calendário — a mesma paleta que o gabinete já usava no
 * quadro (Miro). Validada: as 7 se distinguem inclusive para daltônicos.
 */
export const REGIAO_COR = {
  Centro: '#86d5ec',
  Segredo: '#e9a85c',
  Prosa: '#f08cc4',
  Bandeira: '#f3e97e',
  Anhanduizinho: '#a93b6e',
  Lagoa: '#8fd14f',
  Imbirussu: '#9c8fd9',
};

/** Ordem das regiões na legenda do calendário (igual ao quadro). */
export const REGIOES_LEGENDA = ['Anhanduizinho', 'Bandeira', 'Prosa', 'Lagoa', 'Imbirussu', 'Centro', 'Segredo'];

/** Preto ou branco sobre a cor, pelo brilho — para o número do dia ficar legível. */
export function textoSobre(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return '#1c2b22';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1c2b22' : '#ffffff';
}

/** Bairros de cada região, conforme a tabela oficial (imagem de regiões). */
const BAIRROS_POR_REGIAO = {
  Centro: [
    'Amambai', 'Amambaí', 'Bela Vista', 'Cabreúva', 'Vila Célia', 'Ieda',
    'Vila Progresso', 'Centro', 'Cruzeiro', 'Glória', 'Itanhangá',
    'Jardim dos Estados', 'Monte Líbano', 'Planalto', 'São Bento', 'São Francisco',
    'Eudes Costa', 'Santa Dorothéia', 'Vila Rosa', 'Vila Rica', 'Manoel da Costa Lima',
    'Vila Antônio Vendas', 'Vila Antonio Vendas',
  ],
  Segredo: [
    'Jardim Anache', 'Cerejeiras', 'Coronel Antonino', 'Monte Castelo', 'José Abrão',
    'Jardim Imperial', 'Nasser', 'Nova Lima', 'Seminário', 'Presidente', 'Vida Nova',
    'Jardim Colúmbia', 'Jardim Columbia', 'Tarsila do Amaral', 'Parque dos Laranjais',
    'Campo Belo', 'Campo Novo', 'Otávio Pécora', 'Estrela do Sul', 'Vila Santa Luzia',
    'Santa Luzia', 'Jardim Guanabara', 'Nascente do Segredo', 'Nossa Senhora Aparecida',
    'Nossa Sra Aparecida', 'Nossa Sª Aparecida', 'Vila Marli',
  ],
  Prosa: [
    'Autonomista', 'Carandá', 'Vila Nascente', 'Chácara Cachoeira', 'Cidade Jardim',
    'Chácara dos Poderes', 'Estrela Dalva', 'Margarida', 'Mata do Jacinto', 'Noroeste',
    'Vila Futurista', 'Danúbio Azul', 'Vila Danúbio Azul', 'Novos Estados', 'Santa Fé', 'Taquaral Bosque',
    'Jardim Montevideu', 'Jardim Montevidéu', 'Veraneio', 'Jardim Veraneio', 'Vivendas do Bosque',
    'Vila Miguel Couto', 'Novo Maranhão', 'Nova Bahia', 'Carandá Bosque',
    'Residencial Sóter', 'Residencial Soter', 'Res Sóter', 'Res Soter',
  ],
  Bandeira: [
    'Maria Aparecida Pedrossian', 'Tiradentes', 'São Lourenço', 'Vilasboas',
    'Vilas Boas', 'TV Morena', 'Jardim Paulista', 'Dr. Albuquerque',
    'Carlota', 'Rita Vieira', 'Universitário', 'Moreninha',
    'Arnaldo Estevão', 'Recanto dos Rouxinóis', 'Coopharádio', 'Vila Santo Eugênio',
    'Cidade Morena', 'Jardim Flamboyant', 'Jardim Itamaracá', 'Jardim Noroeste',
    'Jardim Pacaembu', 'Residencial Oiti', 'Moreninha III', 'Moreninha II', 'Moreninha I',
    'Moreninha IV', 'Moreninha V', 'Jardim Tropical', 'Vila Cidade Morena',
  ],
  Anhanduizinho: [
    'Aero Rancho', 'Alves Pereira', 'América', 'Centenário', 'Centro-Oeste',
    'Centro Oeste', 'Guanandi', 'Jacy', 'Jockey Clube', 'Jockey Club', 'Lageado',
    'Los Angeles', 'Parati', 'Pioneiros', 'Piratininga', 'Taquarussu',
    'Jardim das Hortências', 'Jardim das Hortênsias', 'Doutor Albuquerque',
    'Guanandi II', 'Granja São Luiz', 'Botafogo',
    'Dom Antônio', 'Vila Santa Branca', 'Carvalho', 'Jardim Canguru', 'São Pedo',
    'São Pedro', 'Jardim Colibri II', 'Jardim Colonial', 'Jardim das Macaúbas',
    'Jardim das Meninas', 'Jardim Morenão', 'Paulo Coelho Machado', 'Iracy Coelho',
    'Residencial Betaville', 'Jardim Uirapuru', 'Jardim Pênfigo', 'Jardim Penfigo',
    'Jd Pênfigo', 'Jd Penfico',
  ],
  Lagoa: [
    'Bandeirantes', 'Jardim Batistão', 'Batistão', 'Caiçara', 'Caiobá',
    'Coophavila II', 'Coophavila', 'Leblon', 'Santa Emília', 'Aquários 1',
    'Aquários 2', 'São Conrado', 'Taveirópolis', 'Belo Horizonte', 'Tarumã',
    'Tijuca', 'União', 'Vila Jussara', 'Bon Jardim', 'Bonjardim', 'Bonança', 'Buriti',
    'Moreninhas', 'Vila Kellen', 'Vila Anahy', 'Jardim Tarumã', 'Vila Bandeirantes',
  ],
  Imbirussu: [
    'Região do Imbirussu', 'Indubrasil', 'Nova Campo Grande', 'Panamá', 'Popular',
    'Santo Amaro', 'Santa Carmélia', 'Santo Antônio', 'Vila Sobrinho', 'Zé Pereira',
    'Vila Alba', 'Jardim Carioca', 'Vila Bordon', 'Coophatrabalho', 'Coopatrabalho',
    'Coop Trabalho', 'Silvia Regina',
    'Palmira', 'Vila Eliane', 'Vila Corumbá', 'Vila Almeida', 'Jardim Petrópolis',
    'Jardim Imá', 'Lar do Trabalhador', 'Núcleo Industrial', 'Jardim Canadá', 'Jd Canadá',
  ],
};

/**
 * Sugestões para o campo "Bairro / região" do cadastro de reunião: cada bairro
 * oficial já com a sua região, no formato "Bairro/Região". Escolhendo da lista,
 * o valor guardado carrega a região (após a barra), então a reunião sempre fica
 * com região definida na agenda por região.
 */
export const SUGESTOES_BAIRRO = [
  ...new Set(
    Object.entries(BAIRROS_POR_REGIAO).flatMap(([regiao, bairros]) =>
      bairros.map((b) => `${b}/${regiao}`)
    )
  ),
].sort((a, b) => a.localeCompare(b, 'pt'));

/** Normaliza para comparar sem depender de acento, caixa ou espaços extras. */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Índice bairro(normalizado) -> região, montado uma vez.
const INDICE_BAIRRO = {};
for (const [regiao, bairros] of Object.entries(BAIRROS_POR_REGIAO)) {
  for (const b of bairros) INDICE_BAIRRO[normalizar(b)] = regiao;
}

// Nomes de região aceitos após a barra (inclui "Mata do Segredo" -> Segredo).
const INDICE_REGIAO = {};
for (const r of REGIOES_ORDEM) INDICE_REGIAO[normalizar(r)] = r;
INDICE_REGIAO[normalizar('Mata do Segredo')] = 'Segredo';

/**
 * Descobre a região de uma reunião a partir do texto do campo "Bairro / região".
 * 1º) se vier "Bairro/Região" e a parte após a barra for uma região conhecida,
 *     respeita ela (foi o que a pessoa escolheu/cadastrou);
 * 2º) senão, procura o bairro na relação oficial.
 * Retorna null quando não dá para identificar.
 */
export function regiaoDaReuniao(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;

  // Coophavila e Coophavila II são sempre Lagoa — qualquer grafia (Coophavilla,
  // Coophavila 2, Copavila…) resolve sozinha, sem virar uma lista enorme. O
  // "avil" evita confundir com Coophatrabalho/Coopharádio (que não têm "avil").
  const norm0 = normalizar(v);
  if (/^coo?p/.test(norm0) && norm0.includes('avil')) return 'Lagoa';

  if (v.includes('/')) {
    const sufixo = normalizar(v.split('/').pop());
    if (INDICE_REGIAO[sufixo]) return INDICE_REGIAO[sufixo];
    // A barra pode separar bairro/bairro; tenta o começo como bairro.
    const inicio = normalizar(v.split('/')[0]);
    if (INDICE_BAIRRO[inicio]) return INDICE_BAIRRO[inicio];
  }

  const chave = normalizar(v);
  if (INDICE_REGIAO[chave]) return INDICE_REGIAO[chave]; // digitou só a região
  return INDICE_BAIRRO[chave] ?? null;
}

/**
 * Agrupa uma lista por região (na ordem oficial), devolvendo só as regiões que
 * têm itens; os não identificados caem em "Sem região" no fim.
 *
 * `obterBairro` diz de onde tirar o texto do bairro em cada item — por padrão o
 * campo `regiao` (reuniões); para coordenadores passe `(c) => c.bairro`.
 */
export function agruparPorRegiao(itens, obterBairro = (item) => item.regiao) {
  const mapa = new Map();
  for (const item of itens) {
    const regiao = regiaoDaReuniao(obterBairro(item)) ?? 'Sem região';
    if (!mapa.has(regiao)) mapa.set(regiao, []);
    mapa.get(regiao).push(item);
  }
  return [...REGIOES_ORDEM, 'Sem região']
    .filter((regiao) => mapa.has(regiao))
    .map((regiao) => ({ regiao, rotulo: REGIAO_ROTULO[regiao], itens: mapa.get(regiao) }));
}

/**
 * Contagem por região para a visão de relance (painel BI): TODAS as 7 regiões
 * (mesmo com 0), ordenadas da com mais itens para a com menos. "Sem região"
 * entra no fim apenas se houver algum. Traz também o total e o maior valor.
 */
export function contagemPorRegiao(itens, obterBairro = (item) => item.regiao) {
  const contagem = Object.fromEntries(REGIOES_ORDEM.map((r) => [r, 0]));
  let semRegiao = 0;
  for (const item of itens) {
    const regiao = regiaoDaReuniao(obterBairro(item));
    if (regiao) contagem[regiao] += 1;
    else semRegiao += 1;
  }

  const linhas = REGIOES_ORDEM.map((regiao) => ({
    regiao,
    rotulo: REGIAO_ROTULO[regiao],
    n: contagem[regiao],
  }));
  if (semRegiao > 0) {
    linhas.push({ regiao: 'Sem região', rotulo: REGIAO_ROTULO['Sem região'], n: semRegiao });
  }
  linhas.sort((a, b) => b.n - a.n);

  const total = itens.length;
  const maximo = linhas.reduce((m, l) => Math.max(m, l.n), 0);
  return { linhas, total, maximo };
}
