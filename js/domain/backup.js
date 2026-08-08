import { SCHEMA_VERSION } from "../storage/store.js";

function validateState(data) {
  const requiredArrays = ["players", "matches"];
  const valid = data && typeof data === "object"
    && requiredArrays.every((field) => Array.isArray(data[field]))
    && data.settings && data.content && data.decks
    && Object.prototype.hasOwnProperty.call(data, "activeMatch");
  if (!valid) throw new Error("Backup com estrutura inválida.");
  return data;
}

export function createBackup(state, dependencies = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: (dependencies.now || (() => new Date()))().toISOString(),
    data: JSON.parse(JSON.stringify(state)),
  };
}

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error("O texto não contém JSON válido."); }
  if (backup.schemaVersion !== SCHEMA_VERSION) throw new Error("Versão de backup não suportada.");
  return validateState(backup.data);
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
