import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState, SCHEMA_VERSION } from "../js/storage/store.js";
import { createBackup, parseBackup, previewBackup } from "../js/domain/backup.js";

test("backup inclui versão, instante de exportação e todo o estado", () => {
  const state = { ...createDefaultState(), players: [{
    id: "p1", name: "Bia", color: "#facc15", textColor: "#111111",
    textColorMode: "auto", icon: "guepardo", archived: false,
  }] };
  const backup = createBackup(state, {
    now: () => new Date("2026-08-08T18:00:00.000Z"),
  });
  assert.equal(backup.schemaVersion, SCHEMA_VERSION);
  assert.equal(backup.exportedAt, "2026-08-08T18:00:00.000Z");
  assert.deepEqual(previewBackup(backup), { players: 1, matches: 0, results: 0 });
  assert.deepEqual(parseBackup(JSON.stringify(backup)), state);
});

test("backup inválido é rejeitado antes de produzir estado restaurável", () => {
  assert.throws(() => parseBackup('{"schemaVersion":99,"data":{}}'), /versão/i);
  assert.throws(() => parseBackup(`{"schemaVersion":${SCHEMA_VERSION},"data":{"players":[]}}`), /estrutura/i);
  const malformed = createBackup(createDefaultState());
  malformed.data.players = [{ id: "p1" }];
  assert.throws(() => parseBackup(JSON.stringify(malformed)), /estrutura/i);
});

test("backup do catálogo anterior é migrado ao restaurar", () => {
  const legacy = {
    ...createDefaultState(), schemaVersion: 1,
    content: { custom: [], disabledBuiltInIds: ["mimica-1"] },
    decks: { mimica: { remainingIds: ["mimica-2"], usedIds: ["mimica-1"] } },
  };
  const restored = parseBackup(JSON.stringify({ schemaVersion: 1, data: legacy }));
  assert.equal(restored.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(restored.content.disabledBuiltInIds, []);
  assert.deepEqual(restored.decks, {});
});
