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

function migrate(input) {
  if (!input || typeof input !== "object") throw new Error("Estado local sem estrutura válida.");
  if (input.schemaVersion === SCHEMA_VERSION) return { ...createDefaultState(), ...input };
  if (input.schemaVersion === 0 || input.schemaVersion === undefined) {
    return {
      ...createDefaultState(),
      ...input,
      schemaVersion: SCHEMA_VERSION,
      settings: { ...createDefaultState().settings, ...(input.settings || {}) },
    };
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
