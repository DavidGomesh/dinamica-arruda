function items(game, values) {
  return values.map((text, index) => ({ id: `${game}-${index + 1}`, game, text }));
}

function combinations(left, right, connector = " ") {
  return left.flatMap((first) => right.map((second) => `${first}${connector}${second}`));
}

const mimeActions = [
  "Imitar", "Desenhar no ar", "Fugir de", "Conversar com", "Procurar", "Fotografar",
  "Carregar", "Ensinar", "Acordar", "Dançar com", "Cozinhar para", "Passear com",
  "Vestir", "Consertar", "Surpreender", "Equilibrar", "Perseguir", "Proteger",
  "Escovar", "Abraçar",
];
const mimeThings = [
  "um guepardo", "um robô", "uma melancia", "um astronauta", "um guarda-chuva",
  "um pinguim", "uma bicicleta", "um violão", "um dragão", "um ET",
];

const foreheadGroups = [
  ["Animal", ["Guepardo", "Capivara", "Pinguim", "Girafa", "Golfinho", "Coruja", "Tartaruga", "Leão", "Tamanduá", "Canguru"]],
  ["Objeto", ["Guarda-chuva", "Liquidificador", "Bicicleta", "Panela", "Travesseiro", "Violão", "Mochila", "Relógio", "Lanterna", "Patins"]],
  ["Comida", ["Brigadeiro", "Cuscuz", "Pipoca", "Melancia", "Pizza", "Açaí", "Tapioca", "Sorvete", "Banana", "Pão de queijo"]],
  ["Lugar", ["Praia", "Cinema", "Biblioteca", "Parque", "Aeroporto", "Circo", "Padaria", "Museu", "Estádio", "Feira"]],
  ["Personagem", ["Astronauta", "Pirata", "Detetive", "Super-herói", "Mágico", "Sereia", "Robô", "ET", "Ninja", "Rei"]],
];
const foreheadQualifiers = ["", " famoso", " gigante", " de brinquedo"];
const foreheadWords = foreheadGroups.flatMap(([, words]) => combinations(words, foreheadQualifiers, ""));

const questionStarts = [
  "Quem é mais provável de", "Quem seria a primeira pessoa a", "Quem conseguiria", "Quem toparia",
  "Quem faria todo mundo rir ao", "Quem teria coragem de", "Quem se sairia melhor ao", "Quem acabaria",
  "Quem lembraria de", "Quem inventaria um jeito de",
];
const questionEnds = [
  "adotar um animal inesperado?", "virar artista de circo?", "organizar uma viagem surpresa?",
  "cozinhar para vinte pessoas?", "dormir durante um filme de ação?", "achar um tesouro perdido?",
  "conversar com um ET?", "ganhar um concurso de dança?", "errar o caminho com muita confiança?",
  "montar um móvel sem manual?", "cantar no karaokê?", "salvar o dia com uma ideia maluca?",
];

export const BUILT_IN_CONTENT = Object.freeze({
  mimica: items("mimica", combinations(mimeActions, mimeThings).slice(0, 160)),
  palavraNaTesta: items("palavraNaTesta", foreheadWords),
  quemMaisProvavel: items("quemMaisProvavel", combinations(questionStarts, questionEnds).slice(0, 110)),
});
