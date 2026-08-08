# History, statistics and release readiness

Status: ready-for-agent
Blocked by: 02, 03

## Objetivo

Integrar os três jogos ao histórico e às estatísticas e concluir a qualidade de lançamento do MVP descrito na [especificação](../spec.md).

## Escopo

- Histórico por Partida e por Jogador, incluindo arquivados.
- Consulta agrupada por dia e linha do tempo detalhada com data e hora de cada acontecimento.
- Estatísticas específicas de cada jogo e recálculo após correção/exclusão.
- Privacidade dos Votos individuais no histórico.
- Curadoria das listas genéricas mínimas: 150 itens de Mímica, 200 de Palavra na Testa e 100 Perguntas.
- Auditoria completa de responsividade, contraste, acessibilidade, movimento reduzido e uso sob sol.
- Testes integrados dos fluxos completos e restauração de backup.
- Verificação da instalação, atualização e execução offline da PWA.
- Correção dos defeitos encontrados na auditoria dentro do escopo do MVP.

## Critérios de aceite

- Cumprir as seções 10.2, 11, 13 e 14 da especificação.
- Todos os critérios globais de aceite passarem.
- O app poder ser usado do início ao fim sem rede, depois do primeiro carregamento.
- O working tree não conter artefatos temporários ou dados pessoais de teste.
- Ser possível identificar quando cada Partida começou e terminou e quando ocorreu cada item de sua linha do tempo.

## Dependências

- `02-timed-games.md`
- `03-secret-voting-game.md`

## Comments

- Implementação concluída em 2026-08-08 com histórico agrupado por dia, detalhe cronológico por Partida, histórico e estatísticas por Jogador (incluindo arquivados), exclusão com recálculo e privacidade confirmada dos Votos individuais.
- As listas iniciais foram verificadas com 160 Desafios de Mímica, 200 de Palavra na Testa e 110 Perguntas, todos únicos após normalização.
- A auditoria no navegador cobriu celular (390×844), desktop (1280×800), ausência de overflow horizontal, foco visível de 4 px, regra de movimento reduzido, restauração com prévia, atualização do cache e reabertura offline após interromper o servidor local. O prompt de instalação ficou disponível e todos os recursos do `APP_SHELL` responderam com HTTP 200 antes do teste offline.
- A suíte completa terminou com 40 testes aprovados. A revisão em dois eixos corrigiu histórico ausente por Jogador, reexibição de Votos sem nova confirmação, transição incorreta em correções sucessivas e pequenos smells de apresentação/projeção.
- A legibilidade sob sol foi auditada por contraste e tipografia em viewport, mas não houve validação física em ambiente externo nesta execução.
