import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../js/storage/store.js";
import { createBackup, parseBackup, previewBackup } from "../js/domain/backup.js";

test("backup inclui versão, instante de exportação e todo o estado", () => {
  const state = { ...createDefaultState(), players: [{
    id: "p1", name: "Bia", color: "#facc15", textColor: "#111111",
    textColorMode: "auto", icon: "guepardo", archived: false,
  }] };
  const backup = createBackup(state, {
    now: () => new Date("2026-08-08T18:00:00.000Z"),
  });
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.exportedAt, "2026-08-08T18:00:00.000Z");
  assert.deepEqual(previewBackup(backup), { players: 1, matches: 0, results: 0 });
  assert.deepEqual(parseBackup(JSON.stringify(backup)), state);
});

test("backup inválido é rejeitado antes de produzir estado restaurável", () => {
  assert.throws(() => parseBackup('{"schemaVersion":99,"data":{}}'), /versão/i);
  assert.throws(() => parseBackup('{"schemaVersion":1,"data":{"players":[]}}'), /estrutura/i);
  const malformed = createBackup(createDefaultState());
  malformed.data.players = [{ id: "p1" }];
  assert.throws(() => parseBackup(JSON.stringify(malformed)), /estrutura/i);
});
