# Secret voting game

Status: ready-for-agent
Blocked by: 01

## Objetivo

Implementar Quem é Mais Provável com votação secreta no mesmo aparelho, conforme a [especificação](../spec.md).

## Escopo

- Seleção de participantes e sorteio de Perguntas sem repetição.
- Passagem segura do aparelho e telas neutras entre votantes.
- Um Voto obrigatório por participante, inclusive em si mesmo.
- Persistência incremental e retomada de Votação interrompida.
- Registro temporal de Partidas, Perguntas, Votações e cada Voto individual.
- Tela intermediária `Votação concluída` antes de qualquer resultado.
- Resultado agregado, empates e revelação confirmada dos Votos individuais.
- Continuidade ilimitada de Perguntas, com escolha entre próxima Pergunta e encerramento após cada resultado.
- Testes de privacidade, interrupção, retomada e agregação.

## Critérios de aceite

- Cumprir integralmente a seção 9 da especificação.
- Nunca mostrar placar parcial durante a Votação.
- Não revelar automaticamente quem votou em quem.
- Excluir uma Votação interrompida sem apagar Perguntas já concluídas na mesma Partida.
- Preservar a cronologia correta quando uma Votação for interrompida e retomada posteriormente.

## Dependências

- `01-foundation-pwa-and-data.md`
