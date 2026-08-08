import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../js/storage/store.js";
import {
  advanceClock,
  beginTimedMatch,
  beginTurn,
  correctLatestResult,
  completeTimedMatch,
  endMatchEarly,
  interruptTimedMatch,
  pauseClock,
  recordChallengeResult,
  startNewCycle,
  resumeTimedMatch,
} from "../js/domain/timed-games.js";

function ids(...values) {
  let index = 0;
  return () => values[index++] || `id-${index}`;
}

function clock(instant = "2026-08-08T15:00:00.000Z") {
  return {
    now: () => new Date(instant),
    timeZone: () => "America/Fortaleza",
    offsetMinutes: () => -180,
  };
}

function player(id) {
  return { id, name: id, color: "#fff", textColor: "#111", textColorMode: "auto", icon: id, archived: false };
}

function baseState() {
  return { ...createDefaultState(), players: [player("p1"), player("p2")] };
}

test("relógio executa 3–2–1 antes do período e não consome tempo pausado", () => {
  let state = beginTimedMatch(baseState(), { game: "mimica", playerIds: ["p1", "p2"] }, {
    clock: clock(), createId: ids("match", "event-start", "cycle", "event-cycle"), random: () => 0,
  });
  state = beginTurn(state, "p1", { nowMs: 1_000, clock: clock(), createId: ids("turn", "event-turn") });

  state = advanceClock(state, 4_500, { clock: clock(), createId: ids("challenge", "event-challenge") });
  assert.equal(state.activeMatch.timed.phase, "challenge");
  assert.equal(state.activeMatch.timed.clock.remainingMs, 39_500);

  state = pauseClock(state, 9_500, { clock: clock() });
  state = advanceClock(state, 30_000, { clock: clock() });
  assert.equal(state.activeMatch.timed.clock.remainingMs, 34_500);
  assert.equal(state.activeMatch.timed.clock.status, "paused");
});

test("interrupção e retomada ficam na cronologia sem consumir o tempo oculto", () => {
  let state = beginTimedMatch(baseState(), { game: "mimica", playerIds: ["p1"] }, {
    clock: clock(), createId: ids("match", "start", "cycle", "cycle-event"), random: () => 0,
  });
  state = beginTurn(state, "p1", { nowMs: 0, clock: clock(), createId: ids("turn", "turn-event") });
  state = interruptTimedMatch(state, { nowMs: 1_000, clock: clock(), createId: ids("interrupt") });
  state = advanceClock(state, 50_000, { clock: clock() });
  state = resumeTimedMatch(state, { nowMs: 50_000, clock: clock(), createId: ids("resume") });
  state = advanceClock(state, 52_000, { clock: clock(), createId: ids("challenge", "present") });
  assert.equal(state.activeMatch.timed.phase, "challenge");
  assert.deepEqual(state.activeMatch.events.slice(-3).map((event) => event.type), [
    "match-interrupted", "match-resumed", "challenge-presented",
  ]);
});

test("Mímica sugere quem não jogou, conclui Ciclo e permite corrigir o resultado mais recente", () => {
  let state = beginTimedMatch(baseState(), { game: "mimica", playerIds: ["p1", "p2"] }, {
    clock: clock(), createId: ids("match", "event-start", "cycle", "event-cycle"), random: () => 0,
  });
  assert.equal(state.activeMatch.timed.suggestedPlayerId, "p1");
  state = beginTurn(state, "p1", { nowMs: 0, clock: clock(), createId: ids("turn-1", "event-turn") });
  state = advanceClock(state, 3_000, { clock: clock(), createId: ids("challenge-1", "event-present") });
  state = recordChallengeResult(state, "correct", { nowMs: 5_000, clock: clock(), createId: ids("event-result") });
  state = correctLatestResult(state, "missed", { clock: clock(), createId: ids("event-correction") });
  assert.equal(state.activeMatch.events.at(-1).type, "result-corrected");
  assert.equal(state.activeMatch.events.at(-1).result, "missed");

  // Encerra os outros dois Desafios configurados.
  for (let index = 0; index < 2; index += 1) {
    state = advanceClock(state, 8_000 + index * 5_000, { clock: clock(), createId: ids(`challenge-${index + 2}`, `present-${index}`) });
    state = recordChallengeResult(state, "missed", { nowMs: 9_000 + index * 5_000, clock: clock(), createId: ids(`result-${index}`) });
  }
  assert.equal(state.activeMatch.timed.phase, "choose-player");
  assert.equal(state.activeMatch.timed.suggestedPlayerId, "p2");

  state = beginTurn(state, "p2", { nowMs: 20_000, clock: clock(), createId: ids("turn-2", "turn-event") });
  state = endMatchEarly(state, { nowMs: 20_000, clock: clock(), createId: ids("turn-end", "cycle-end", "match-end") });
  assert.equal(state.activeMatch, null);
  assert.equal(state.matches[0].state, "ended-early");
});

test("Palavra na Testa distingue skipped, missed e ignored no limite de quatro segundos", () => {
  let state = beginTimedMatch(baseState(), { game: "palavraNaTesta", playerIds: ["p1"] }, {
    clock: clock(), createId: ids("match", "event-start", "cycle", "event-cycle"), random: () => 0,
  });
  state = beginTurn(state, "p1", { nowMs: 0, clock: clock(), createId: ids("turn", "turn-event") });
  state = advanceClock(state, 3_000, { clock: clock(), createId: ids("challenge-1", "present-1") });
  state = recordChallengeResult(state, "skipped", { nowMs: 80_000, clock: clock(), createId: ids("skip", "challenge-2", "present-2") });
  assert.equal(state.activeMatch.events.find((event) => event.id === "skip").result, "skipped");

  state = advanceClock(state, 93_000, { clock: clock(), createId: ids("finish-turn", "finish-cycle") });
  const finishes = state.activeMatch.events.filter((event) => event.type === "challenge-finished");
  assert.equal(finishes.at(-1).result, "missed");

  // Novo Ciclo: o último Desafio aparece com exatamente quatro segundos e é ignorado.
  state = startNewCycle(state, { clock: clock(), createId: ids("cycle-2", "cycle-event") });
  state = beginTurn(state, "p1", { nowMs: 100_000, clock: clock(), createId: ids("turn-2", "turn-event-2") });
  state = advanceClock(state, 103_000, { clock: clock(), createId: ids("challenge-a", "present-a") });
  state = recordChallengeResult(state, "correct", { nowMs: 189_000, clock: clock(), createId: ids("correct", "challenge-b", "present-b") });
  state = advanceClock(state, 193_000, { clock: clock(), createId: ids("turn-finish-2", "cycle-finish-2") });
  const secondFinishes = state.activeMatch.events.filter((event) => event.type === "challenge-finished");
  assert.equal(secondFinishes.at(-1).result, "ignored");
  state = completeTimedMatch(state, { clock: clock(), createId: ids("match-finished") });
  assert.equal(state.matches.at(-1).state, "completed");
});
