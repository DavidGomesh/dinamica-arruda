import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState, createStore, STORAGE_KEY } from "../js/storage/store.js";

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
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.settings.soundEffects, true);
  assert.equal(state.settings.games.mimica.durationSeconds, 40);
  assert.equal(state.settings.games.palavraNaTesta.durationSeconds, 90);
});

test("store persiste atualizações e devolve cópias independentes", () => {
  const storage = new MemoryStorage();
  const store = createStore({ storage });
  store.replace({ ...createDefaultState(), players: [{ id: "p1" }] });
  const loaded = store.load();
  loaded.players.push({ id: "p2" });
  assert.deepEqual(store.load().players, [{ id: "p1" }]);
});

test("dados inválidos são preservados para recuperação e não derrubam o app", () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: "{quebrado" });
  const store = createStore({
    storage,
    recoveryId: () => "recovery-1",
  });
  const state = store.load();
  assert.equal(state.schemaVersion, 1);
  assert.equal(storage.getItem(`${STORAGE_KEY}.recovery-1`), "{quebrado");
  assert.match(store.lastWarning, /recupera/i);
});
