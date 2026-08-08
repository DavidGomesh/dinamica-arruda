import { createStore } from "./storage/store.js";
import { addPlayer, archiveOrDeletePlayer, updatePlayer } from "./domain/players.js";
import { updateSettings } from "./domain/settings.js";
import {
  addCustomContent, deleteCustomContent, toggleBuiltInContent, toggleCustomContent, updateCustomContent,
} from "./domain/content.js";
import { BUILT_IN_CONTENT } from "./data/content.js";
import { parseBackup, previewBackup, serializeBackup } from "./domain/backup.js";
import { formatTimestamp } from "./domain/time.js";

const store = createStore();
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let pendingRestore = null;
let deferredInstallPrompt = null;

const COLORS = [
  "#facc15", "#fb923c", "#fb7185", "#e879f9", "#c084fc", "#8b5cf6", "#6366f1",
  "#60a5fa", "#38bdf8", "#22d3ee", "#2dd4bf", "#34d399", "#4ade80", "#a3e635",
  "#bef264", "#fde047", "#fda4af", "#d8b4fe", "#93c5fd", "#99f6e4",
];
const ICONS = [
  ["guepardo", "🐆"], ["et", "👽"], ["leao", "🦁"], ["raposa", "🦊"], ["panda", "🐼"],
  ["sapo", "🐸"], ["polvo", "🐙"], ["coruja", "🦉"], ["pinguim", "🐧"], ["unicornio", "🦄"],
  ["robo", "🤖"], ["fantasma", "👻"], ["mago", "🧙"], ["pirata", "🏴‍☠️"], ["astronauta", "🧑‍🚀"],
  ["detetive", "🕵️"], ["ninja", "🥷"], ["palhaco", "🤡"], ["dragao", "🐉"], ["dinossauro", "🦖"],
];
const GAME_LABELS = {
  mimica: "Mímica", palavraNaTesta: "Palavra na Testa", quemMaisProvavel: "Quem é Mais Provável",
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[character]));
}

function iconFor(id) {
  return ICONS.find(([key]) => key === id)?.[1] || "🙂";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function page(title, eyebrow, content, action = "") {
  return `<section class="paper"><div class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div>${action}</div>${content}</section>`;
}

function currentRoute() {
  const raw = location.hash.replace(/^#/, "") || "home";
  const [name, query = ""] = raw.split("?");
  return { name, params: new URLSearchParams(query) };
}

function homeView(state) {
  const resume = state.activeMatch ? `<div class="resume">
    <div><strong>Partida interrompida</strong><p>${GAME_LABELS[state.activeMatch.game] || state.activeMatch.game} · ${state.activeMatch.playerIds.length} Jogadores</p></div>
    <div class="actions"><a class="button" href="#game-${state.activeMatch.game}">Continuar partida</a><button class="danger" data-action="discard-match">Descartar partida</button></div>
  </div>` : "";
  return page("Bora brincar?", "Diversão sem enrolação", `${resume}
    <p class="lede">Escolha uma brincadeira, junte a turma e passe o aparelho. Depois do primeiro acesso, funciona até sem internet.</p>
    <div class="grid game-grid">
      <a class="game-card mimica" href="#game-mimica"><span aria-hidden="true">🎭</span><strong>Mímica</strong><span>Desafios rápidos e muita atuação</span></a>
      <a class="game-card palavra" href="#game-palavraNaTesta"><span aria-hidden="true">🤔</span><strong>Palavra na Testa</strong><span>Adivinhe antes do tempo acabar</span></a>
      <a class="game-card provavel" href="#game-quemMaisProvavel"><span aria-hidden="true">👉</span><strong>Quem é Mais Provável</strong><span>Votação secreta no mesmo aparelho</span></a>
    </div>
    <div class="grid menu-grid">
      <a class="menu-card" href="#players"><span aria-hidden="true">👥</span> Jogadores</a>
      <a class="menu-card" href="#history"><span aria-hidden="true">🕒</span> Histórico e Estatísticas</a>
      <a class="menu-card" href="#content"><span aria-hidden="true">✍️</span> Conteúdo Personalizado</a>
      <a class="menu-card" href="#settings"><span aria-hidden="true">⚙️</span> Configurações</a>
      <a class="menu-card" href="#backup"><span aria-hidden="true">↕️</span> Backup e Transferência</a>
    </div>`);
}

function playerForm(player) {
  const selectedColor = player?.color || COLORS[0];
  const selectedIcon = player?.icon || ICONS[0][0];
  return `<form id="player-form">
    <input type="hidden" name="id" value="${escapeHtml(player?.id || "")}">
    <div class="form-grid">
      <label><span>Nome</span><input name="name" required maxlength="40" autocomplete="off" value="${escapeHtml(player?.name || "")}" placeholder="Como vamos chamar?"></label>
      <label><span>Cor do texto</span><select name="textColor"><option value="">Automática (melhor contraste)</option><option value="#111111" ${player?.textColorMode === "manual" && player.textColor === "#111111" ? "selected" : ""}>Escura</option><option value="#ffffff" ${player?.textColorMode === "manual" && player.textColor === "#ffffff" ? "selected" : ""}>Clara</option></select></label>
    </div>
    <fieldset><legend>Cor da ficha</legend><div class="choice-grid">${COLORS.map((color) => `<label class="choice color-choice" style="--choice:${color};--choice-text:#111"><input type="radio" name="color" value="${color}" ${color === selectedColor ? "checked" : ""}><span>${color}</span></label>`).join("")}</div></fieldset>
    <fieldset><legend>Ícone</legend><div class="choice-grid">${ICONS.map(([id, emoji]) => `<label class="choice"><input type="radio" name="icon" value="${id}" ${id === selectedIcon ? "checked" : ""}><span title="${id}">${emoji}</span></label>`).join("")}</div></fieldset>
    <div class="actions"><button type="submit">${player ? "Salvar alterações" : "Adicionar Jogador"}</button>${player ? '<a class="button secondary" href="#players">Cancelar</a>' : ""}</div>
  </form>`;
}

function playersView(state, params) {
  const editing = state.players.find((player) => player.id === params.get("edit"));
  const active = state.players.filter((player) => !player.archived);
  const archived = state.players.filter((player) => player.archived);
  const list = active.length ? `<ul class="player-list">${active.map((player) => `<li class="row-card">
    <div class="actions"><span class="player-badge" style="background:${player.color};color:${player.textColor}">${iconFor(player.icon)}</span><div><strong>${escapeHtml(player.name)}</strong><br><span class="muted">${escapeHtml(player.icon)}</span></div></div>
    <div class="actions"><a class="button secondary" href="#players?edit=${encodeURIComponent(player.id)}">Editar</a><button class="danger" data-action="archive-player" data-id="${escapeHtml(player.id)}">Remover</button></div>
  </li>`).join("")}</ul>` : '<p class="empty">Nenhum Jogador cadastrado ainda.</p>';
  const archivedList = archived.length ? `<details><summary><strong>Jogadores arquivados (${archived.length})</strong></summary><ul class="player-list">${archived.map((player) => `<li class="row-card"><span>${iconFor(player.icon)} ${escapeHtml(player.name)}</span><button class="secondary" data-action="restore-player" data-id="${escapeHtml(player.id)}">Reativar</button></li>`).join("")}</ul></details>` : "";
  return page("Jogadores", `${active.length} de 10 ativos`, `${playerForm(editing)}${list}${archivedList}`, '<a class="button secondary" href="#home">← Início</a>');
}

function settingsView(state) {
  const settings = state.settings;
  return page("Configurações", "Do seu jeito", `<form id="settings-form">
    <div class="callout"><label><input style="width:auto;min-height:auto" type="checkbox" name="soundEffects" ${settings.soundEffects ? "checked" : ""}> Efeitos sonoros ligados</label></div>
    <h2>Mímica</h2><div class="form-grid">
      <label><span>Duração por Desafio (segundos)</span><input type="number" name="mimicaDuration" min="10" max="600" value="${settings.games.mimica.durationSeconds}"></label>
      <label><span>Desafios por Turno</span><input type="number" name="mimicaChallenges" min="1" max="20" value="${settings.games.mimica.challengesPerTurn}"></label>
    </div><div class="actions"><button class="ghost" type="button" data-action="set-setting" data-input="mimicaDuration" data-value="30">30 s</button><button class="ghost" type="button" data-action="set-setting" data-input="mimicaDuration" data-value="40">40 s</button><button class="ghost" type="button" data-action="set-setting" data-input="mimicaDuration" data-value="60">60 s</button><button class="ghost" type="button" data-action="set-setting" data-input="mimicaChallenges" data-value="2">2 Desafios</button><button class="ghost" type="button" data-action="set-setting" data-input="mimicaChallenges" data-value="3">3 Desafios</button><button class="ghost" type="button" data-action="set-setting" data-input="mimicaChallenges" data-value="5">5 Desafios</button></div><h2>Palavra na Testa</h2>
    <label><span>Duração por Turno (segundos)</span><input type="number" name="foreheadDuration" min="10" max="600" value="${settings.games.palavraNaTesta.durationSeconds}"></label>
    <div class="actions"><button class="ghost" type="button" data-action="set-setting" data-input="foreheadDuration" data-value="60">60 s</button><button class="ghost" type="button" data-action="set-setting" data-input="foreheadDuration" data-value="90">90 s</button><button class="ghost" type="button" data-action="set-setting" data-input="foreheadDuration" data-value="120">120 s</button></div>
    <button type="submit">Salvar configurações</button>
  </form>`, '<a class="button secondary" href="#home">← Início</a>');
}

function contentView(state, params) {
  const selectedGame = params.get("game") || "mimica";
  const editing = state.content.custom.find((item) => item.id === params.get("edit"));
  const custom = state.content.custom.filter((item) => item.game === selectedGame);
  const disabled = new Set(state.content.disabledBuiltInIds);
  return page("Conteúdo", "Baralhos da turma", `<form id="content-filter"><label><span>Jogo</span><select name="game">${Object.entries(GAME_LABELS).map(([key, label]) => `<option value="${key}" ${key === selectedGame ? "selected" : ""}>${label}</option>`).join("")}</select></label></form>
    <h2>${editing ? "Editar item" : "Novo item personalizado"}</h2>
    <form id="content-form"><input type="hidden" name="id" value="${escapeHtml(editing?.id || "")}"><input type="hidden" name="game" value="${selectedGame}"><label><span>Texto</span><input name="text" required maxlength="160" value="${escapeHtml(editing?.text || "")}" placeholder="Digite um Desafio ou Pergunta"></label><div class="actions"><button type="submit">${editing ? "Salvar item" : "Adicionar ao baralho"}</button>${editing ? `<a class="button secondary" href="#content?game=${selectedGame}">Cancelar</a>` : ""}</div></form>
    <h2>Personalizados (${custom.length})</h2>${custom.length ? `<ul class="content-list">${custom.map((item) => `<li class="row-card"><label><input style="width:auto;min-height:auto" type="checkbox" data-action="toggle-custom" data-id="${item.id}" ${item.active ? "checked" : ""}> ${escapeHtml(item.text)}</label><div class="actions"><a class="button secondary" href="#content?game=${selectedGame}&edit=${encodeURIComponent(item.id)}">Editar</a><button class="danger" data-action="delete-content" data-id="${item.id}">Excluir</button></div></li>`).join("")}</ul>` : '<p class="empty">Nenhum item personalizado neste jogo.</p>'}
    <details><summary><strong>Conteúdo embutido (${BUILT_IN_CONTENT[selectedGame].length})</strong></summary><p class="muted">Pode ser ativado ou desativado, mas não editado.</p><ul class="content-list">${BUILT_IN_CONTENT[selectedGame].map((item) => `<li class="row-card"><label><input style="width:auto;min-height:auto" type="checkbox" data-action="toggle-built-in" data-game="${selectedGame}" data-id="${item.id}" ${disabled.has(item.id) ? "" : "checked"}> ${escapeHtml(item.text)}</label></li>`).join("")}</ul></details>`, '<a class="button secondary" href="#home">← Início</a>');
}

function backupView(state) {
  const serialized = serializeBackup(state);
  const preview = pendingRestore ? previewBackup({ data: pendingRestore }) : null;
  return page("Backup", "Seus dados, com você", `<h2>Exportar</h2><p class="muted">Inclui Jogadores, configurações, conteúdo, histórico e qualquer Partida interrompida.</p>
    <textarea id="backup-output" readonly aria-label="Texto do backup">${escapeHtml(serialized)}</textarea><div class="actions"><button data-action="copy-backup">Copiar texto</button><button class="secondary" data-action="download-backup">Baixar JSON</button></div>
    <h2>Restaurar</h2><p class="muted">Cole o texto ou escolha um arquivo. Nada será substituído antes da prévia e da confirmação.</p>
    <label><span>Arquivo JSON</span><input id="backup-file" type="file" accept="application/json,.json"></label><label><span>Texto do backup</span><textarea id="backup-input" placeholder="Cole o JSON aqui"></textarea></label><button data-action="preview-backup">Validar e ver prévia</button>
    ${preview ? `<div class="callout"><strong>Backup válido</strong><p>${preview.players} Jogadores · ${preview.matches} Partidas concluídas · ${preview.results} resultados</p><button class="danger" data-action="restore-backup">Confirmar e substituir os dados</button></div>` : ""}
    <div class="danger-zone"><h2>Apagar todos os dados</h2><p class="muted">Esta ação remove tudo deste navegador.</p><button class="danger" data-action="delete-all">Apagar todos os dados</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
}

function historyView(state) {
  const matches = [...state.matches].sort((a, b) => b.startedAt.instant.localeCompare(a.startedAt.instant));
  return page("Histórico", "Partidas salvas", matches.length ? `<ul class="history-list">${matches.map((match) => `<li class="row-card"><div><strong>${GAME_LABELS[match.game]}</strong><br><span class="muted">${formatTimestamp(match.startedAt)} · ${match.playerIds.length} Jogadores</span></div><span class="status">${escapeHtml(match.state)}</span></li>`).join("")}</ul>` : '<p class="empty">As Partidas concluídas aparecerão aqui.</p>', '<a class="button secondary" href="#home">← Início</a>');
}

function gameView(game) {
  return page(GAME_LABELS[game] || "Brincadeira", "Área pronta para jogar", `<div class="callout"><h2>Fundação concluída</h2><p>Cadastro, configurações, conteúdo, persistência e APIs de cronologia já estão disponíveis. O fluxo completo desta brincadeira será conectado no ticket específico do jogo.</p></div><a class="button" href="#players">Preparar Jogadores</a>`, '<a class="button secondary" href="#home">← Início</a>');
}

function render() {
  const state = store.load();
  const route = currentRoute();
  if (store.lastWarning) showToast(store.lastWarning);
  if (route.name === "home") app.innerHTML = homeView(state);
  else if (route.name === "players") app.innerHTML = playersView(state, route.params);
  else if (route.name === "settings") app.innerHTML = settingsView(state);
  else if (route.name === "content") app.innerHTML = contentView(state, route.params);
  else if (route.name === "backup") app.innerHTML = backupView(state);
  else if (route.name === "history") app.innerHTML = historyView(state);
  else if (route.name.startsWith("game-")) app.innerHTML = gameView(route.name.slice(5));
  else { location.hash = "#home"; return; }
  document.querySelectorAll(".bottom-nav a").forEach((link) => {
    const section = link.hash.slice(1);
    if (section === route.name) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
  document.title = `${app.querySelector("h1")?.textContent || "Dinâmica Arruda"} · Dinâmica Arruda`;
}

function formValues(form) { return Object.fromEntries(new FormData(form)); }
function safely(action) { try { action(); } catch (error) { showToast(error.message); } }

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues(event.target);
  safely(() => {
    if (event.target.id === "player-form") {
      store.update((state) => values.id ? updatePlayer(state, values.id, values) : addPlayer(state, values));
      location.hash = "#players"; showToast("Jogador salvo.");
    } else if (event.target.id === "settings-form") {
      store.update((state) => updateSettings(state, {
        soundEffects: event.target.elements.soundEffects.checked,
        mimicaDuration: values.mimicaDuration,
        mimicaChallenges: values.mimicaChallenges,
        foreheadDuration: values.foreheadDuration,
      }));
      showToast("Configurações salvas."); render();
    } else if (event.target.id === "content-form") {
      store.update((state) => values.id ? updateCustomContent(state, values.id, values) : addCustomContent(state, values));
      location.hash = `#content?game=${values.game}`; showToast("Conteúdo salvo.");
    } else if (event.target.id === "content-filter") {
      location.hash = `#content?game=${values.game}`;
    }
  });
});

app.addEventListener("change", (event) => {
  const action = event.target.dataset.action;
  safely(() => {
    if (event.target.closest("#content-filter")) {
      location.hash = `#content?game=${event.target.value}`;
    } else if (action === "toggle-custom") {
      store.update((state) => toggleCustomContent(state, event.target.dataset.id, event.target.checked));
      render();
    } else if (action === "toggle-built-in") {
      store.update((state) => toggleBuiltInContent(state, event.target.dataset.game, event.target.dataset.id, event.target.checked));
      render();
    } else if (event.target.id === "backup-file" && event.target.files[0]) {
      event.target.files[0].text().then((text) => { document.querySelector("#backup-input").value = text; });
    }
  });
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  safely(() => {
    if (action === "set-setting") {
      document.querySelector("#settings-form").elements[button.dataset.input].value = button.dataset.value;
    } else if (action === "archive-player" && confirm("Remover este Jogador? Com histórico, ele será arquivado; sem histórico, será excluído.")) {
      store.update((state) => archiveOrDeletePlayer(state, id)); render();
    } else if (action === "restore-player") {
      store.update((state) => updatePlayer(state, id, { archived: false })); render();
    } else if (action === "delete-content" && confirm("Excluir este conteúdo personalizado?")) {
      store.update((state) => deleteCustomContent(state, id)); render();
    } else if (action === "discard-match" && confirm("Descartar a Partida interrompida? O progresso dela será perdido.")) {
      store.update((state) => ({ ...state, activeMatch: null })); render();
    } else if (action === "copy-backup") {
      const output = document.querySelector("#backup-output");
      navigator.clipboard?.writeText(output.value).then(() => showToast("Backup copiado."));
    } else if (action === "download-backup") {
      const text = document.querySelector("#backup-output").value;
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `backup-dinamica-arruda-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url);
    } else if (action === "preview-backup") {
      pendingRestore = parseBackup(document.querySelector("#backup-input").value); render();
    } else if (action === "restore-backup" && pendingRestore && confirm("Substituir todos os dados locais por este backup?")) {
      store.replace(pendingRestore); pendingRestore = null; location.hash = "#home"; showToast("Backup restaurado.");
    } else if (action === "delete-all") {
      const answer = prompt('Para apagar tudo, digite APAGAR.');
      if (answer === "APAGAR") { store.clear(); pendingRestore = null; location.hash = "#home"; render(); showToast("Todos os dados foram apagados."); }
      else if (answer !== null) showToast("Confirmação incorreta. Nada foi apagado.");
    }
  });
});

window.addEventListener("hashchange", render);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); deferredInstallPrompt = event;
  document.querySelector("#install-button").hidden = false;
});
document.querySelector("#install-button").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; document.querySelector("#install-button").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js")
    .catch(() => showToast("Não foi possível preparar o uso offline.")));
}

render();
