import test from "node:test";
import assert from "node:assert/strict";

import {
  createLandscapeLockController,
  headbandOrientationDecision,
} from "../js/domain/headband-orientation.js";

const landscapeCountdown = {
  routeName: "game-palavraNaTesta",
  game: "palavraNaTesta",
  phase: "countdown",
  matchState: "in-progress",
  pauseReason: null,
  mobile: true,
  portrait: false,
  visible: true,
};

test("Turno de Palavra na Testa entra no modo paisagem desde a contagem", () => {
  assert.deepEqual(headbandOrientationDecision(landscapeCountdown), {
    immersive: true,
    needsLandscape: false,
    clockAction: null,
    requestLandscape: true,
  });
});

test("Turno em retrato pede o giro e pausa o relógio", () => {
  assert.deepEqual(headbandOrientationDecision({ ...landscapeCountdown, portrait: true }), {
    immersive: false,
    needsLandscape: true,
    clockAction: "pause-orientation",
    requestLandscape: true,
  });
});

test("Turno pausado pela orientação retoma quando volta à paisagem", () => {
  assert.deepEqual(headbandOrientationDecision({
    ...landscapeCountdown,
    matchState: "interrupted",
    pauseReason: "orientation",
  }), {
    immersive: false,
    needsLandscape: false,
    clockAction: "resume-orientation",
    requestLandscape: true,
  });
});

test("pausa manual não é retomada nem transformada em pausa de orientação", () => {
  assert.deepEqual(headbandOrientationDecision({
    ...landscapeCountdown,
    portrait: true,
    matchState: "interrupted",
    pauseReason: "manual",
  }), {
    immersive: false,
    needsLandscape: false,
    clockAction: null,
    requestLandscape: false,
  });
});

test("rejeição do bloqueio de orientação não interrompe o Turno", async () => {
  const controller = createLandscapeLockController({
    lock: async () => { throw new Error("bloqueio indisponível"); },
  });

  await assert.doesNotReject(controller.sync({ requestLandscape: true, key: "match-1:turn-1" }));
  assert.equal(await controller.sync({ requestLandscape: true, key: "match-1:turn-1" }), "unchanged");
});

test("sair do Turno libera o bloqueio de orientação", async () => {
  let unlocked = false;
  const controller = createLandscapeLockController({
    lock: async () => {},
    unlock: () => { unlocked = true; },
  });

  await controller.sync({ requestLandscape: true, key: "match-1:turn-1" });
  assert.equal(await controller.sync({ requestLandscape: false, key: null }), "unlocked");
  assert.equal(unlocked, true);
});
