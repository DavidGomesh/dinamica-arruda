# Issue tracker: Local Markdown

As issues e especificações deste repositório são armazenadas como arquivos Markdown em `.scratch/`.

## Convenções

- Use um diretório para cada feature: `.scratch/<feature-slug>/`.
- Armazene a especificação em `.scratch/<feature-slug>/spec.md`.
- Crie um arquivo por ticket de implementação em `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numerado a partir de `01`. Nunca use um único arquivo combinado para vários tickets.
- Registre o estado da triagem em uma linha `Status:` próxima ao início de cada arquivo de issue. Consulte `triage-labels.md` para conhecer os valores.
- Acrescente comentários e o histórico da conversa ao final do arquivo, sob o título `## Comments`.

## Quando uma skill disser “publish to the issue tracker”

Crie um arquivo em `.scratch/<feature-slug>/`, criando o diretório quando necessário.

## Quando uma skill disser “fetch the relevant ticket”

Leia o arquivo no caminho indicado. Normalmente, o usuário fornecerá diretamente o caminho ou o número da issue.

## Operações de wayfinding

Estas operações são usadas por `/wayfinder`. O `map` possui um arquivo filho para cada ticket.

- **Map:** `.scratch/<effort>/map.md`, contendo `Notes`, `Decisions-so-far` e `Fog`.
- **Child ticket:** `.scratch/<effort>/issues/NN-<slug>.md`, numerado a partir de `01`, com a pergunta no corpo. Uma linha `Type:` registra o tipo (`research`, `prototype`, `grilling` ou `task`); uma linha `Status:` registra `claimed` ou `resolved`.
- **Blocking:** use uma linha `Blocked by: NN, NN` próxima ao início. Um ticket fica desbloqueado quando todos os arquivos listados estiverem com `Status: resolved`.
- **Frontier:** examine `.scratch/<effort>/issues/` em busca de arquivos abertos, desbloqueados e ainda não reivindicados. O menor número tem prioridade.
- **Claim:** altere para `Status: claimed` e salve antes de iniciar qualquer trabalho.
- **Resolve:** acrescente a resposta sob o título `## Answer`, altere para `Status: resolved` e adicione em `Decisions-so-far`, no arquivo `map.md`, um ponteiro de contexto contendo resumo e link.
