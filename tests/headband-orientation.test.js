import test from "node:test";
import assert from "node:assert/strict";

import {
  createLandscapeLockController,
  headbandChallengeSize,
  headbandGestureResult,
  headbandOrientationDecision,
  isHeadbandMobileDevice,
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

test("desktop Windows com tela sensível ao toque não entra no modo móvel", () => {
  assert.equal(isHeadbandMobileDevice({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    platform: "Win32",
    maxTouchPoints: 10,
  }), false);
});

test("tablet Windows em uso por toque entra no modo móvel", () => {
  assert.equal(isHeadbandMobileDevice({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    platform: "Win32",
    maxTouchPoints: 10,
    coarsePointer: true,
    hoverNone: true,
  }), true);
});

test("saída durante bloqueio pendente libera a orientação depois que a API responde", async () => {
  let resolveLock;
  let unlockCount = 0;
  const pendingLock = new Promise((resolve) => { resolveLock = resolve; });
  const controller = createLandscapeLockController({
    lock: () => pendingLock,
    unlock: () => { unlockCount += 1; },
  });

  const locking = controller.sync({ requestLandscape: true, key: "match-1:turn-1" });
  await controller.sync({ requestLandscape: false, key: null });
  resolveLock();

  assert.equal(await locking, "unlocked-after-lock");
  assert.equal(unlockCount, 2);
});

test("Desafio extenso usa a tipografia mais compacta da tela na testa", () => {
  assert.equal(headbandChallengeSize("a".repeat(160)), "very-long");
});

test("deslizar para esquerda ou direita registra Acerto", () => {
  assert.equal(headbandGestureResult({ deltaX: -90, deltaY: 8 }), "correct");
  assert.equal(headbandGestureResult({ deltaX: 90, deltaY: -8 }), "correct");
});

test("deslizar para cima ou baixo registra Pulo", () => {
  assert.equal(headbandGestureResult({ deltaX: 6, deltaY: -90 }), "skipped");
  assert.equal(headbandGestureResult({ deltaX: -6, deltaY: 90 }), "skipped");
});

test("toque curto e diagonal ambígua não registram resultado", () => {
  assert.equal(headbandGestureResult({ deltaX: 18, deltaY: 4 }), null);
  assert.equal(headbandGestureResult({ deltaX: 70, deltaY: 70 }), null);
});
