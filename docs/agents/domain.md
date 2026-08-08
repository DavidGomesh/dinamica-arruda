# Domain docs

Estas regras determinam como as skills de engenharia devem consultar a documentação de domínio ao explorar o código.

## Antes de explorar

Leia, quando existirem:

- `CONTEXT.md` na raiz do repositório;
- `CONTEXT-MAP.md` na raiz, caso exista, e cada `CONTEXT.md` indicado por ele que seja relevante para o trabalho;
- os ADRs em `docs/adr/` relacionados à área que será modificada;
- em repositórios com múltiplos contextos, os ADRs específicos em `src/<context>/docs/adr/`.

Se algum desses arquivos não existir, prossiga silenciosamente. Não sinalize sua ausência nem sugira sua criação antecipada. A skill `/domain-modeling`, acessada por `/grill-with-docs` e `/improve-codebase-architecture`, cria esses documentos conforme termos e decisões forem efetivamente definidos.

## Estrutura dos arquivos

Este repositório usa o layout `single-context`:

    /
    ├── CONTEXT.md
    ├── docs/adr/
    │   ├── 0001-event-sourced-orders.md
    │   └── 0002-postgres-for-write-model.md
    └── src/

Um repositório `multi-context` seria identificado por um `CONTEXT-MAP.md` na raiz, apontando para arquivos `CONTEXT.md` específicos de cada contexto.

## Use o vocabulário do glossário

Quando uma saída nomear um conceito do domínio — no título de uma issue, proposta de refatoração, hipótese ou nome de teste — use o termo definido em `CONTEXT.md`. Não introduza sinônimos que o glossário rejeite explicitamente.

Se um conceito necessário ainda não estiver no glossário, reavalie se a linguagem pertence realmente ao projeto. Caso represente uma lacuna legítima, registre-a para `/domain-modeling`.

## Sinalize conflitos com ADRs

Se uma proposta contrariar um ADR existente, indique o conflito explicitamente em vez de substituir silenciosamente a decisão:

> Contradiz ADR-0007 (`event-sourced orders`), mas pode valer a pena reabrir a decisão porque…
