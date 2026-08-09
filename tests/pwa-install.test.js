import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createPwaInstallController, isIosInstallPlatform } from "../js/pwa-install.js";

function installButton() {
  return { hidden: true, textContent: "Instalar app" };
}

test("atributo hidden prevalece sobre o display global de botões", async () => {
  const css = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  assert.match(css, /\[hidden\]\s*{\s*display:\s*none\s*!important;?\s*}/);
});

test("navegador sem fluxo de instalação não exibe um botão sem ação", () => {
  const button = installButton();
  createPwaInstallController({ button }).start();
  assert.equal(button.hidden, true);
});

test("iPhone oferece instruções para adicionar à Tela de Início", async () => {
  const button = installButton();
  const messages = [];
  const controller = createPwaInstallController({
    button,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    showMessage: (message) => messages.push(message),
  });

  controller.start();
  assert.equal(button.hidden, false);
  assert.equal(button.textContent, "Como instalar");

  await controller.install();
  assert.match(messages[0], /Compartilhar.+Adicionar à Tela de Início/);
});

test("prompt oferecido pelo navegador é aberto pelo botão", async () => {
  const button = installButton();
  let prompted = 0;
  let prevented = 0;
  const controller = createPwaInstallController({ button });

  controller.handleBeforeInstallPrompt({
    preventDefault: () => { prevented += 1; },
    prompt: async () => { prompted += 1; },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });

  assert.equal(prevented, 1);
  assert.equal(button.hidden, false);
  await controller.install();
  assert.equal(prompted, 1);
  assert.equal(button.hidden, true);
});

test("modo instalado mantém o controle oculto", () => {
  const button = installButton();
  const controller = createPwaInstallController({ button, standalone: true });
  controller.start();
  controller.handleBeforeInstallPrompt({ preventDefault() {} });
  assert.equal(button.hidden, true);
});

test("iPad com user agent de desktop é reconhecido", () => {
  assert.equal(isIosInstallPlatform({ platform: "MacIntel", maxTouchPoints: 5 }), true);
});
