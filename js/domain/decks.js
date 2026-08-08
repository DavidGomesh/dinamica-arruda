import { BUILT_IN_CONTENT } from "../data/content.js";

function activeItems(state, game) {
  const disabled = new Set(state.content.disabledBuiltInIds);
  return [
    ...(BUILT_IN_CONTENT[game] || []).filter((item) => !disabled.has(item.id)),
    ...state.content.custom.filter((item) => item.game === game && item.active),
  ];
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function createDeck(state, game, { random = Math.random } = {}) {
  const items = activeItems(state, game);
  if (!items.length) throw new Error("Não há conteúdo ativo para montar o baralho.");
  return { ...state, decks: { ...state.decks, [game]: {
    remainingIds: shuffled(items.map((item) => item.id), random), usedIds: [],
  } } };
}

export function drawNext(state, game) {
  const deck = state.decks[game];
  if (!deck) throw new Error("Monte o baralho antes de sortear.");
  if (!deck.remainingIds.length) return { state, item: null, exhausted: true };
  const [id, ...remainingIds] = deck.remainingIds;
  const item = activeItems(state, game).find((candidate) => candidate.id === id);
  const nextDeck = { remainingIds, usedIds: [...deck.usedIds, id] };
  return {
    state: { ...state, decks: { ...state.decks, [game]: nextDeck } },
    item,
    exhausted: false,
  };
}
