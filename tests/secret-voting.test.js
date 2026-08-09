import test from "node:test";
import assert from "node:assert/strict";

import { addPlayer } from "../js/domain/players.js";
import {
  beginMyVote,
  beginSecretVotingMatch,
  deleteInterruptedVoting,
  endSecretVotingMatch,
  interruptSecretVotingMatch,
  nextSecretVotingQuestion,
  recordVotes,
  resumeSecretVotingMatch,
  revealVotingResult,
  secretVotingView,
  startSecretVoting,
} from "../js/domain/secret-voting.js";
import { createDefaultState, createStore } from "../js/storage/store.js";

const clock = {
  now: () => new Date("2026-08-08T18:00:00.000Z"),
  timeZone: () => "America/Fortaleza",
  offsetMinutes: () => -180,
};

function stateWithPlayers() {
  let state = createDefaultState();
  state = addPlayer(state, { name: "Ana", color: "#facc15", icon: "guepardo" }, { createId: () => "p1" });
  return addPlayer(state, { name: "Beto", color: "#60a5fa", icon: "et" }, { createId: () => "p2" });
}

test("iniciar Quem é Mais Provável sorteia uma Pergunta e prepara a passagem neutra", () => {
  let serial = 0;
  const state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, {
    clock,
    createId: () => `id-${serial += 1}`,
    random: () => 0,
  });

  assert.equal(state.activeMatch.game, "quemMaisProvavel");
  assert.equal(state.activeMatch.secretVoting.phase, "question");
  assert.equal(state.activeMatch.secretVoting.currentVoterId, null);
  assert.match(state.activeMatch.secretVoting.question.text, /^Quem é mais provável/);
  assert.deepEqual(state.activeMatch.events.map((event) => event.type), [
    "match-created", "match-started", "question-presented",
  ]);
  assert.equal(state.activeMatch.events[2].occurredAt.instant, "2026-08-08T18:00:00.000Z");
  assert.equal(state.decks.quemMaisProvavel.usedIds.length, 1);
});

test("depois de um Voto a projeção pública não mostra placar parcial nem Votos individuais", () => {
  let serial = 0;
  const dependencies = {
    clock,
    createId: () => `id-${serial += 1}`,
    random: () => 0,
  };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state, dependencies);
  assert.equal(state.activeMatch.events.at(-1).type, "voting-started");
  state = beginMyVote(state, dependencies);
  state = recordVotes(state, ["p2"], dependencies);

  const view = secretVotingView(state);
  assert.equal(view.phase, "handoff");
  assert.equal(view.currentVoterId, "p2");
  assert.equal(Object.hasOwn(view, "totals"), false);
  assert.equal(Object.hasOwn(view, "votes"), false);
  assert.equal(state.activeMatch.secretVoting.voting.votes.length, 1);
  assert.equal(state.activeMatch.events.at(-1).type, "vote-recorded");
  assert.equal(state.activeMatch.events.at(-1).occurredAt.instant, "2026-08-08T18:00:00.000Z");
});

test("um Jogador pode confirmar Votos em vários Jogadores antes de passar o aparelho", () => {
  let serial = 0;
  const dependencies = {
    clock,
    createId: () => `id-${serial += 1}`,
    random: () => 0,
  };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state, dependencies);
  state = beginMyVote(state);
  state = recordVotes(state, ["p1", "p2"], dependencies);

  assert.equal(state.activeMatch.secretVoting.phase, "handoff");
  assert.equal(state.activeMatch.secretVoting.currentVoterId, "p2");
  assert.deepEqual(state.activeMatch.secretVoting.voting.votes.map((vote) => ({
    voterId: vote.voterId,
    chosenPlayerId: vote.chosenPlayerId,
  })), [
    { voterId: "p1", chosenPlayerId: "p1" },
    { voterId: "p1", chosenPlayerId: "p2" },
  ]);
  assert.deepEqual(state.activeMatch.events.slice(-2).map((event) => event.type), [
    "vote-recorded", "vote-recorded",
  ]);
});

test("resultado só aparece depois da tela intermediária e informa todos os empatados", () => {
  let serial = 0;
  const dependencies = { clock, createId: () => `id-${serial += 1}`, random: () => 0 };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state);
  state = beginMyVote(state);
  state = recordVotes(state, ["p1"], dependencies);
  state = beginMyVote(state);
  state = recordVotes(state, ["p2"], dependencies);

  const completed = secretVotingView(state);
  assert.equal(completed.phase, "voting-complete");
  assert.equal(Object.hasOwn(completed, "totals"), false);
  assert.equal(state.activeMatch.events.at(-1).type, "voting-finished");

  state = revealVotingResult(state);
  const result = secretVotingView(state);
  assert.deepEqual(result.totals, { p1: 1, p2: 1 });
  assert.deepEqual(result.winnerIds, ["p1", "p2"]);
  assert.equal(Object.hasOwn(result, "individualVotes"), false);
  assert.deepEqual(secretVotingView(state, { includeIndividualVotes: true }).individualVotes, [
    { voterId: "p1", chosenPlayerId: "p1" },
    { voterId: "p2", chosenPlayerId: "p2" },
  ]);
});

test("recarregar e retomar preserva Votos feitos, próximo votante e cronologia", () => {
  let now = new Date("2026-08-08T18:00:00.000Z");
  let serial = 0;
  const changingClock = { ...clock, now: () => now };
  const dependencies = { clock: changingClock, createId: () => `id-${serial += 1}`, random: () => 0 };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state);
  state = recordVotes(beginMyVote(state), ["p2"], dependencies);
  now = new Date("2026-08-08T18:05:00.000Z");
  state = interruptSecretVotingMatch(state, { ...dependencies, reason: "browser-closed" });

  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const store = createStore({ storage });
  store.replace(state);
  state = resumeSecretVotingMatch(store.load(), dependencies);

  assert.equal(state.activeMatch.state, "in-progress");
  assert.equal(state.activeMatch.secretVoting.phase, "handoff");
  assert.equal(state.activeMatch.secretVoting.currentVoterId, "p2");
  assert.equal(state.activeMatch.secretVoting.voting.votes[0].chosenPlayerId, "p2");
  assert.deepEqual(state.activeMatch.events.slice(-4).map((event) => event.type), [
    "voting-interrupted", "match-interrupted", "match-resumed", "voting-resumed",
  ]);
  assert.equal(state.activeMatch.events.at(-1).occurredAt.instant, "2026-08-08T18:05:00.000Z");
});

test("excluir Votação interrompida preserva Perguntas concluídas e descarta seus Votos parciais", () => {
  let serial = 0;
  const dependencies = { clock, createId: () => `id-${serial += 1}`, random: () => 0 };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state);
  state = recordVotes(beginMyVote(state), ["p1"], dependencies);
  state = recordVotes(beginMyVote(state), ["p1"], dependencies);
  state = nextSecretVotingQuestion(revealVotingResult(state), dependencies);
  const discardedQuestionId = state.activeMatch.secretVoting.question.id;
  state = startSecretVoting(state);
  state = recordVotes(beginMyVote(state), ["p2"], dependencies);
  state = interruptSecretVotingMatch(state, dependencies);
  state = deleteInterruptedVoting(state, dependencies);

  assert.equal(state.activeMatch.state, "in-progress");
  assert.equal(state.activeMatch.secretVoting.completedQuestions.length, 1);
  assert.equal(state.activeMatch.secretVoting.voting.votes.length, 0);
  assert.notEqual(state.activeMatch.secretVoting.question.id, discardedQuestionId);
  assert.equal(state.activeMatch.events.some((event) => event.type === "voting-deleted"
    && event.questionId === discardedQuestionId), true);
  assert.equal(state.decks.quemMaisProvavel.usedIds.length, 3);
});

test("encerrar durante a Votação preserva Votos feitos e finaliza a Partida antecipadamente", () => {
  let serial = 0;
  const dependencies = { clock, createId: () => `id-${serial += 1}`, random: () => 0 };
  let state = beginSecretVotingMatch(stateWithPlayers(), { playerIds: ["p1", "p2"] }, dependencies);
  state = startSecretVoting(state);
  state = recordVotes(beginMyVote(state), ["p2"], dependencies);
  state = endSecretVotingMatch(state, dependencies);

  assert.equal(state.activeMatch, null);
  assert.equal(state.matches[0].state, "ended-early");
  assert.equal(state.matches[0].endedAt.instant, "2026-08-08T18:00:00.000Z");
  assert.equal(state.matches[0].secretVoting.voting.votes.length, 1);
  assert.deepEqual(state.matches[0].events.slice(-2).map((event) => event.type), [
    "voting-interrupted", "match-finished",
  ]);
});
