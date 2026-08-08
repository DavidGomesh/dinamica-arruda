import { createStore } from "./storage/store.js";
import { addPlayer, archiveOrDeletePlayer, updatePlayer } from "./domain/players.js";
import { updateSettings } from "./domain/settings.js";
import {
  addCustomContent, deleteCustomContent, toggleBuiltInContent, toggleCustomContent, updateCustomContent,
} from "./domain/content.js";
import { BUILT_IN_CONTENT } from "./data/content.js";
import { parseBackup, previewBackup, serializeBackup } from "./domain/backup.js";
import { formatTimestamp } from "./domain/time.js";
import {
  advanceClock, beginTimedMatch, beginTurn, clockView, completeTimedMatch, completeTurnSummary,
  continueMimic, correctLatestResult, endMatchEarly, endTurnEarly, interruptTimedMatch,
  recordChallengeResult, reshuffleTimedDeck, resumeTimedMatch, startNewCycle,
} from "./domain/timed-games.js";

const store = createStore();
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let pendingRestore = null;
let deferredInstallPrompt = null;
let wakeLock = null;
let lastSoundToken = "";

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

function playerName(state, id) {
  return state.players.find((player) => player.id === id)?.name || "Jogador";
}

function turnResults(match, turnId) {
  const results = match.events.filter((event) => event.type === "challenge-finished" && event.turnId === turnId)
    .map((event) => ({ ...event }));
  const byId = new Map(results.map((result) => [result.id, result]));
  match.events.filter((event) => event.type === "result-corrected").forEach((correction) => {
    const original = byId.get(correction.resultId);
    if (original) original.result = correction.result;
  });
  return results;
}

function resultLabel(result) {
  return ({ correct: "Acerto", missed: "Erro", skipped: "Pulo", ignored: "Ignorado" })[result] || result;
}

function lastTurnSummary(state, match) {
  const finished = [...match.events].reverse().find((event) => event.type === "turn-finished");
  if (!finished) return "";
  const results = turnResults(match, finished.turnId);
  const totals = results.reduce((all, result) => ({ ...all, [result.result]: (all[result.result] || 0) + 1 }), {});
  return `<div class="turn-summary"><strong>Resumo do Turno de ${escapeHtml(playerName(state, finished.playerId))}</strong><p>${Object.entries(totals).map(([result, count]) => `${count} ${resultLabel(result).toLowerCase()}`).join(" · ") || "Nenhum resultado"}</p></div>`;
}

function currentTurnSummary(state, match) {
  const turn = match.timed.currentTurn;
  const results = turnResults(match, turn.id);
  const totals = results.reduce((all, result) => ({ ...all, [result.result]: (all[result.result] || 0) + 1 }), {});
  return `<div class="turn-summary"><strong>Resumo do Turno de ${escapeHtml(playerName(state, turn.playerId))}</strong><p>${Object.entries(totals).map(([result, count]) => `${count} ${resultLabel(result).toLowerCase()}`).join(" · ") || "Nenhum resultado"}</p></div>`;
}

function correctionMarkup(game) {
  const choices = game === "mimica" ? ["correct", "missed", "ignored"] : ["correct", "skipped", "missed", "ignored"];
  return `<details class="correction"><summary>Corrigir resultado mais recente</summary><div class="actions">${choices.map((result) => `<button class="ghost" data-action="correct-result" data-result="${result}">${resultLabel(result)}</button>`).join("")}</div></details>`;
}

function timerMarkup(state) {
  const view = clockView(state, Date.now());
  if (!view) return "";
  if (view.stage === "countdown") return `<div class="countdown" role="timer" aria-live="assertive"><span>${view.countdownNumber}</span><small>Prepare-se!</small></div>`;
  const tensionStyle = view.tense ? ` style="--tension:${view.tension.toFixed(3)};--pulse-speed:${(1 - view.tension * .7).toFixed(3)}s;--pulse-scale:${(1 + view.tension * .08).toFixed(3)}"` : "";
  return `<div class="game-timer ${view.tense ? "tense" : ""} ${view.finalSeconds ? "final" : ""}"${tensionStyle} role="timer" aria-label="${view.seconds} segundos restantes"><span>${view.seconds}</span><small>segundos</small></div>`;
}

function gameView(state, game) {
  if (!["mimica", "palavraNaTesta"].includes(game)) {
    return page(GAME_LABELS[game] || "Brincadeira", "Em breve", '<p class="empty">Este jogo será conectado em outro ticket.</p>', '<a class="button secondary" href="#home">← Início</a>');
  }
  const active = state.activeMatch;
  if (active && active.game !== game) {
    return page(GAME_LABELS[game], "Já existe uma Partida", `<div class="callout"><p>Continue ou descarte a Partida de ${escapeHtml(GAME_LABELS[active.game])} antes de começar outra.</p><a class="button" href="#game-${active.game}">Continuar partida</a></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }
  if (!active) {
    const players = state.players.filter((player) => !player.archived);
    const choices = players.map((player) => `<label class="player-choice"><input type="checkbox" name="playerIds" value="${escapeHtml(player.id)}"><span class="player-badge" style="background:${player.color};color:${player.textColor}">${iconFor(player.icon)}</span><strong>${escapeHtml(player.name)}</strong></label>`).join("");
    return page(GAME_LABELS[game], "Escolha os Jogadores", players.length
      ? `<form id="timed-game-form" data-game="${game}"><div class="player-choice-grid">${choices}</div><button type="submit">Iniciar Partida</button></form>`
      : '<div class="empty"><p>Cadastre pelo menos um Jogador para começar.</p><a class="button" href="#players">Cadastrar Jogadores</a></div>', '<a class="button secondary" href="#home">← Início</a>');
  }

  const timed = active.timed;
  const summary = lastTurnSummary(state, active);
  if (active.state === "interrupted") {
    return page(GAME_LABELS[game], "Partida pausada", `${timerMarkup(state)}<p class="empty">O tempo está congelado. Continue quando o aparelho estiver pronto.</p><div class="actions"><button data-action="resume-timed">Continuar</button><button class="danger" data-action="end-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }
  if (timed.phase === "choose-player") {
    const ordered = [...active.playerIds].sort((left, right) => Number(timed.playedPlayerIds.includes(left)) - Number(timed.playedPlayerIds.includes(right)));
    const choices = ordered.map((id) => {
      const played = timed.playedPlayerIds.includes(id);
      return `<button class="player-turn ${id === timed.suggestedPlayerId ? "suggested" : "secondary"}" data-action="begin-turn" data-id="${escapeHtml(id)}"><span>${escapeHtml(playerName(state, id))}</span>${id === timed.suggestedPlayerId ? "<small>Sugerido</small>" : played ? "<small>Já jogou neste ciclo</small>" : ""}</button>`;
    }).join("");
    return page(GAME_LABELS[game], `Ciclo ${timed.cycleNumber} · próximo Turno`, `${summary}<div class="player-turn-grid">${choices}</div><button class="danger" data-action="end-match">Encerrar partida</button>`, '<a class="button secondary" href="#home">← Início</a>');
  }
  if (timed.phase === "cycle-complete") {
    return page("Ciclo concluído!", GAME_LABELS[game], `${summary}<p class="lede">Todos os Jogadores receberam um Turno neste Ciclo.</p><div class="actions"><button data-action="new-cycle">Iniciar novo ciclo</button><button class="secondary" data-action="complete-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }
  if (timed.phase === "deck-exhausted") {
    return page("O baralho acabou", GAME_LABELS[game], '<p class="lede">Todos os Desafios ativos já apareceram. Embaralhe novamente para continuar.</p><button data-action="reshuffle">Embaralhar novamente</button>', '<a class="button secondary" href="#home">← Início</a>');
  }
  if (timed.phase === "countdown") {
    return page(playerName(state, timed.currentTurn.playerId), `Ciclo ${timed.cycleNumber} · prepare o Turno`, `${timerMarkup(state)}<div class="actions game-controls"><button class="secondary" data-action="pause-timed">Pausar</button><button class="danger" data-action="end-turn">Encerrar Turno</button><button class="danger" data-action="end-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }

  if (timed.phase === "challenge-result") {
    const result = turnResults(active, timed.currentTurn.id).at(-1)?.result || timed.lastResult;
    return page(resultLabel(result), "Resultado do Desafio", `<div class="result-reveal ${result}"><span>${result === "correct" ? "✓" : result === "ignored" ? "—" : "✕"}</span><strong>${resultLabel(result)}</strong></div>${correctionMarkup(game)}<div class="actions"><button data-action="continue-mimic">Próximo Desafio</button><button class="danger" data-action="end-turn">Encerrar Turno</button><button class="danger" data-action="end-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }
  if (timed.phase === "turn-summary") {
    return page("Turno concluído", GAME_LABELS[game], `${currentTurnSummary(state, active)}${correctionMarkup(game)}<div class="actions"><button data-action="complete-turn">Escolher próximo Jogador</button><button class="danger" data-action="end-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
  }

  const correction = active.events.some((event) => event.type === "challenge-finished" && event.turnId === timed.currentTurn.id)
    ? correctionMarkup(game) : "";
  const challenge = `<div class="challenge-card"><p>Desafio</p><strong>${escapeHtml(timed.currentChallenge.content)}</strong></div>`;
  const actions = game === "mimica"
    ? '<div class="result-actions"><button class="correct" data-action="challenge-result" data-result="correct">✓ Acertaram</button><button class="missed" data-action="challenge-result" data-result="missed">✕ Não acertaram</button></div>'
    : '<div class="headband-zones"><button class="correct" data-action="challenge-result" data-result="correct"><span>✓</span> Acertou</button><button class="skipped" data-action="challenge-result" data-result="skipped"><span>↷</span> Pulou</button></div>';
  return page(playerName(state, timed.currentTurn.playerId), `Ciclo ${timed.cycleNumber}`, `${timerMarkup(state)}${challenge}${actions}${correction}<div class="actions game-controls"><button class="secondary" data-action="pause-timed">Pausar</button><button class="danger" data-action="end-turn">Encerrar Turno</button><button class="danger" data-action="end-match">Encerrar partida</button></div>`, '<a class="button secondary" href="#home">← Início</a>');
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
  else if (route.name.startsWith("game-")) app.innerHTML = gameView(state, route.name.slice(5));
  else { location.hash = "#home"; return; }
  document.querySelectorAll(".bottom-nav a").forEach((link) => {
    const section = link.hash.slice(1);
    if (section === route.name) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
  document.title = `${app.querySelector("h1")?.textContent || "Dinâmica Arruda"} · Dinâmica Arruda`;
  document.body.classList.toggle("headband-active", route.name === "game-palavraNaTesta"
    && state.activeMatch?.game === "palavraNaTesta" && state.activeMatch?.timed?.phase === "challenge");
  syncTimedEffects(state);
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
    } else if (event.target.id === "timed-game-form") {
      const playerIds = [...event.target.querySelectorAll('[name="playerIds"]:checked')].map((input) => input.value);
      store.update((state) => beginTimedMatch(state, { game: event.target.dataset.game, playerIds }));
      render(); playSound("start", store.load());
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
    } else if (action === "begin-turn") {
      store.update((state) => beginTurn(state, id, { nowMs: Date.now() })); render();
    } else if (action === "challenge-result") {
      store.update((state) => recordChallengeResult(state, button.dataset.result, { nowMs: Date.now() }));
      playSound(button.dataset.result === "correct" ? "correct" : "missed", store.load()); render();
    } else if (action === "correct-result") {
      store.update((state) => correctLatestResult(state, button.dataset.result)); showToast("Resultado corrigido."); render();
    } else if (action === "pause-timed") {
      store.update((state) => interruptTimedMatch(state, { nowMs: Date.now(), reason: "manual" })); render();
    } else if (action === "resume-timed") {
      store.update((state) => resumeTimedMatch(state, { nowMs: Date.now(), reason: "manual" })); render();
    } else if (action === "end-turn" && confirm("Encerrar este Turno? O Desafio visível será registrado como ignorado.")) {
      store.update((state) => endTurnEarly(state, { nowMs: Date.now() })); render();
    } else if (action === "end-match" && confirm("Encerrar esta Partida? Os resultados já registrados serão preservados.")) {
      store.update((state) => endMatchEarly(state, { nowMs: Date.now() })); location.hash = "#history"; playSound("end", store.load());
    } else if (action === "new-cycle") {
      store.update((state) => startNewCycle(state)); render();
    } else if (action === "complete-match") {
      store.update((state) => completeTimedMatch(state)); location.hash = "#history"; playSound("end", store.load());
    } else if (action === "reshuffle") {
      store.update((state) => reshuffleTimedDeck(state, { nowMs: Date.now() })); render();
    } else if (action === "continue-mimic") {
      store.update((state) => continueMimic(state, { nowMs: Date.now() })); render();
    } else if (action === "complete-turn") {
      store.update((state) => completeTurnSummary(state)); render();
    }
  });
});

function playSound(kind, state) {
  if (!state.settings.soundEffects) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = ({ start: 660, correct: 880, missed: 240, tick: 520, end: 180 })[kind] || 440;
  gain.gain.setValueAtTime(.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .11);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .12);
  oscillator.addEventListener("ended", () => context.close());
}

async function syncTimedEffects(state) {
  const timed = state.activeMatch?.timed;
  const view = timed?.clock ? clockView(state, Date.now()) : null;
  const shouldLock = document.visibilityState === "visible" && view?.status === "running";
  if (shouldLock && !wakeLock && navigator.wakeLock?.request) {
    try { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } catch { /* API opcional */ }
  } else if (!shouldLock && wakeLock) {
    await wakeLock.release(); wakeLock = null;
  }
  if (!view || view.status !== "running") return;
  const token = `${state.activeMatch.id}:${view.stage}:${view.seconds}:${view.countdownNumber}`;
  if (token === lastSoundToken) return;
  const previousToken = lastSoundToken;
  lastSoundToken = token;
  if (view.stage === "active" && view.seconds <= 3) playSound("tick", state);
  else if (view.stage === "expired") playSound("end", state);
  else if (view.stage === "active" && previousToken.includes(":countdown:")) playSound("start", state);
}

window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
  const state = store.load();
  if (!state.activeMatch?.timed) return;
  safely(() => {
    if (document.hidden) store.update((current) => interruptTimedMatch(current, { nowMs: Date.now(), reason: "background" }));
    else if (state.activeMatch.timed.pauseReason === "background") {
      store.update((current) => resumeTimedMatch(current, { nowMs: Date.now(), reason: "foreground" }));
    }
    render();
  });
});
window.addEventListener("beforeunload", () => {
  const state = store.load();
  if (state.activeMatch?.timed && state.activeMatch.state === "in-progress") {
    store.update((current) => interruptTimedMatch(current, { nowMs: Date.now(), reason: "browser-closed" }));
  }
});
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

const restored = store.load();
if (restored.activeMatch?.timed && restored.activeMatch.state === "in-progress") {
  store.update((state) => interruptTimedMatch(state, {
    nowMs: state.activeMatch.timed.clock?.runningSinceMs ?? Date.now(),
    reason: "browser-restored",
  }));
}

window.setInterval(() => {
  const state = store.load();
  if (!state.activeMatch?.timed?.clock || state.activeMatch.timed.clock.status !== "running") return;
  safely(() => {
    const before = clockView(state, Date.now());
    const next = store.update((current) => advanceClock(current, Date.now()));
    if (before.stage === "active" && !next.activeMatch?.timed?.clock) playSound("end", next);
    render();
  });
}, 200);

render();
