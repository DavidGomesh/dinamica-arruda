import test from "node:test";
import assert from "node:assert/strict";

import {
  addPlayer,
  archiveOrDeletePlayer,
  updatePlayer,
} from "../js/domain/players.js";
import { normalizeEquivalentText } from "../js/domain/text.js";

const baseState = () => ({ players: [], matches: [], activeMatch: null });
const ids = ["p1", "p2", "p3"];
const createId = () => ids.shift();

test("nome equivalente ignora espaços duplicados, caixa e acentos", () => {
  assert.equal(normalizeEquivalentText("  Jo\u00e3o   D'\u00c1vila "), "joao d'avila");
});

test("Jogador exige nome, cor e ícone e recebe identidade imutável", () => {
  const state = addPlayer(baseState(), {
    name: " Bia ", color: "#f59e0b", icon: "guepardo",
  }, { createId });

  assert.deepEqual(state.players[0], {
    id: "p1",
    name: "Bia",
    color: "#f59e0b",
    textColor: "#111111",
    textColorMode: "auto",
    icon: "guepardo",
    archived: false,
  });
  assert.throws(
    () => updatePlayer(state, "p1", { id: "fraude", name: "Bia 2" }),
    /identificador/i,
  );
});

test("Jogadores ativos não podem repetir nome equivalente nem ícone", () => {
  let state = addPlayer(baseState(), {
    name: "João", color: "#fff3c4", icon: "et",
  }, { createId });

  assert.throws(
    () => addPlayer(state, { name: "  JOAO ", color: "#fff", icon: "leao" }, { createId }),
    /nome/i,
  );
  assert.throws(
    () => addPlayer(state, { name: "Lia", color: "#fff", icon: "et" }, { createId }),
    /ícone/i,
  );
});

test("limite considera apenas os dez Jogadores ativos", () => {
  const state = baseState();
  state.players = Array.from({ length: 10 }, (_, index) => ({
    id: `p${index}`,
    name: `Pessoa ${index}`,
    color: "#fff",
    textColor: "#111111",
    textColorMode: "auto",
    icon: `icone-${index}`,
    archived: false,
  }));

  assert.throws(
    () => addPlayer(state, { name: "Extra", color: "#fff", icon: "extra" }, { createId }),
    /10 Jogadores/i,
  );
});

test("reativar Jogador também respeita o limite de dez ativos", () => {
  const state = baseState();
  state.players = Array.from({ length: 11 }, (_, index) => ({
    id: `p${index}`,
    name: `Pessoa ${index}`,
    color: "#fff",
    textColor: "#111111",
    textColorMode: "auto",
    icon: `icone-${index}`,
    archived: index === 10,
  }));
  assert.throws(() => updatePlayer(state, "p10", { archived: false }), /10 Jogadores/i);
});

test("Jogador com histórico é arquivado e sem histórico é excluído", () => {
  const state = baseState();
  state.players = [
    { id: "p1", name: "Ana", icon: "et", archived: false },
    { id: "p2", name: "Beto", icon: "guepardo", archived: false },
  ];
  state.matches = [{ id: "m1", playerIds: ["p1"] }];

  const archived = archiveOrDeletePlayer(state, "p1");
  const deleted = archiveOrDeletePlayer(archived, "p2");

  assert.equal(deleted.players.length, 1);
  assert.equal(deleted.players[0].archived, true);
});
