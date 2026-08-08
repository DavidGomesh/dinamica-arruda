import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultState } from "../js/storage/store.js";
import { updateSettings } from "../js/domain/settings.js";

test("configurações globais e dos jogos são persistidas com limites razoáveis", () => {
  const state = updateSettings(createDefaultState(), {
    soundEffects: false,
    mimicaDuration: 60,
    mimicaChallenges: 5,
    foreheadDuration: 120,
  });
  assert.equal(state.settings.soundEffects, false);
  assert.equal(state.settings.games.mimica.durationSeconds, 60);
  assert.equal(state.settings.games.mimica.challengesPerTurn, 5);
  assert.equal(state.settings.games.palavraNaTesta.durationSeconds, 120);
  assert.throws(() => updateSettings(state, { mimicaDuration: 0 }), /duração/i);
});
