function bounded(value, fallback, label, minimum, maximum) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} deve ficar entre ${minimum} e ${maximum}.`);
  }
  return number;
}

export function updateSettings(state, input) {
  const current = state.settings;
  return {
    ...state,
    settings: {
      ...current,
      soundEffects: input.soundEffects ?? current.soundEffects,
      games: {
        ...current.games,
        mimica: {
          ...current.games.mimica,
          durationSeconds: bounded(input.mimicaDuration, current.games.mimica.durationSeconds, "A duração da Mímica", 10, 600),
          challengesPerTurn: bounded(input.mimicaChallenges, current.games.mimica.challengesPerTurn, "A quantidade de Desafios", 1, 20),
        },
        palavraNaTesta: {
          ...current.games.palavraNaTesta,
          durationSeconds: bounded(input.foreheadDuration, current.games.palavraNaTesta.durationSeconds, "A duração de Palavra na Testa", 10, 600),
        },
      },
    },
  };
}
