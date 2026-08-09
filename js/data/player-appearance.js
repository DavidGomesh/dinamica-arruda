export const PLAYER_COLORS = [
  "#facc15", "#fb923c", "#fb7185", "#e879f9", "#c084fc", "#8b5cf6", "#6366f1",
  "#60a5fa", "#38bdf8", "#22d3ee", "#2dd4bf", "#34d399", "#4ade80", "#a3e635",
  "#bef264", "#fde047", "#fda4af", "#d8b4fe", "#93c5fd", "#99f6e4",
];

export const PLAYER_ICONS = [
  ["guepardo", "🐆"], ["et", "👽"], ["leao", "🦁"], ["raposa", "🦊"], ["panda", "🐼"],
  ["sapo", "🐸"], ["polvo", "🐙"], ["coruja", "🦉"], ["pinguim", "🐧"], ["unicornio", "🦄"],
  ["robo", "🤖"], ["fantasma", "👻"], ["mago", "🧙"], ["pirata", "🏴‍☠️"], ["astronauta", "🧑‍🚀"],
  ["detetive", "🕵️"], ["ninja", "🥷"], ["palhaco", "🤡"], ["dragao", "🐉"], ["dinossauro", "🦖"],
];

function emojiComparisonKey(value) {
  return value.normalize("NFC").replace(/[\ufe0e\ufe0f]/g, "");
}

export function playerIconGlyph(id) {
  return PLAYER_ICONS.find(([key]) => key === id)?.[1] || id || "🙂";
}

export function normalizeCustomPlayerIcon(value) {
  const icon = value?.trim();
  const graphemes = icon && globalThis.Intl?.Segmenter
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(icon)]
    : icon ? [icon] : [];
  const looksLikeEmoji = icon && /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u20e3]/u.test(icon);
  if (graphemes.length !== 1 || !looksLikeEmoji) {
    throw new Error("Digite apenas um emoji para o ícone personalizado.");
  }
  const comparisonKey = emojiComparisonKey(icon);
  return PLAYER_ICONS.find(([, emoji]) => emojiComparisonKey(emoji) === comparisonKey)?.[0] || icon;
}
