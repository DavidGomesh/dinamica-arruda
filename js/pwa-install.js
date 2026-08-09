const IOS_INSTALL_MESSAGE = "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.";
const PROMPT_ERROR_MESSAGE = "Não foi possível abrir a instalação. Tente pelo menu do navegador.";
export const INSTALLED_PWA_DISPLAY_MODES = [
  "standalone", "minimal-ui", "fullscreen", "window-controls-overlay",
];

export function isIosInstallPlatform({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isInstalledPwaDisplay(matchesDisplayMode, iosStandalone = false) {
  return iosStandalone || INSTALLED_PWA_DISPLAY_MODES.some((mode) => matchesDisplayMode(mode));
}

export function createPwaInstallController({
  button,
  showMessage = () => {},
  standalone = false,
  isInstalled = () => false,
  userAgent = "",
  platform = "",
  maxTouchPoints = 0,
} = {}) {
  let installed = standalone || isInstalled();
  let deferredPrompt = null;
  const iosInstall = isIosInstallPlatform({ userAgent, platform, maxTouchPoints });

  function syncButton() {
    if (!button) return;
    if (isInstalled()) installed = true;
    const offersInstructions = iosInstall && !installed;
    button.hidden = installed || (!deferredPrompt && !offersInstructions);
    button.textContent = deferredPrompt ? "Instalar app" : offersInstructions ? "Como instalar" : "Instalar app";
  }

  return {
    start() {
      syncButton();
    },

    handleBeforeInstallPrompt(event) {
      if (installed) {
        syncButton();
        return;
      }
      event.preventDefault();
      deferredPrompt = event;
      syncButton();
    },

    handleAppInstalled() {
      installed = true;
      deferredPrompt = null;
      syncButton();
    },

    handleDisplayModeChange() {
      syncButton();
    },

    async install() {
      if (installed) return { outcome: "installed" };

      if (!deferredPrompt) {
        if (iosInstall) {
          showMessage(IOS_INSTALL_MESSAGE);
          return { outcome: "instructions" };
        }
        syncButton();
        return { outcome: "unavailable" };
      }

      const prompt = deferredPrompt;
      try {
        await prompt.prompt();
        return await prompt.userChoice;
      } catch {
        showMessage(PROMPT_ERROR_MESSAGE);
        return { outcome: "error" };
      } finally {
        deferredPrompt = null;
        syncButton();
      }
    },
  };
}
