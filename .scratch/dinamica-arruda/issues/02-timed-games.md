# Mimic and Headband timed games

Status: ready-for-agent
Blocked by: 01

## Objetivo

Implementar Mímica e Palavra na Testa sobre a fundação persistente e responsiva definida na [especificação](../spec.md).

## Escopo

- Seleção de participantes, sugestão automática e escolha manual do próximo Jogador.
- Ciclos sem quantidade previamente fixada.
- Contagem regressiva, temporizadores pausáveis, Wake Lock e tensão audiovisual proporcional.
- Configuração de duração e quantidade de Desafios da Mímica.
- Fluxo, resultados, correção e resumo dos Turnos de Mímica.
- Fluxo por zonas de toque, orientação responsiva e resultados de Palavra na Testa.
- Encerramento antecipado de Turno ou Partida sem perda de resultados.
- Continuidade depois de recarregar ou fechar o navegador.
- Registro dos horários de início e término de Partidas, Ciclos, Turnos e Desafios, além de interrupções, retomadas e correções.
- Testes determinísticos com relógio controlado.

## Critérios de aceite

- Cumprir as seções 6, 7 e 8 da especificação.
- Não consumir tempo com a página em segundo plano.
- Classificar corretamente `correct`, `missed`, `skipped` e `ignored`, inclusive no limite de quatro segundos.
- Não repetir Desafios antes de esgotar o baralho ativo.
- A cronologia dos jogos cronometrados permanecer correta depois de pausar, retomar, exportar e restaurar.

## Dependências

- `01-foundation-pwa-and-data.md`
