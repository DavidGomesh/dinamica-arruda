import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCustomPlayerIcon,
  playerIconGlyph,
} from "../js/data/player-appearance.js";

test("ícone personalizado aceita um único emoji, inclusive sequências combinadas", () => {
  assert.equal(normalizeCustomPlayerIcon(" 🪩 "), "🪩");
  assert.equal(normalizeCustomPlayerIcon("🧑‍🚀"), "astronauta");
  assert.throws(() => normalizeCustomPlayerIcon("AB"), /um emoji/i);
  assert.throws(() => normalizeCustomPlayerIcon("🐙🦁"), /um emoji/i);
});

test("variante Unicode de emoji predefinido mantém sua exclusividade visual", () => {
  assert.equal(normalizeCustomPlayerIcon("🕵"), "detetive");
  assert.equal(playerIconGlyph("detetive"), "🕵️");
});

test("ícone personalizado é devolvido como glifo para todas as fichas", () => {
  assert.equal(playerIconGlyph("🪩"), "🪩");
});
