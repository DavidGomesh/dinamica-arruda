import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BUILT_IN_CONTENT } from "../js/data/content.js";
import { addCustomContent, toggleBuiltInContent } from "../js/domain/content.js";
import { createDefaultState } from "../js/storage/store.js";
import { createDeck, drawNext } from "../js/domain/decks.js";

function suppliedContent(filename) {
  return readFileSync(new URL(`../ideia/palavras/${filename}`, import.meta.url), "utf8")
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("conteúdo embutido reproduz exatamente as listas fornecidas", () => {
  assert.deepEqual(BUILT_IN_CONTENT.mimica.map((item) => item.text), suppliedContent("mimica.txt"));
  assert.deepEqual(BUILT_IN_CONTENT.palavraNaTesta.map((item) => item.text), suppliedContent("palavra-na-testa.txt"));
  assert.deepEqual(BUILT_IN_CONTENT.quemMaisProvavel.map((item) => item.text), suppliedContent("quem-é-mais-provável.txt"));
});

test("conteúdo personalizado rejeita vazio e duplicata equivalente no mesmo jogo", () => {
  let state = addCustomContent(createDefaultState(), {
    game: "mimica", text: "Dançar  forró",
  }, { createId: () => "c1" });
  assert.throws(() => addCustomContent(state, {
    game: "mimica", text: "  DANCAR FORRO ",
  }), /duplicado/i);
  assert.throws(() => addCustomContent(state, { game: "mimica", text: "  " }), /vazio/i);
});

test("baralho usa itens ativos sem repetição e só reinicia explicitamente", () => {
  let state = createDefaultState();
  state = toggleBuiltInContent(state, "mimica", BUILT_IN_CONTENT.mimica[1].id, false);
  state = createDeck(state, "mimica", { random: () => 0 });
  const expected = BUILT_IN_CONTENT.mimica.length - 1;
  const seen = new Set();
  for (let index = 0; index < expected; index += 1) {
    const result = drawNext(state, "mimica");
    state = result.state;
    seen.add(result.item.id);
  }
  assert.equal(seen.size, expected);
  assert.equal(drawNext(state, "mimica").exhausted, true);
});

test("baralho ignora com segurança item desativado depois da montagem", () => {
  let state = createDefaultState();
  state = createDeck(state, "mimica", { random: () => 0 });
  const staleId = state.decks.mimica.remainingIds[0];
  state = toggleBuiltInContent(state, "mimica", staleId, false);
  const result = drawNext(state, "mimica");
  assert.ok(result.item);
  assert.notEqual(result.item.id, staleId);
});
