import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState, createStore, STORAGE_KEY } from "../js/storage/store.js";
import { BUILT_IN_CONTENT } from "../js/data/content.js";

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  key(index) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

test("store inicia com esquema versionado e configurações padrão", () => {
  const store = createStore({ storage: new MemoryStorage() });
  const state = store.load();
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.settings.soundEffects, true);
  assert.equal(state.settings.games.mimica.durationSeconds, 40);
  assert.equal(state.settings.games.palavraNaTesta.durationSeconds, 90);
});

test("store persiste atualizações e devolve cópias independentes", () => {
  const storage = new MemoryStorage();
  const store = createStore({ storage });
  store.replace({ ...createDefaultState(), players: [{
    id: "p1", name: "Bia", color: "#facc15", textColor: "#111111",
    textColorMode: "auto", icon: "guepardo", archived: false,
  }] });
  const loaded = store.load();
  loaded.players[0].name = "Outro";
  assert.equal(store.load().players[0].name, "Bia");
});

test("dados inválidos são preservados para recuperação e não derrubam o app", () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: "{quebrado" });
  const store = createStore({
    storage,
    recoveryId: () => "recovery-1",
  });
  const state = store.load();
  assert.equal(state.schemaVersion, 2);
  assert.equal(storage.getItem(`${STORAGE_KEY}.recovery-1`), "{quebrado");
  assert.match(store.lastWarning, /recupera/i);
});

test("estado v0 recebe configurações aninhadas padrão durante a migração", () => {
  const storage = new MemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ schemaVersion: 0, settings: { soundEffects: false } }),
  });
  const state = createStore({ storage }).load();
  assert.equal(state.settings.soundEffects, false);
  assert.equal(state.settings.games.mimica.durationSeconds, 40);
});

test("estado v1 descarta vínculos posicionais do catálogo antigo", () => {
  const legacy = {
    ...createDefaultState(),
    schemaVersion: 1,
    content: { custom: [], disabledBuiltInIds: ["mimica-1"] },
    decks: { mimica: { remainingIds: ["mimica-2"], usedIds: ["mimica-1"] } },
  };
  const storage = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(legacy) });
  const state = createStore({ storage }).load();
  assert.equal(state.schemaVersion, 2);
  assert.deepEqual(state.content.disabledBuiltInIds, []);
  assert.deepEqual(state.decks, {});
});

test("migração preserva o Desafio visível e prepara o catálogo novo para a Partida ativa", () => {
  const occurredAt = { instant: "2026-08-09T03:30:00.000Z", timeZone: "America/Fortaleza", offsetMinutes: -180 };
  const activeMatch = {
    id: "match-1", game: "mimica", playerIds: [], state: "in-progress",
    createdAt: occurredAt, startedAt: occurredAt, endedAt: null, events: [],
    timed: { phase: "challenge", currentChallenge: { contentId: "mimica-1", content: "Guepardo" } },
  };
  const legacy = {
    ...createDefaultState(), schemaVersion: 1, activeMatch,
    decks: { mimica: { remainingIds: ["mimica-2"], usedIds: ["mimica-1"] } },
  };
  const storage = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(legacy) });
  const state = createStore({ storage }).load();
  assert.deepEqual(state.activeMatch, activeMatch);
  assert.deepEqual(state.decks.mimica.usedIds, []);
  assert.equal(state.decks.mimica.remainingIds[0], BUILT_IN_CONTENT.mimica[0].id);
});

test("estado v1 estruturalmente incompleto entra em recuperação segura", () => {
  const raw = JSON.stringify({ schemaVersion: 1, players: [] });
  const storage = new MemoryStorage({ [STORAGE_KEY]: raw });
  const store = createStore({ storage, recoveryId: () => "recovery-bad-v1" });
  assert.equal(store.load().settings.games.mimica.durationSeconds, 40);
  assert.equal(storage.getItem(`${STORAGE_KEY}.recovery-bad-v1`), raw);
});
