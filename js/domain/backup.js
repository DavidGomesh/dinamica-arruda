import { migrateState, SCHEMA_VERSION, validateState } from "../storage/store.js";

export function createBackup(state, dependencies = {}) {
  validateState(state);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: (dependencies.now || (() => new Date()))().toISOString(),
    data: JSON.parse(JSON.stringify(state)),
  };
}

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error("O texto não contém JSON válido."); }
  if (![1, SCHEMA_VERSION].includes(backup.schemaVersion)) throw new Error("Versão de backup não suportada.");
  return backup.schemaVersion === SCHEMA_VERSION ? validateState(backup.data) : migrateState(backup.data);
}

export function previewBackup(backup) {
  const data = validateState(backup.data);
  const resultEvents = [...data.matches, ...(data.activeMatch ? [data.activeMatch] : [])]
    .flatMap((match) => match.events || [])
    .filter((event) => event.type === "challenge-finished" || event.type === "vote-recorded");
  return { players: data.players.length, matches: data.matches.length, results: resultEvents.length };
}

export function serializeBackup(state, dependencies) {
  return JSON.stringify(createBackup(state, dependencies), null, 2);
}
