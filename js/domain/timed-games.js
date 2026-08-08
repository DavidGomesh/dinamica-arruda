import { createDeck, drawNext } from "./decks.js";
import {
  createMatch, finishMatch, gameRecords, interruptMatch, resumeMatch, startMatch,
} from "./matches.js";

const TIMED_GAMES = new Set(["mimica", "palavraNaTesta"]);

function requireTimed(state) {
  const match = state.activeMatch;
  if (!match?.timed || !TIMED_GAMES.has(match.game)) throw new Error("Não há Partida cronometrada em andamento.");
  return match;
}

function nextId(dependencies, prefix) {
  return (dependencies.createId || (() => globalThis.crypto?.randomUUID?.()
    || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`))();
}

function withTimed(state, timed) {
  return { ...state, activeMatch: { ...state.activeMatch, timed } };
}

function durationMs(state, game) {
  return state.settings.games[game].durationSeconds * 1_000;
}

function runningClock(duration, nowMs) {
  return {
    status: "running",
    stage: "countdown",
    countdownRemainingMs: 3_000,
    durationMs: duration,
    remainingMs: duration,
    runningSinceMs: nowMs,
  };
}

function snapshot(clock, nowMs) {
  if (clock.status !== "running") return clock;
  let elapsed = Math.max(0, nowMs - clock.runningSinceMs);
  let countdownRemainingMs = clock.countdownRemainingMs;
  let remainingMs = clock.remainingMs;
  if (countdownRemainingMs > 0) {
    const consumed = Math.min(elapsed, countdownRemainingMs);
    countdownRemainingMs -= consumed;
    elapsed -= consumed;
  }
  if (countdownRemainingMs === 0 && elapsed > 0) remainingMs = Math.max(0, remainingMs - elapsed);
  return {
    ...clock,
    stage: countdownRemainingMs > 0 ? "countdown" : remainingMs > 0 ? "active" : "expired",
    countdownRemainingMs,
    remainingMs,
    runningSinceMs: nowMs,
  };
}

function nextUnplayed(match, playedPlayerIds) {
  return match.playerIds.find((id) => !playedPlayerIds.includes(id)) || null;
}

function presentNextChallenge(state, dependencies = {}) {
  const match = requireTimed(state);
  let deckState = state;
  if (!deckState.decks[match.game]) deckState = createDeck(deckState, match.game, dependencies);
  const draw = drawNext(deckState, match.game);
  if (draw.exhausted) {
    return withTimed(draw.state, { ...match.timed, phase: "deck-exhausted" });
  }
  const challengeId = nextId(dependencies, "desafio");
  const currentTurn = match.timed.currentTurn;
  let next = gameRecords.presentChallenge(draw.state, {
    challengeId,
    turnId: currentTurn.id,
    playerId: currentTurn.playerId,
    contentId: draw.item.id,
    content: draw.item.text,
  }, dependencies);
  const timed = next.activeMatch.timed;
  return withTimed(next, {
    ...timed,
    phase: "challenge",
    currentChallenge: {
      id: challengeId,
      contentId: draw.item.id,
      content: draw.item.text,
      presentedWithRemainingMs: timed.clock.remainingMs,
    },
  });
}

function finishCurrentTurn(state, reason, dependencies = {}) {
  const match = requireTimed(state);
  const { timed } = match;
  let next = gameRecords.finishTurn(state, {
    turnId: timed.currentTurn.id,
    playerId: timed.currentTurn.playerId,
    reason,
  }, dependencies);
  const playedPlayerIds = [...new Set([...timed.playedPlayerIds, timed.currentTurn.playerId])];
  if (match.playerIds.every((id) => playedPlayerIds.includes(id))) {
    next = gameRecords.finishCycle(next, { cycleId: timed.cycleId, cycleNumber: timed.cycleNumber }, dependencies);
    return withTimed(next, {
      ...timed,
      phase: "cycle-complete",
      playedPlayerIds,
      suggestedPlayerId: null,
      currentTurn: null,
      currentChallenge: null,
      clock: null,
    });
  }
  return withTimed(next, {
    ...timed,
    phase: "choose-player",
    playedPlayerIds,
    suggestedPlayerId: nextUnplayed(match, playedPlayerIds),
    currentTurn: null,
    currentChallenge: null,
    clock: null,
  });
}

function finishVisibleChallenge(state, result, nowMs, dependencies = {}) {
  const match = requireTimed(state);
  const { timed } = match;
  const clock = snapshot(timed.clock, nowMs);
  const challenge = timed.currentChallenge;
  const durationUsedMs = match.game === "mimica"
    ? clock.durationMs - clock.remainingMs
    : challenge.presentedWithRemainingMs - clock.remainingMs;
  const next = gameRecords.finishChallenge(withTimed(state, { ...timed, clock }), {
    challengeId: challenge.id,
    turnId: timed.currentTurn.id,
    playerId: timed.currentTurn.playerId,
    contentId: challenge.contentId,
    content: challenge.content,
    result,
    durationUsedMs: Math.max(0, durationUsedMs),
  }, dependencies);
  return withTimed(next, {
    ...next.activeMatch.timed,
    currentTurn: { ...timed.currentTurn, completedChallenges: timed.currentTurn.completedChallenges + 1 },
    currentChallenge: null,
  });
}

function nextAfterResult(state, nowMs, dependencies = {}) {
  const match = requireTimed(state);
  const { timed } = match;
  if (match.game === "mimica") {
    if (timed.currentTurn.completedChallenges >= timed.currentTurn.challengeTarget) {
      return withTimed(state, { ...timed, phase: "turn-summary", clock: null });
    }
    const lastResult = [...match.events].reverse().find((event) => event.type === "challenge-finished"
      && event.turnId === timed.currentTurn.id)?.result;
    return withTimed(state, { ...timed, phase: "challenge-result", clock: null, lastResult });
  }
  if (timed.clock.remainingMs <= 0) return withTimed(state, { ...timed, phase: "turn-summary", clock: null });
  return presentNextChallenge(state, dependencies);
}

export function beginTimedMatch(state, input, dependencies = {}) {
  if (!TIMED_GAMES.has(input.game)) throw new Error("Jogo cronometrado inválido.");
  const activeIds = new Set(state.players.filter((player) => !player.archived).map((player) => player.id));
  if (!input.playerIds?.length || new Set(input.playerIds).size !== input.playerIds.length
    || input.playerIds.some((id) => !activeIds.has(id))) {
    throw new Error("Selecione Jogadores ativos sem repetição.");
  }
  let next = createMatch(state, input, dependencies);
  next = startMatch(next, {}, dependencies);
  if (!next.decks[input.game]) next = createDeck(next, input.game, dependencies);
  const cycleId = nextId(dependencies, "ciclo");
  next = gameRecords.startCycle(next, { cycleId, cycleNumber: 1 }, dependencies);
  return withTimed(next, {
    phase: "choose-player",
    cycleId,
    cycleNumber: 1,
    playedPlayerIds: [],
    suggestedPlayerId: input.playerIds[0],
    currentTurn: null,
    currentChallenge: null,
    clock: null,
  });
}

export function beginTurn(state, playerId, dependencies = {}) {
  const match = requireTimed(state);
  const { timed } = match;
  if (timed.phase !== "choose-player") throw new Error("Não é possível iniciar um Turno agora.");
  if (!match.playerIds.includes(playerId)) throw new Error("Jogador não participa desta Partida.");
  const turnId = nextId(dependencies, "turno");
  let next = gameRecords.startTurn(state, {
    turnId, playerId, cycleId: timed.cycleId, cycleNumber: timed.cycleNumber,
  }, dependencies);
  return withTimed(next, {
    ...timed,
    phase: "countdown",
    currentTurn: {
      id: turnId,
      playerId,
      completedChallenges: 0,
      challengeTarget: match.game === "mimica" ? state.settings.games.mimica.challengesPerTurn : null,
    },
    currentChallenge: null,
    clock: runningClock(durationMs(state, match.game), dependencies.nowMs ?? Date.now()),
  });
}

export function advanceClock(state, nowMs, dependencies = {}) {
  const match = requireTimed(state);
  const { timed } = match;
  if (!timed.clock || !["countdown", "challenge"].includes(timed.phase)) return state;
  const clock = snapshot(timed.clock, nowMs);
  let next = withTimed(state, { ...timed, clock });
  if (timed.phase === "countdown" && clock.stage !== "countdown") next = presentNextChallenge(next, dependencies);
  if (next.activeMatch?.timed.phase === "challenge" && clock.stage === "expired") {
    const current = next.activeMatch.timed.currentChallenge;
    const result = match.game === "palavraNaTesta" && current.presentedWithRemainingMs <= 4_000
      ? "ignored" : "missed";
    next = finishVisibleChallenge(next, result, nowMs, dependencies);
    next = nextAfterResult(next, nowMs, dependencies);
  }
  return next;
}

export function pauseClock(state, nowMs, dependencies = {}) {
  const match = requireTimed(state);
  if (!match.timed.clock || match.timed.clock.status === "paused") return state;
  const clock = { ...snapshot(match.timed.clock, nowMs), status: "paused", runningSinceMs: null };
  return withTimed(state, {
    ...match.timed,
    clock,
    pausedAt: dependencies.clock ? dependencies.clock.now().toISOString() : new Date().toISOString(),
    pauseReason: dependencies.reason || "paused",
  });
}

export function resumeClock(state, nowMs) {
  const match = requireTimed(state);
  if (!match.timed.clock || match.timed.clock.status !== "paused") return state;
  return withTimed(state, {
    ...match.timed,
    pauseReason: null,
    clock: { ...match.timed.clock, status: "running", runningSinceMs: nowMs },
  });
}

export function interruptTimedMatch(state, dependencies = {}) {
  const match = requireTimed(state);
  const nowMs = dependencies.nowMs ?? Date.now();
  let next = state;
  if (match.timed.clock?.status === "running") next = pauseClock(next, nowMs, dependencies);
  else next = withTimed(next, { ...next.activeMatch.timed, pauseReason: dependencies.reason || "paused" });
  if (next.activeMatch.state !== "interrupted") next = interruptMatch(next, { reason: dependencies.reason || "paused" }, dependencies);
  return next;
}

export function resumeTimedMatch(state, dependencies = {}) {
  const match = requireTimed(state);
  const nowMs = dependencies.nowMs ?? Date.now();
  let next = state;
  if (match.state === "interrupted") next = resumeMatch(next, { reason: dependencies.reason || "continued" }, dependencies);
  if (next.activeMatch.timed.clock?.status === "paused") next = resumeClock(next, nowMs);
  else next = withTimed(next, { ...next.activeMatch.timed, pauseReason: null });
  return next;
}

export function clockView(state, nowMs = Date.now()) {
  const match = requireTimed(state);
  const clock = match.timed.clock ? snapshot(match.timed.clock, nowMs) : null;
  if (!clock) return null;
  const tensionThresholdMs = Math.min(clock.durationMs * .25, 10_000);
  const tension = clock.stage === "active" && clock.remainingMs <= tensionThresholdMs
    ? Math.min(1, Math.max(0, 1 - (clock.remainingMs / tensionThresholdMs))) : 0;
  return {
    stage: clock.stage,
    countdownNumber: clock.stage === "countdown" ? Math.ceil(clock.countdownRemainingMs / 1_000) : null,
    remainingMs: clock.remainingMs,
    seconds: Math.ceil(clock.remainingMs / 1_000),
    tense: tension > 0,
    tension,
    finalSeconds: clock.stage === "active" && clock.remainingMs <= 3_000,
    status: clock.status,
  };
}

export function recordChallengeResult(state, result, dependencies = {}) {
  const match = requireTimed(state);
  const allowed = match.game === "mimica" ? ["correct", "missed"] : ["correct", "skipped"];
  if (match.timed.phase !== "challenge" || !allowed.includes(result)) throw new Error("Resultado inválido para o Desafio atual.");
  const nowMs = dependencies.nowMs ?? Date.now();
  const advanced = advanceClock(state, nowMs, dependencies);
  if (advanced.activeMatch?.timed.phase !== "challenge") return advanced;
  const finished = finishVisibleChallenge(advanced, result, nowMs, dependencies);
  return nextAfterResult(finished, nowMs, dependencies);
}

export function correctLatestResult(state, result, dependencies = {}) {
  const match = requireTimed(state);
  if (!match.timed.currentTurn) throw new Error("O Turno atual já foi encerrado.");
  const finished = [...match.events].reverse().find((event) => event.type === "challenge-finished"
    && event.turnId === match.timed.currentTurn.id);
  if (!finished) throw new Error("Ainda não há resultado para corrigir.");
  const allowed = match.game === "mimica" ? ["correct", "missed", "ignored"]
    : ["correct", "skipped", "missed", "ignored"];
  if (!allowed.includes(result)) throw new Error("Resultado corrigido inválido.");
  return gameRecords.correctResult(state, {
    resultId: finished.id,
    challengeId: finished.challengeId,
    originalOccurredAt: finished.occurredAt,
    previousResult: finished.result,
    result,
  }, dependencies);
}

export function endTurnEarly(state, dependencies = {}) {
  const match = requireTimed(state);
  const nowMs = dependencies.nowMs ?? Date.now();
  let next = state;
  if (match.timed.phase === "challenge") next = finishVisibleChallenge(next, "ignored", nowMs, dependencies);
  return finishCurrentTurn(next, match.timed.phase === "turn-summary" ? "completed" : "ended-early", dependencies);
}

export function endMatchEarly(state, dependencies = {}) {
  let next = state;
  const match = requireTimed(next);
  if (match.timed.currentTurn) next = endTurnEarly(next, dependencies);
  if (next.activeMatch?.timed.phase !== "cycle-complete") {
    next = gameRecords.finishCycle(next, {
      cycleId: next.activeMatch.timed.cycleId,
      cycleNumber: next.activeMatch.timed.cycleNumber,
      reason: "ended-early",
    }, dependencies);
  }
  return finishMatch(next, { reason: "ended-early" }, dependencies);
}

export function completeTimedMatch(state, dependencies = {}) {
  const match = requireTimed(state);
  if (match.timed.phase !== "cycle-complete") throw new Error("Conclua o Ciclo ou encerre a Partida antecipadamente.");
  return finishMatch(state, { reason: "completed" }, dependencies);
}

export function startNewCycle(state, dependencies = {}) {
  const match = requireTimed(state);
  if (match.timed.phase !== "cycle-complete") throw new Error("O Ciclo atual ainda não terminou.");
  const cycleNumber = match.timed.cycleNumber + 1;
  const cycleId = nextId(dependencies, "ciclo");
  const next = gameRecords.startCycle(state, { cycleId, cycleNumber }, dependencies);
  return withTimed(next, {
    ...match.timed,
    phase: "choose-player",
    cycleId,
    cycleNumber,
    playedPlayerIds: [],
    suggestedPlayerId: match.playerIds[0],
    currentTurn: null,
    currentChallenge: null,
    clock: null,
  });
}

export function continueMimic(state, dependencies = {}) {
  const match = requireTimed(state);
  if (match.game !== "mimica" || match.timed.phase !== "challenge-result") {
    throw new Error("Não há resultado de Mímica aguardando continuação.");
  }
  return withTimed(state, {
    ...match.timed,
    phase: "countdown",
    lastResult: null,
    clock: runningClock(durationMs(state, match.game), dependencies.nowMs ?? Date.now()),
  });
}

export function completeTurnSummary(state, dependencies = {}) {
  const match = requireTimed(state);
  if (match.timed.phase !== "turn-summary") throw new Error("O resumo do Turno ainda não está disponível.");
  return finishCurrentTurn(state, "completed", dependencies);
}

export function reshuffleTimedDeck(state, dependencies = {}) {
  const match = requireTimed(state);
  const next = createDeck(state, match.game, dependencies);
  if (match.timed.currentTurn) {
    const timed = next.activeMatch.timed;
    return match.game === "mimica"
      ? withTimed(next, { ...timed, phase: "countdown", clock: runningClock(durationMs(next, match.game), dependencies.nowMs ?? Date.now()) })
      : presentNextChallenge(withTimed(next, { ...timed, phase: "challenge" }), dependencies);
  }
  return withTimed(next, { ...next.activeMatch.timed, phase: "choose-player" });
}
