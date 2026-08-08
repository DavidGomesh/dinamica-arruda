import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../js/storage/store.js";
import {
  createMatch,
  finishMatch,
  gameRecords,
  startMatch,
} from "../js/domain/matches.js";

const clock = {
  now: () => new Date("2026-08-08T15:00:00.000Z"),
  timeZone: () => "America/Fortaleza",
  offsetMinutes: () => -180,
};

test("Partida e acontecimentos filhos recebem cronologia própria automaticamente", () => {
  let state = createMatch(createDefaultState(), {
    game: "mimica", playerIds: ["p1", "p2"],
  }, { clock, createId: () => "m1" });
  state = startMatch(state, {}, { clock, createId: () => "e-start" });
  state = gameRecords.startTurn(state, { playerId: "p1", cycleNumber: 1 }, { clock, createId: () => "t1" });
  state = gameRecords.presentChallenge(state, { turnId: "t1", content: "Guepardo" }, { clock, createId: () => "d1" });

  assert.equal(state.activeMatch.createdAt.instant, "2026-08-08T15:00:00.000Z");
  assert.equal(state.activeMatch.events.length, 4);
  assert.equal(state.activeMatch.events[0].type, "match-created");
  assert.equal(state.activeMatch.events[1].type, "match-started");
  assert.equal(state.activeMatch.events[3].type, "challenge-presented");
  assert.equal(state.activeMatch.events[3].occurredAt.offsetMinutes, -180);
});

test("encerrar Partida preenche endedAt e move registro para o histórico", () => {
  let state = createMatch(createDefaultState(), {
    game: "mimica", playerIds: ["p1"],
  }, { clock, createId: () => "m1" });
  state = startMatch(state, {}, { clock, createId: () => "e-start" });
  state = finishMatch(state, { reason: "completed" }, { clock });
  assert.equal(state.activeMatch, null);
  assert.equal(state.matches[0].endedAt.instant, "2026-08-08T15:00:00.000Z");
  assert.equal(state.matches[0].state, "completed");
});
