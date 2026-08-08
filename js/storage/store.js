export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "dinamica-arruda.state";

export function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    players: [],
    settings: {
      soundEffects: true,
      games: {
        mimica: { durationSeconds: 40, challengesPerTurn: 3 },
        palavraNaTesta: { durationSeconds: 90 },
        quemMaisProvavel: {},
      },
    },
    content: { custom: [], disabledBuiltInIds: [] },
    decks: {},
    matches: [],
    activeMatch: null,
  };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function validTimestamp(value) {
  return value && typeof value.instant === "string" && !Number.isNaN(Date.parse(value.instant))
    && typeof value.timeZone === "string" && Number.isFinite(value.offsetMinutes);
}

function validPlayer(player) {
  return player && ["id", "name", "color", "textColor", "icon"].every((field) => typeof player[field] === "string" && player[field])
    && ["auto", "manual"].includes(player.textColorMode) && typeof player.archived === "boolean";
}

function validMatch(match) {
  return match && typeof match.id === "string" && typeof match.game === "string"
    && Array.isArray(match.playerIds) && typeof match.state === "string"
    && validTimestamp(match.createdAt) && (match.startedAt === null || validTimestamp(match.startedAt))
    && (match.endedAt === null || validTimestamp(match.endedAt)) && Array.isArray(match.events)
    && match.events.every((event) => typeof event.id === "string" && typeof event.type === "string" && validTimestamp(event.occurredAt));
}

export function validateState(input) {
  const validSettings = input?.settings && typeof input.settings.soundEffects === "boolean"
    && Number.isInteger(input.settings.games?.mimica?.durationSeconds)
    && Number.isInteger(input.settings.games?.mimica?.challengesPerTurn)
    && Number.isInteger(input.settings.games?.palavraNaTesta?.durationSeconds);
  const validContent = input?.content && Array.isArray(input.content.custom)
    && Array.isArray(input.content.disabledBuiltInIds)
    && input.content.custom.every((item) => typeof item.id === "string" && typeof item.game === "string"
      && typeof item.text === "string" && typeof item.active === "boolean");
  const validDecks = input?.decks && typeof input.decks === "object" && !Array.isArray(input.decks)
    && Object.values(input.decks).every((deck) => Array.isArray(deck.remainingIds) && Array.isArray(deck.usedIds));
  const valid = input?.schemaVersion === SCHEMA_VERSION && Array.isArray(input.players)
    && input.players.every(validPlayer) && validSettings && validContent && validDecks
    && Array.isArray(input.matches) && input.matches.every(validMatch)
    && (input.activeMatch === null || validMatch(input.activeMatch));
  if (!valid) throw new Error("Estado com estrutura inválida.");
  return input;
}

function migrate(input) {
  if (!input || typeof input !== "object") throw new Error("Estado local sem estrutura válida.");
  if (input.schemaVersion === SCHEMA_VERSION) return validateState(input);
  if (input.schemaVersion === 0 || input.schemaVersion === undefined) {
    const defaults = createDefaultState();
    return validateState({
      ...defaults,
      ...input,
      schemaVersion: SCHEMA_VERSION,
      players: Array.isArray(input.players) ? input.players : defaults.players,
      matches: Array.isArray(input.matches) ? input.matches : defaults.matches,
      activeMatch: input.activeMatch || null,
      settings: {
        ...defaults.settings,
        ...(input.settings || {}),
        games: {
          ...defaults.settings.games,
          ...(input.settings?.games || {}),
          mimica: { ...defaults.settings.games.mimica, ...(input.settings?.games?.mimica || {}) },
          palavraNaTesta: { ...defaults.settings.games.palavraNaTesta, ...(input.settings?.games?.palavraNaTesta || {}) },
        },
      },
      content: { ...defaults.content, ...(input.content || {}) },
      decks: input.decks && typeof input.decks === "object" ? input.decks : defaults.decks,
    });
  }
  throw new Error(`Versão de dados ${input.schemaVersion} não suportada.`);
}

function defaultRecoveryId() {
  return `recovery-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function createStore({ storage = globalThis.localStorage, key = STORAGE_KEY, recoveryId = defaultRecoveryId } = {}) {
  let lastWarning = "";
  function load() {
    const raw = storage.getItem(key);
    if (!raw) return createDefaultState();
    try {
      return copy(migrate(JSON.parse(raw)));
    } catch (error) {
      storage.setItem(`${key}.${recoveryId()}`, raw);
      lastWarning = "Os dados locais estavam inválidos. Uma cópia de recuperação foi preservada.";
      return createDefaultState();
    }
  }
  function replace(nextState) {
    const valid = migrate(nextState);
    storage.setItem(key, JSON.stringify(valid));
    return copy(valid);
  }
  function update(reducer) {
    return replace(reducer(load()));
  }
  return {
    load,
    replace,
    update,
    clear() { storage.removeItem(key); },
    get lastWarning() { return lastWarning; },
  };
}
