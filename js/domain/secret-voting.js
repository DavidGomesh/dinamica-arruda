import { createDeck, drawNext } from "./decks.js";
import {
  createMatch, finishMatch, gameRecords, interruptMatch, resumeMatch, startMatch,
} from "./matches.js";

const GAME = "quemMaisProvavel";

function nextId(dependencies, prefix) {
  return (dependencies.createId || (() => globalThis.crypto?.randomUUID?.()
    || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`))();
}

function requireSecretVoting(state) {
  const match = state.activeMatch;
  if (!match?.secretVoting || match.game !== GAME) {
    throw new Error("Não há Partida de Quem é Mais Provável em andamento.");
  }
  return match;
}

export function isSecretVotingMatch(state) {
  return state.activeMatch?.game === GAME && Boolean(state.activeMatch.secretVoting);
}

export function hasVotingInProgress(state) {
  return isSecretVotingMatch(state) && ["handoff", "ballot"].includes(state.activeMatch.secretVoting.phase);
}

function withSecretVoting(state, secretVoting) {
  return { ...state, activeMatch: { ...state.activeMatch, secretVoting } };
}

function validatePlayers(state, playerIds) {
  const activeIds = new Set(state.players.filter((player) => !player.archived).map((player) => player.id));
  if (!playerIds?.length || new Set(playerIds).size !== playerIds.length
    || playerIds.some((id) => !activeIds.has(id))) {
    throw new Error("Selecione Jogadores ativos sem repetição.");
  }
}

function presentQuestion(state, dependencies = {}) {
  let deckState = state;
  if (!deckState.decks[GAME]) deckState = createDeck(deckState, GAME, dependencies);
  const draw = drawNext(deckState, GAME);
  if (draw.exhausted) {
    return withSecretVoting(draw.state, {
      ...draw.state.activeMatch.secretVoting,
      phase: "deck-exhausted",
      question: null,
      voting: null,
      currentVoterId: null,
    });
  }

  const questionId = nextId(dependencies, "pergunta");
  let next = gameRecords.presentQuestion(draw.state, {
    questionId,
    contentId: draw.item.id,
    content: draw.item.text,
  }, dependencies);
  const votingId = nextId(dependencies, "votacao");
  return withSecretVoting(next, {
    ...next.activeMatch.secretVoting,
    phase: "question",
    question: { id: questionId, contentId: draw.item.id, text: draw.item.text },
    voting: { id: votingId, voterIds: [...next.activeMatch.playerIds], currentIndex: 0, votes: [] },
    currentVoterId: null,
  });
}

export function beginSecretVotingMatch(state, input, dependencies = {}) {
  validatePlayers(state, input.playerIds);
  let next = createMatch(state, { game: GAME, playerIds: input.playerIds }, dependencies);
  next = startMatch(next, {}, dependencies);
  next = withSecretVoting(next, {
    phase: "starting",
    question: null,
    voting: null,
    currentVoterId: null,
    completedQuestions: [],
  });
  return presentQuestion(next, dependencies);
}

export function startSecretVoting(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.secretVoting.phase !== "question") throw new Error("A Pergunta ainda não está pronta para Votação.");
  const next = gameRecords.startVoting(state, {
    votingId: match.secretVoting.voting.id,
    questionId: match.secretVoting.question.id,
  }, dependencies);
  return withSecretVoting(next, {
    ...match.secretVoting,
    phase: "handoff",
    currentVoterId: match.secretVoting.voting.voterIds[0],
  });
}

export function beginMyVote(state) {
  const match = requireSecretVoting(state);
  if (match.secretVoting.phase !== "handoff") throw new Error("Não é possível começar este Voto agora.");
  return withSecretVoting(state, { ...match.secretVoting, phase: "ballot" });
}

export function recordVote(state, chosenPlayerId, dependencies = {}) {
  const match = requireSecretVoting(state);
  const secret = match.secretVoting;
  if (secret.phase !== "ballot") throw new Error("Comece seu Voto antes de escolher.");
  if (!match.playerIds.includes(chosenPlayerId)) throw new Error("Escolha um Jogador desta Partida.");
  const voterId = secret.currentVoterId;
  if (secret.voting.votes.some((vote) => vote.voterId === voterId)) {
    throw new Error("Este Jogador já realizou seu Voto.");
  }
  const voteId = nextId(dependencies, "voto");
  let next = gameRecords.recordVote(state, {
    voteId,
    votingId: secret.voting.id,
    questionId: secret.question.id,
    voterId,
    chosenPlayerId,
  }, dependencies);
  const event = next.activeMatch.events.at(-1);
  const votes = [...secret.voting.votes, {
    id: voteId, voterId, chosenPlayerId, occurredAt: event.occurredAt,
  }];
  const currentIndex = secret.voting.currentIndex + 1;
  const complete = currentIndex >= secret.voting.voterIds.length;
  let completedQuestions = secret.completedQuestions;
  if (complete) {
    next = gameRecords.finishVoting(next, {
      votingId: secret.voting.id,
      questionId: secret.question.id,
    }, dependencies);
    completedQuestions = [...completedQuestions, {
      question: { ...secret.question },
      votingId: secret.voting.id,
      votes,
      completedAt: next.activeMatch.events.at(-1).occurredAt,
    }];
  }
  return withSecretVoting(next, {
    ...secret,
    phase: complete ? "voting-complete" : "handoff",
    currentVoterId: complete ? null : secret.voting.voterIds[currentIndex],
    voting: { ...secret.voting, currentIndex, votes },
    completedQuestions,
  });
}

export function revealVotingResult(state) {
  const match = requireSecretVoting(state);
  if (match.secretVoting.phase !== "voting-complete") {
    throw new Error("A Votação ainda não foi concluída.");
  }
  return withSecretVoting(state, { ...match.secretVoting, phase: "result" });
}

export function nextSecretVotingQuestion(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.secretVoting.phase !== "result") {
    throw new Error("Exiba o resultado antes de seguir para a próxima Pergunta.");
  }
  return presentQuestion(state, dependencies);
}

export function interruptSecretVotingMatch(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.state === "interrupted") return state;
  let next = state;
  if (hasVotingInProgress(state)) {
    next = gameRecords.interruptVoting(next, {
      votingId: match.secretVoting.voting.id,
      questionId: match.secretVoting.question.id,
      reason: dependencies.reason || "paused",
    }, dependencies);
  }
  next = interruptMatch(next, { reason: dependencies.reason || "paused" }, dependencies);
  return next;
}

export function resumeSecretVotingMatch(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.state !== "interrupted") return state;
  let next = resumeMatch(state, { reason: dependencies.reason || "continued" }, dependencies);
  if (hasVotingInProgress(state)) {
    next = gameRecords.resumeVoting(next, {
      votingId: match.secretVoting.voting.id,
      questionId: match.secretVoting.question.id,
      reason: dependencies.reason || "continued",
    }, dependencies);
  }
  return next;
}

export function deleteInterruptedVoting(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.state !== "interrupted" || !["handoff", "ballot"].includes(match.secretVoting.phase)) {
    throw new Error("Não há Votação interrompida para excluir.");
  }
  let next = resumeMatch(state, { reason: "voting-deleted" }, dependencies);
  next = gameRecords.deleteVoting(next, {
    votingId: match.secretVoting.voting.id,
    questionId: match.secretVoting.question.id,
    discardedVoteCount: match.secretVoting.voting.votes.length,
  }, dependencies);
  return presentQuestion(next, dependencies);
}

export function endSecretVotingMatch(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  const votingInProgress = hasVotingInProgress(state);
  let next = state;
  if (votingInProgress && match.state !== "interrupted") {
    next = gameRecords.interruptVoting(next, {
      votingId: match.secretVoting.voting.id,
      questionId: match.secretVoting.question.id,
      reason: "match-ended",
    }, dependencies);
  }
  return finishMatch(next, { reason: votingInProgress ? "ended-early" : "completed" }, dependencies);
}

export function reshuffleSecretVotingDeck(state, dependencies = {}) {
  const match = requireSecretVoting(state);
  if (match.secretVoting.phase !== "deck-exhausted") throw new Error("O baralho de Perguntas ainda não acabou.");
  return presentQuestion(createDeck(state, GAME, dependencies), dependencies);
}

export function secretVotingView(state, { includeIndividualVotes = false } = {}) {
  const match = requireSecretVoting(state);
  const secret = match.secretVoting;
  const view = {
    phase: secret.phase,
    question: secret.question ? { ...secret.question } : null,
    currentVoterId: secret.currentVoterId,
    playerIds: [...match.playerIds],
    completedQuestionCount: secret.completedQuestions.length,
  };
  if (secret.phase !== "result") return view;
  const totals = Object.fromEntries(match.playerIds.map((playerId) => [playerId, 0]));
  secret.voting.votes.forEach((vote) => { totals[vote.chosenPlayerId] += 1; });
  const highest = Math.max(...Object.values(totals));
  view.totals = totals;
  view.winnerIds = match.playerIds.filter((playerId) => totals[playerId] === highest);
  if (includeIndividualVotes) {
    view.individualVotes = secret.voting.votes.map(({ voterId, chosenPlayerId }) => ({ voterId, chosenPlayerId }));
  }
  return view;
}
