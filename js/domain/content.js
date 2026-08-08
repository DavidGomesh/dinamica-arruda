import { BUILT_IN_CONTENT } from "../data/content.js";
import { normalizeName } from "./players.js";

const GAMES = Object.keys(BUILT_IN_CONTENT);

function requireGame(game) {
  if (!GAMES.includes(game)) throw new Error("Jogo de conteúdo inválido.");
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() || `conteudo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateText(state, game, text, ignoredId) {
  requireGame(game);
  const clean = text?.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("O texto do conteúdo não pode ser vazio.");
  const normalized = normalizeName(clean);
  const duplicate = state.content.custom.some((item) => item.game === game
    && item.id !== ignoredId && normalizeName(item.text) === normalized);
  if (duplicate) throw new Error("Conteúdo personalizado duplicado neste jogo.");
  return clean;
}

export function addCustomContent(state, input, dependencies = {}) {
  const text = validateText(state, input.game, input.text);
  const item = {
    id: (dependencies.createId || defaultId)(), game: input.game, text, active: true,
  };
  return { ...state, content: { ...state.content, custom: [...state.content.custom, item] } };
}

export function updateCustomContent(state, id, changes) {
  const current = state.content.custom.find((item) => item.id === id);
  if (!current) throw new Error("Conteúdo personalizado não encontrado.");
  const game = changes.game || current.game;
  const text = validateText(state, game, changes.text ?? current.text, id);
  const next = { ...current, ...changes, id, game, text };
  return { ...state, content: { ...state.content,
    custom: state.content.custom.map((item) => item.id === id ? next : item),
  } };
}

export function toggleCustomContent(state, id, active) {
  return updateCustomContent(state, id, { active });
}

export function deleteCustomContent(state, id) {
  return { ...state, content: { ...state.content,
    custom: state.content.custom.filter((item) => item.id !== id),
  } };
}

export function toggleBuiltInContent(state, game, id, active) {
  requireGame(game);
  if (!BUILT_IN_CONTENT[game].some((item) => item.id === id)) throw new Error("Conteúdo embutido não encontrado.");
  const disabled = new Set(state.content.disabledBuiltInIds);
  if (active) disabled.delete(id); else disabled.add(id);
  return { ...state, content: { ...state.content, disabledBuiltInIds: [...disabled] } };
}
