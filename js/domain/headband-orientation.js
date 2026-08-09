export const HEADBAND_CLOCK_ACTION = Object.freeze({
  pause: "pause-orientation",
  resume: "resume-orientation",
});
export const HEADBAND_PAUSE_REASON = "orientation";

export function isHeadbandMobileDevice({ userAgent = "", platform = "", maxTouchPoints = 0 }) {
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
    || (/Mac/i.test(platform) && maxTouchPoints > 1);
}

export function headbandChallengeSize(content = "") {
  if (content.length > 80) return "very-long";
  if (content.length > 40) return "long";
  return "normal";
}

export function headbandGestureResult({ deltaX, deltaY }, { minDistance = 56, axisRatio = 1.15 } = {}) {
  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  if (horizontal >= minDistance && horizontal >= vertical * axisRatio) return "correct";
  if (vertical >= minDistance && vertical >= horizontal * axisRatio) return "skipped";
  return null;
}

export function headbandOrientationDecision(input) {
  const activePhase = ["countdown", "challenge"].includes(input.phase);
  const activeTurn = input.routeName === "game-palavraNaTesta"
    && input.game === "palavraNaTesta" && activePhase && input.mobile && input.visible;
  const pausedForOrientation = input.matchState === "interrupted" && input.pauseReason === HEADBAND_PAUSE_REASON;

  return {
    immersive: activeTurn && input.matchState === "in-progress" && !input.portrait,
    needsLandscape: activeTurn && input.portrait
      && (input.matchState === "in-progress" || pausedForOrientation),
    clockAction: activeTurn && input.matchState === "in-progress" && input.portrait
      ? HEADBAND_CLOCK_ACTION.pause
      : activeTurn && pausedForOrientation && !input.portrait ? HEADBAND_CLOCK_ACTION.resume : null,
    requestLandscape: activeTurn && (input.matchState === "in-progress" || pausedForOrientation),
  };
}

export function createLandscapeLockController(api = {}) {
  let requestedKey = null;
  let requestVersion = 0;

  async function unlock() {
    try { await api.unlock?.(); } catch { /* API opcional */ }
  }

  return {
    async sync({ requestLandscape, key }) {
      if (!requestLandscape) {
        const released = Boolean(requestedKey);
        requestVersion += 1;
        requestedKey = null;
        if (released) await unlock();
        return released ? "unlocked" : "unchanged";
      }
      if (!api.lock || requestedKey === key) return "unchanged";
      requestedKey = key;
      const version = ++requestVersion;
      try {
        await api.lock("landscape");
        if (version !== requestVersion || requestedKey !== key) {
          await unlock();
          return "unlocked-after-lock";
        }
        return "locked";
      } catch {
        return "rejected";
      }
    },
  };
}
