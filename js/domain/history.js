function chronological(events = []) {
  return events.map((event, index) => ({ event, index })).sort((left, right) => {
    const instantOrder = left.event.occurredAt.instant.localeCompare(right.event.occurredAt.instant);
    return instantOrder || left.index - right.index;
  }).map(({ event }) => event);
}

function localDate(timestamp) {
  const localMs = Date.parse(timestamp.instant) + timestamp.offsetMinutes * 60_000;
  return new Date(localMs).toISOString().slice(0, 10);
}

function durationMs(match) {
  if (!match.startedAt || !match.endedAt) return null;
  return Math.max(0, Date.parse(match.endedAt.instant) - Date.parse(match.startedAt.instant));
}

function playerNames(state, ids) {
  const names = new Map(state.players.map((player) => [player.id, player.name]));
  return ids.map((id) => ({ id, name: names.get(id) || "Jogador removido" }));
}

function correctedResults(match) {
  const corrections = new Map();
  chronological(match.events).filter((event) => event.type === "result-corrected")
    .forEach((event) => corrections.set(event.resultId, event.result));
  return corrections;
}

function completedVotingIds(match) {
  return new Set(match.events.filter((event) => event.type === "voting-finished").map((event) => event.votingId));
}

export function historyByDay(state) {
  const summaries = state.matches.map((match) => ({
    id: match.id,
    game: match.game,
    state: match.state,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    durationMs: durationMs(match),
    participants: playerNames(state, match.playerIds),
    turnCount: match.events.filter((event) => event.type === "turn-finished").length,
    questionCount: match.events.filter((event) => event.type === "voting-finished").length,
  })).sort((left, right) => right.startedAt.instant.localeCompare(left.startedAt.instant));
  const groups = new Map();
  summaries.forEach((match) => {
    const date = localDate(match.startedAt);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(match);
  });
  return [...groups].map(([date, matches]) => ({ date, matches }));
}

export function matchHistory(state, matchId, { includeIndividualVotes = false } = {}) {
  const match = state.matches.find((candidate) => candidate.id === matchId);
  if (!match) throw new Error("Partida não encontrada.");
  const corrections = correctedResults(match);
  const timeline = chronological(match.events).map((event) => {
    const item = event.type === "challenge-finished" && corrections.has(event.id)
      ? { ...event, originalResult: event.result, result: corrections.get(event.id) }
      : { ...event };
    if (item.type === "vote-recorded" && !includeIndividualVotes) {
      const { voterId, chosenPlayerId, ...privateVote } = item;
      return privateVote;
    }
    return item;
  });
  return {
    id: match.id,
    game: match.game,
    state: match.state,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    durationMs: durationMs(match),
    participants: playerNames(state, match.playerIds),
    timeline,
  };
}

function emptyGames() {
  return {
    mimica: { total: 0, correct: 0, missed: 0, ignored: 0, accuracyPercent: 0 },
    palavraNaTesta: { total: 0, correct: 0, skipped: 0, missed: 0, ignored: 0, accuracyPercent: 0 },
    quemMaisProvavel: { votesReceived: 0, byQuestion: [] },
  };
}

export function playerStatistics(state) {
  const statistics = new Map(state.players.map((player) => [player.id, { player, games: emptyGames(), history: [] }]));
  state.matches.forEach((match) => {
    const completed = completedVotingIds(match);
    const finishedChallenges = match.events.filter((event) => event.type === "challenge-finished");
    const completedVotes = match.events.filter((event) => event.type === "vote-recorded" && completed.has(event.votingId));
    match.playerIds.forEach((playerId) => {
      const player = statistics.get(playerId);
      if (!player) return;
      player.history.push({
        matchId: match.id,
        game: match.game,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
        results: finishedChallenges.filter((event) => event.playerId === playerId).length,
        votesReceived: completedVotes.filter((event) => event.chosenPlayerId === playerId).length,
      });
    });
    if (match.game === "mimica" || match.game === "palavraNaTesta") {
      const corrections = correctedResults(match);
      finishedChallenges.forEach((event) => {
        const game = statistics.get(event.playerId)?.games[match.game];
        if (!game) return;
        const result = corrections.get(event.id) || event.result;
        game.total += 1;
        if (Object.hasOwn(game, result)) game[result] += 1;
      });
    }
    if (match.game === "quemMaisProvavel") {
      const questions = new Map(match.events.filter((event) => event.type === "question-presented")
        .map((event) => [event.questionId, event.content]));
      completedVotes.forEach((event) => {
          const game = statistics.get(event.chosenPlayerId)?.games.quemMaisProvavel;
          if (!game) return;
          game.votesReceived += 1;
          let detail = game.byQuestion.find((item) => item.questionId === event.questionId);
          if (!detail) {
            detail = { questionId: event.questionId, question: questions.get(event.questionId) || "Pergunta", votesReceived: 0 };
            game.byQuestion.push(detail);
          }
          detail.votesReceived += 1;
        });
    }
  });
  statistics.forEach(({ games }) => {
    [games.mimica, games.palavraNaTesta].forEach((game) => {
      game.accuracyPercent = game.total ? Math.round((game.correct / game.total) * 100) : 0;
    });
  });
  statistics.forEach((entry) => entry.history.sort((left, right) => right.startedAt.instant.localeCompare(left.startedAt.instant)));
  return [...statistics.values()];
}

export function deleteMatch(state, matchId) {
  if (!state.matches.some((match) => match.id === matchId)) throw new Error("Partida não encontrada.");
  return { ...state, matches: state.matches.filter((match) => match.id !== matchId) };
}
