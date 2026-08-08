import { createTimestamp } from "./time.js";

function defaultId(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function idFrom(dependencies, prefix) {
  return (dependencies.createId || (() => defaultId(prefix)))();
}

function requireActive(state) {
  if (!state.activeMatch) throw new Error("Não há Partida em andamento.");
  return state.activeMatch;
}

function appendEvent(state, type, payload = {}, dependencies = {}) {
  const match = requireActive(state);
  const event = {
    id: idFrom(dependencies, "evento"),
    type,
    occurredAt: createTimestamp(dependencies.clock),
    ...payload,
  };
  return {
    ...state,
    activeMatch: { ...match, events: [...match.events, event] },
  };
}

export function createMatch(state, input, dependencies = {}) {
  if (state.activeMatch) throw new Error("Já existe uma Partida interrompida ou em andamento.");
  if (!input.game || !input.participantIds?.length) throw new Error("Informe jogo e Jogadores participantes.");
  const occurredAt = createTimestamp(dependencies.clock);
  const id = idFrom(dependencies, "partida");
  return {
    ...state,
    activeMatch: {
      id,
      game: input.game,
      participantIds: [...input.participantIds],
      state: "in-progress",
      createdAt: occurredAt,
      startedAt: occurredAt,
      endedAt: null,
      events: [{ id: `${id}-created`, type: "match-created", occurredAt }],
    },
  };
}

export function recordMatchEvent(state, type, payload, dependencies) {
  return appendEvent(state, type, payload, dependencies);
}

export function interruptMatch(state, payload = {}, dependencies = {}) {
  const next = appendEvent(state, "match-interrupted", payload, dependencies);
  return { ...next, activeMatch: { ...next.activeMatch, state: "interrupted" } };
}

export function resumeMatch(state, payload = {}, dependencies = {}) {
  const next = appendEvent(state, "match-resumed", payload, dependencies);
  return { ...next, activeMatch: { ...next.activeMatch, state: "in-progress" } };
}

export function finishMatch(state, payload = {}, dependencies = {}) {
  const next = appendEvent(state, "match-finished", payload, dependencies);
  const endedAt = next.activeMatch.events[next.activeMatch.events.length - 1].occurredAt;
  const finished = { ...next.activeMatch, state: payload.reason || "completed", endedAt };
  return { ...next, activeMatch: null, matches: [...next.matches, finished] };
}

function childEvent(type, prefix) {
  return (state, payload = {}, dependencies = {}) => appendEvent(state, type, {
    [`${prefix}Id`]: payload[`${prefix}Id`] || idFrom(dependencies, prefix),
    ...payload,
  }, dependencies);
}

export const gameRecords = Object.freeze({
  startCycle: childEvent("cycle-started", "cycle"),
  finishCycle: childEvent("cycle-finished", "cycle"),
  startTurn: childEvent("turn-started", "turn"),
  finishTurn: childEvent("turn-finished", "turn"),
  presentChallenge: childEvent("challenge-presented", "challenge"),
  finishChallenge: childEvent("challenge-finished", "challenge"),
  presentQuestion: childEvent("question-presented", "question"),
  startVoting: childEvent("voting-started", "voting"),
  interruptVoting: childEvent("voting-interrupted", "voting"),
  resumeVoting: childEvent("voting-resumed", "voting"),
  finishVoting: childEvent("voting-finished", "voting"),
  recordVote: childEvent("vote-recorded", "vote"),
  correctResult: childEvent("result-corrected", "result"),
});
