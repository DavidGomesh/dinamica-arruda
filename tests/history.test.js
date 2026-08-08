import test from "node:test";
import assert from "node:assert/strict";

import {
  deleteMatch,
  historyByDay,
  matchHistory,
  playerStatistics,
} from "../js/domain/history.js";
import { createDefaultState } from "../js/storage/store.js";

function timestamp(instant) {
  return { instant, timeZone: "America/Fortaleza", offsetMinutes: -180 };
}

function event(id, type, instant, payload = {}) {
  return { id, type, occurredAt: timestamp(instant), ...payload };
}

const players = [
  { id: "p1", name: "Ana", color: "#fff", textColor: "#111", textColorMode: "auto", icon: "guepardo", archived: true },
  { id: "p2", name: "Beto", color: "#fff", textColor: "#111", textColorMode: "auto", icon: "et", archived: false },
];

function stateWithHistory() {
  const mimica = {
    id: "m1", game: "mimica", playerIds: ["p1"], state: "completed",
    createdAt: timestamp("2026-08-08T12:59:00.000Z"),
    startedAt: timestamp("2026-08-08T13:00:00.000Z"),
    endedAt: timestamp("2026-08-08T13:10:00.000Z"),
    events: [
      event("start", "match-started", "2026-08-08T13:00:00.000Z"),
      event("turn", "turn-started", "2026-08-08T13:01:00.000Z", { turnId: "t1", playerId: "p1" }),
      event("r1", "challenge-finished", "2026-08-08T13:02:00.000Z", { turnId: "t1", playerId: "p1", content: "Guepardo", result: "missed" }),
      event("fix", "result-corrected", "2026-08-08T13:03:00.000Z", { resultId: "r1", previousResult: "missed", result: "correct" }),
      event("r2", "challenge-finished", "2026-08-08T13:04:00.000Z", { turnId: "t1", playerId: "p1", content: "Pinguim", result: "ignored" }),
      event("end", "match-finished", "2026-08-08T13:10:00.000Z"),
    ],
  };
  const voting = {
    id: "m2", game: "quemMaisProvavel", playerIds: ["p1", "p2"], state: "completed",
    createdAt: timestamp("2026-08-08T17:59:00.000Z"),
    startedAt: timestamp("2026-08-08T18:00:00.000Z"),
    endedAt: timestamp("2026-08-08T18:05:00.000Z"),
    events: [
      event("q", "question-presented", "2026-08-08T18:00:30.000Z", { questionId: "q1", content: "Quem cantaria?" }),
      event("vs", "voting-started", "2026-08-08T18:01:00.000Z", { votingId: "v1", questionId: "q1" }),
      event("v1a", "vote-recorded", "2026-08-08T18:01:30.000Z", { votingId: "v1", questionId: "q1", voterId: "p1", chosenPlayerId: "p2" }),
      event("v1b", "vote-recorded", "2026-08-08T18:02:00.000Z", { votingId: "v1", questionId: "q1", voterId: "p2", chosenPlayerId: "p2" }),
      event("vf", "voting-finished", "2026-08-08T18:02:30.000Z", { votingId: "v1", questionId: "q1" }),
    ],
  };
  return { ...createDefaultState(), players, matches: [mimica, voting] };
}

test("histórico agrupa Partidas pelo dia local observado no acontecimento", () => {
  const groups = historyByDay(stateWithHistory());
  assert.equal(groups.length, 1);
  assert.equal(groups[0].date, "2026-08-08");
  assert.deepEqual(groups[0].matches.map((match) => match.id), ["m2", "m1"]);
  assert.equal(groups[0].matches[1].durationMs, 600_000);
});

test("detalhe mantém cronologia estável e oculta a relação dos Votos por padrão", () => {
  const hidden = matchHistory(stateWithHistory(), "m2");
  const vote = hidden.timeline.find((item) => item.type === "vote-recorded");
  assert.equal(Object.hasOwn(vote, "voterId"), false);
  assert.equal(Object.hasOwn(vote, "chosenPlayerId"), false);
  assert.deepEqual(hidden.timeline.map((item) => item.id), ["q", "vs", "v1a", "v1b", "vf"]);

  const revealed = matchHistory(stateWithHistory(), "m2", { includeIndividualVotes: true });
  assert.equal(revealed.timeline[2].voterId, "p1");
  assert.equal(revealed.timeline[2].chosenPlayerId, "p2");
});

test("estatísticas aplicam correções e incluem Jogadores arquivados", () => {
  const statistics = playerStatistics(stateWithHistory());
  const ana = statistics.find((item) => item.player.id === "p1");
  const beto = statistics.find((item) => item.player.id === "p2");
  assert.equal(ana.player.archived, true);
  assert.deepEqual(ana.games.mimica, { total: 2, correct: 1, missed: 0, ignored: 1, accuracyPercent: 50 });
  assert.deepEqual(ana.history, [{
    matchId: "m2", game: "quemMaisProvavel", startedAt: timestamp("2026-08-08T18:00:00.000Z"),
    endedAt: timestamp("2026-08-08T18:05:00.000Z"), results: 0, votesReceived: 0,
  }, {
    matchId: "m1", game: "mimica", startedAt: timestamp("2026-08-08T13:00:00.000Z"),
    endedAt: timestamp("2026-08-08T13:10:00.000Z"), results: 2, votesReceived: 0,
  }]);
  assert.equal(beto.games.quemMaisProvavel.votesReceived, 2);
  assert.deepEqual(beto.games.quemMaisProvavel.byQuestion, [{ questionId: "q1", question: "Quem cantaria?", votesReceived: 2 }]);
});

test("excluir uma Partida remove somente seu registro e recalcula as projeções", () => {
  const next = deleteMatch(stateWithHistory(), "m1");
  assert.deepEqual(next.matches.map((match) => match.id), ["m2"]);
  assert.equal(playerStatistics(next).find((item) => item.player.id === "p1").games.mimica.total, 0);
  assert.throws(() => deleteMatch(next, "desconhecida"), /não encontrada/i);
});
