import { normalizeEquivalentText } from "./text.js";

const ACTIVE_PLAYER_LIMIT = 10;

function fullHex(color) {
  const value = color.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return value.split("").map((part) => part + part).join("");
  }
  if (/^[0-9a-f]{6}$/i.test(value)) return value;
  throw new Error("Escolha uma cor hexadecimal válida.");
}

export function contrastingTextColor(background) {
  const hex = fullHex(background);
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const luminance = (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]) / 255;
  return luminance > 0.55 ? "#111111" : "#ffffff";
}

function validateCandidate(players, candidate, ignoredId = null) {
  const name = candidate.name?.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Informe o nome do Jogador.");
  if (!candidate.color) throw new Error("Escolha uma cor para o Jogador.");
  fullHex(candidate.color);
  if (!candidate.icon) throw new Error("Escolha um ícone para o Jogador.");

  const activeOthers = players.filter((player) => !player.archived && player.id !== ignoredId);
  if (activeOthers.some((player) => normalizeEquivalentText(player.name) === normalizeEquivalentText(name))) {
    throw new Error("Já existe um Jogador ativo com esse nome.");
  }
  if (activeOthers.some((player) => player.icon === candidate.icon)) {
    throw new Error("Esse ícone já pertence a outro Jogador ativo.");
  }
  return name;
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() || `jogador-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addPlayer(state, input, dependencies = {}) {
  if (state.players.filter((player) => !player.archived).length >= ACTIVE_PLAYER_LIMIT) {
    throw new Error("O limite é de 10 Jogadores ativos.");
  }
  const name = validateCandidate(state.players, input);
  const manualTextColor = input.textColor?.trim();
  const player = {
    id: (dependencies.createId || defaultId)(),
    name,
    color: input.color,
    textColor: manualTextColor || contrastingTextColor(input.color),
    textColorMode: manualTextColor ? "manual" : "auto",
    icon: input.icon,
    archived: false,
  };
  return { ...state, players: [...state.players, player] };
}

export function updatePlayer(state, playerId, changes) {
  const current = state.players.find((player) => player.id === playerId);
  if (!current) throw new Error("Jogador não encontrado.");
  if (current.archived && changes.archived === false
    && state.players.filter((player) => !player.archived).length >= ACTIVE_PLAYER_LIMIT) {
    throw new Error("O limite é de 10 Jogadores ativos.");
  }
  if (changes.id !== undefined && changes.id !== playerId) {
    throw new Error("O identificador interno do Jogador é imutável.");
  }
  const candidate = { ...current, ...changes, id: playerId };
  const name = validateCandidate(state.players, candidate, playerId);
  const changesTextColor = Object.prototype.hasOwnProperty.call(changes, "textColor");
  const manualTextColor = changes.textColorMode === "auto"
    ? ""
    : changesTextColor ? changes.textColor : current.textColorMode === "manual" ? current.textColor : "";
  const next = {
    ...candidate,
    name,
    textColor: manualTextColor || contrastingTextColor(candidate.color),
    textColorMode: manualTextColor ? "manual" : "auto",
  };
  return {
    ...state,
    players: state.players.map((player) => player.id === playerId ? next : player),
  };
}

function playerHasHistory(state, playerId) {
  const matches = [...(state.matches || []), ...(state.activeMatch ? [state.activeMatch] : [])];
  return matches.some((match) => match.playerIds?.includes(playerId));
}

export function archiveOrDeletePlayer(state, playerId) {
  if (!state.players.some((player) => player.id === playerId)) {
    throw new Error("Jogador não encontrado.");
  }
  if (playerHasHistory(state, playerId)) {
    return {
      ...state,
      players: state.players.map((player) => player.id === playerId
        ? { ...player, archived: true }
        : player),
    };
  }
  return { ...state, players: state.players.filter((player) => player.id !== playerId) };
}

export { ACTIVE_PLAYER_LIMIT };
