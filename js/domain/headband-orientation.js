export function headbandOrientationDecision(input) {
  const activePhase = ["countdown", "challenge"].includes(input.phase);
  const activeTurn = input.routeName === "game-palavraNaTesta"
    && input.game === "palavraNaTesta" && activePhase && input.mobile && input.visible;
  const pausedForOrientation = input.matchState === "interrupted" && input.pauseReason === "orientation";

  return {
    immersive: activeTurn && input.matchState === "in-progress" && !input.portrait,
    needsLandscape: activeTurn && input.portrait
      && (input.matchState === "in-progress" || pausedForOrientation),
    clockAction: activeTurn && input.matchState === "in-progress" && input.portrait
      ? "pause-orientation"
      : activeTurn && pausedForOrientation && !input.portrait ? "resume-orientation" : null,
    requestLandscape: activeTurn && (input.matchState === "in-progress" || pausedForOrientation),
  };
}

export function createLandscapeLockController(api = {}) {
  let requestedKey = null;

  return {
    async sync({ requestLandscape, key }) {
      if (!requestLandscape) {
        if (requestedKey && api.unlock) api.unlock();
        const released = Boolean(requestedKey);
        requestedKey = null;
        return released ? "unlocked" : "unchanged";
      }
      if (!api.lock || requestedKey === key) return "unchanged";
      requestedKey = key;
      try {
        await api.lock("landscape");
        return "locked";
      } catch {
        return "rejected";
      }
    },
  };
}
