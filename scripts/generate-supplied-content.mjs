import { readFileSync, writeFileSync } from "node:fs";

const sources = {
  mimica: "mimica.txt",
  palavraNaTesta: "palavra-na-testa.txt",
  quemMaisProvavel: "quem-é-mais-provável.txt",
};

function lines(filename) {
  return readFileSync(new URL(`../ideia/palavras/${filename}`, import.meta.url), "utf8")
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const lists = Object.fromEntries(Object.entries(sources).map(([game, filename]) => [game, lines(filename)]));
const output = `// Gerado por npm run sync-content. Preserve a ordem e as repetições dos arquivos-fonte.
function items(game, values) {
  return values.map((text, index) => ({ id: \`${"${game}"}-catalogo-20260809-${"${index + 1}"}\`, game, text }));
}

const mimeChallenges = ${JSON.stringify(lists.mimica, null, 2)};

const foreheadChallenges = ${JSON.stringify(lists.palavraNaTesta, null, 2)};

const votingQuestions = ${JSON.stringify(lists.quemMaisProvavel, null, 2)};

export const BUILT_IN_CONTENT = Object.freeze({
  mimica: items("mimica", mimeChallenges),
  palavraNaTesta: items("palavraNaTesta", foreheadChallenges),
  quemMaisProvavel: items("quemMaisProvavel", votingQuestions),
});
`;

writeFileSync(new URL("../js/data/content.js", import.meta.url), output, "utf8");
