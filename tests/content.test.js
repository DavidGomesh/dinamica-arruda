import test from "node:test";
import assert from "node:assert/strict";

import { BUILT_IN_CONTENT } from "../js/data/content.js";
import { addCustomContent, toggleBuiltInContent } from "../js/domain/content.js";
import { createDefaultState } from "../js/storage/store.js";
import { createDeck, drawNext } from "../js/domain/decks.js";

test("conteúdo inicial atende os mínimos dos três jogos", () => {
  assert.ok(BUILT_IN_CONTENT.mimica.length >= 150);
  assert.ok(BUILT_IN_CONTENT.palavraNaTesta.length >= 200);
  assert.ok(BUILT_IN_CONTENT.quemMaisProvavel.length >= 100);
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
  state = toggleBuiltInContent(state, "mimica", "mimica-2", false);
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
