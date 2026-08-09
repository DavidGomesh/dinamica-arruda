# Dinâmica Arruda — Especificação do MVP

## 1. Visão do produto

Dinâmica Arruda é um aplicativo web mobile-first para conduzir brincadeiras presenciais em família ou entre amigos. Ele deve abrir rapidamente, funcionar sem conexão depois do primeiro acesso e exigir o mínimo possível de configuração durante a brincadeira.

O MVP contém:

- Mímica;
- Palavra na Testa;
- Quem é Mais Provável;
- cadastro de Jogadores;
- histórico e estatísticas;
- configurações de tempo, áudio e conteúdo;
- backup e restauração dos dados.

O aplicativo não terá backend, conta ou login. Todos os dados ficam no navegador do aparelho.

## 2. Restrições técnicas

- HTML, CSS e JavaScript modular puros.
- Sem React, outro framework de interface ou etapa obrigatória de build.
- Aplicação estática composta por arquivos que possam ser servidos diretamente por HTTP.
- PWA instalável com `manifest.webmanifest` e `service-worker.js`.
- Funcionamento integral offline depois que os recursos da versão atual forem carregados uma vez.
- Persistência em `localStorage`, com esquema explicitamente versionado e migrações entre versões quando necessário.
- Alvo principal: navegadores atuais no Android e no iPhone/iPad.
- Funcionamento responsivo básico em navegadores desktop atuais.

## 3. Linguagem do domínio

Os termos canônicos estão definidos em `CONTEXT.md`. Em especial:

- Partida é a sessão completa de um jogo.
- Ciclo termina quando todos os Jogadores participantes receberam um Turno.
- Turno é a vez individual de um Jogador.
- Desafio é o item apresentado em Mímica ou Palavra na Testa.
- Votação coleta os Votos de uma única Pergunta.

Não usar “rodada” na interface ou no código quando o conceito correto for Partida, Ciclo, Turno, Desafio ou Votação.

## 4. Navegação principal

A tela inicial deve oferecer acesso direto a:

1. Mímica;
2. Palavra na Testa;
3. Quem é Mais Provável;
4. Jogadores;
5. Histórico e Estatísticas;
6. Conteúdo Personalizado;
7. Configurações;
8. Backup e Transferência.

Quando houver uma Partida interrompida, a tela inicial deve destacar `Continuar partida` e oferecer `Descartar partida`, sempre com confirmação antes de descartar.

## 5. Jogadores

### 5.1 Cadastro

- Permitir no máximo 10 Jogadores ativos.
- Exigir nome, cor e ícone.
- Considerar nomes iguais quando forem equivalentes após remover espaços externos e duplicados, ignorar maiúsculas/minúsculas e ignorar acentos.
- Permitir cores repetidas.
- Oferecer aproximadamente 20 cores predefinidas, evitando um seletor de milhões de cores.
- Calcular automaticamente uma cor de texto com bom contraste sobre a cor escolhida.
- Permitir que a pessoa substitua manualmente a cor de texto calculada.
- Oferecer aproximadamente 20 ícones de seres ou personagens, incluindo obrigatoriamente um guepardo e um ET.
- Não permitir que dois Jogadores ativos usem o mesmo ícone.

### 5.2 Edição e arquivamento

- Permitir alterar posteriormente nome, cor, cor do texto e ícone.
- Usar um identificador interno imutável para relacionar o Jogador ao histórico.
- Jogadores sem histórico podem ser excluídos após confirmação.
- Jogadores com histórico são arquivados, não apagados.
- Jogadores arquivados não aparecem na seleção de novas Partidas, não contam no limite de 10 e liberam o ícone para uso por outro Jogador.
- O histórico anterior continua acessível depois do arquivamento.

## 6. Comportamentos compartilhados dos jogos

### 6.1 Participantes e turnos

- Selecionar os Jogadores participantes ao iniciar uma Partida.
- O app deve sugerir automaticamente o próximo Jogador entre aqueles que ainda não receberam um Turno no Ciclo atual.
- Também deve ser possível pular a sugestão ou escolher manualmente qualquer participante.
- Na seleção manual, destacar primeiro quem ainda não jogou e marcar os demais com `Já jogou neste ciclo`.
- Quando todos tiverem jogado, informar que o Ciclo terminou e oferecer `Iniciar novo ciclo` ou `Encerrar partida`.
- Não exigir previamente uma quantidade de Ciclos.
- Permitir encerrar um Turno ou uma Partida a qualquer momento, mediante confirmação.
- Ao encerrar durante um Desafio visível, registrá-lo como `ignored`; Desafios ainda não exibidos não geram registros.
- Preservar todos os resultados já registrados quando um Turno ou uma Partida for encerrado.

### 6.2 Temporizadores

- Antes de cada período cronometrado, exibir `3`, `2`, `1` e um sinal curto; só então revelar o conteúdo e iniciar o tempo.
- Exibir o tempo restante com grande legibilidade.
- Iniciar a tensão visual nos últimos 25% da duração configurada, limitada aos últimos 10 segundos.
- Aumentar progressivamente cor, pulsação e intensidade visual sem mostrar texto explicativo.
- Nos três segundos finais, usar pulsação forte e sinais sonoros curtos quando os efeitos estiverem ligados.
- Pausar o temporizador quando o documento deixar de estar visível; nunca consumir tempo enquanto o app estiver em segundo plano.
- Solicitar Wake Lock durante períodos cronometrados quando a API estiver disponível e continuar normalmente quando não estiver.

### 6.3 Áudio e feedback

- Usar feedback curto e distinto para acerto, erro/pulo, início e fim do tempo.
- Não usar áudios longos ou irritantes.
- Oferecer uma configuração global `Efeitos sonoros: ligado/desligado`, persistida localmente.
- Toda informação transmitida por som também deve existir visualmente.

### 6.4 Correção e continuidade

- Salvar o estado depois de cada ação relevante.
- Permitir desfazer ou corrigir o resultado mais recente enquanto o Turno atual ainda estiver aberto.
- Ao fechar ou recarregar o navegador, preservar a Partida e o ponto exato de continuidade, com o tempo pausado.

### 6.5 Datas, horas e cronologia

- Registrar data e hora de cada acontecimento relevante, e não apenas da Partida como um todo.
- Registrar pelo menos:
  - criação, início, interrupção, retomada e encerramento da Partida;
  - início e encerramento de cada Ciclo e Turno;
  - apresentação e conclusão de cada Desafio;
  - apresentação de cada Pergunta;
  - início, interrupção, retomada e conclusão de cada Votação;
  - realização de cada Voto;
  - correções, encerramentos antecipados e exclusões que permaneçam representados no histórico.
- Cada Partida deve possuir explicitamente `startedAt` e `endedAt`; `endedAt` permanece vazio enquanto ela estiver em andamento ou interrompida.
- Cada registro filho deve possuir seu próprio instante de ocorrência, sem inferi-lo apenas pelo horário da Partida.
- Persistir os instantes em formato ISO 8601, usando UTC como referência, e guardar também o fuso horário ou deslocamento local observado no aparelho quando o acontecimento ocorreu.
- Exibir datas e horas no horário local, em português do Brasil, incluindo dia, mês, ano, hora e minuto; detalhes podem mostrar segundos quando forem úteis.
- Manter a ordem cronológica estável mesmo quando os dados forem exportados, restaurados ou visualizados posteriormente em outro fuso horário.
- Uma correção deve preservar o instante original do resultado e registrar separadamente quando a correção aconteceu.

## 7. Mímica

### 7.1 Configuração

- Duração padrão: 40 segundos por Desafio.
- Atalhos de duração: 30, 40 e 60 segundos, além de valor personalizado razoável.
- Quantidade padrão: 3 Desafios por Turno.
- Permitir escolher 2, 3 ou 5 e informar uma quantidade personalizada positiva.

### 7.2 Fluxo

1. Selecionar os participantes e iniciar a Partida.
2. O app sugere o próximo Jogador ou aceita escolha manual.
3. Antes de cada Desafio, executar a contagem `3, 2, 1`.
4. Revelar o Desafio e iniciar seu temporizador próprio.
5. `Acertaram` registra `correct` e encerra imediatamente o Desafio.
6. `Não acertaram` registra `missed` e encerra imediatamente o Desafio.
7. Se o tempo acabar, registrar automaticamente `missed`, retirar a ação de acerto e mostrar o resultado.
8. Avançar até cumprir a quantidade configurada, salvo encerramento antecipado do Turno.
9. Mostrar o resumo do Turno e escolher o próximo Jogador ou encerrar a Partida.

### 7.3 Conteúdo e resultados

- Misturar objetos, animais, frutas, ações simples, personagens e pessoas universalmente famosas.
- Evitar referências obscuras ou dependentes de conhecimento especializado.
- Registrar por Desafio: conteúdo, Jogador, resultado, instante e duração utilizada.
- Resultados possíveis: `correct`, `missed` e `ignored`.

## 8. Palavra na Testa

### 8.1 Configuração

- Duração padrão: 90 segundos por Turno.
- Atalhos de duração: 60, 90 e 120 segundos, além de valor personalizado razoável.

### 8.2 Fluxo

1. Selecionar os participantes e definir o próximo Jogador.
2. Executar uma única contagem `3, 2, 1` antes do Turno.
3. Exibir sucessivos Desafios até o tempo acabar.
4. Toda a metade esquerda da tela registra `correct`.
5. Toda a metade direita registra `skipped`.
6. Dar feedback visual e sonoro imediato e mostrar o próximo Desafio sem nova contagem regressiva.
7. Quando o tempo acabar, classificar o Desafio visível como:
   - `ignored`, se apareceu com quatro segundos ou menos restantes;
   - `missed`, se permaneceu mais de quatro segundos disponível sem receber ação.
8. Mostrar o resumo e escolher o próximo Jogador ou encerrar a Partida.

### 8.3 Uso físico e resultados

- Funcionar em retrato e paisagem.
- Manter as zonas esquerda/direita grandes, inequívocas e resistentes a toques acidentais.
- Resultados persistidos: `correct`, `skipped`, `missed` e `ignored`.
- `skipped` e `missed` contam como não acertados nas estatísticas agregadas, mas permanecem distintos no histórico.

## 9. Quem é Mais Provável

### 9.1 Estrutura

- Selecionar todos os participantes antes de iniciar.
- Não usar temporizador.
- Não impor quantidade mínima ou máxima de Perguntas.
- Depois do resultado de cada Pergunta, mostrar quantas Perguntas já foram concluídas e oferecer `Próxima pergunta` ou `Encerrar partida`.

### 9.2 Votação secreta no mesmo aparelho

1. Mostrar a Pergunta para o grupo.
2. Para cada participante, mostrar uma tela neutra com seu nome e `Começar meu voto`.
3. Depois do toque, permitir escolher um ou mais participantes, inclusive a própria pessoa.
4. Exigir pelo menos um Voto por participante, sem limitar a quantidade; a pessoa pode votar em todos os Jogadores da Partida.
5. Confirmar os Votos em conjunto e voltar a uma tela neutra antes de passar o aparelho.
6. Não exibir placar parcial.
7. Após o último Voto, mostrar somente `Votação concluída` e o botão `Exibir resultado`.
8. Ao tocar, mostrar os totais, o vencedor ou todos os empatados.
9. Manter `Exibir votos individuais` separado e oculto por padrão.
10. Antes de revelar quem votou em quem, pedir confirmação explícita.

### 9.3 Interrupção

- Permitir encerrar ou sair durante uma Votação mediante confirmação.
- Salvar os Votos já feitos e quais participantes ainda precisam votar.
- Na tela inicial, permitir continuar exatamente daquele ponto ou excluir a Votação interrompida.
- Uma Votação excluída não entra nas estatísticas; Perguntas concluídas anteriormente na mesma Partida permanecem salvas.

## 10. Sorteio e conteúdo

### 10.1 Baralhos sem repetição

- Não repetir um item enquanto ainda houver itens não usados no respectivo baralho.
- Manter a ordem embaralhada entre Turnos e Ciclos, não apenas dentro de um Turno.
- Quando todos os itens ativos tiverem sido usados, informar que o baralho acabou e permitir embaralhá-lo novamente.
- Conteúdo embutido e personalizado ativo participa do mesmo baralho do jogo correspondente.

### 10.2 Conteúdo inicial

- Pelo menos 150 Desafios variados para Mímica.
- Pelo menos 200 Desafios variados para Palavra na Testa.
- Pelo menos 100 Perguntas para Quem é Mais Provável.
- Linguagem brasileira, familiar, leve e bem-humorada.
- Evitar conteúdo sexual, humilhante, discriminatório, excessivamente íntimo ou que incentive conflito real.
- A lista inicial será genérica; personalização específica do grupo fica para edição posterior pelo usuário.

### 10.3 Conteúdo personalizado

- Permitir criar, editar, ativar, desativar e excluir itens personalizados.
- Associar cada item a exatamente um jogo.
- Validar texto vazio e duplicatas equivalentes dentro do mesmo jogo.
- Itens embutidos podem ser ativados ou desativados, mas não editados nem excluídos.

## 11. Histórico e estatísticas

### 11.1 Por Partida

- Exibir data e hora de início, data e hora de término, jogo, participantes, duração, Turnos/Perguntas e estado final.
- Permitir abrir todos os resultados individuais.
- Na visão detalhada, apresentar uma linha do tempo cronológica com os horários de Turnos, Desafios, Perguntas, Votações, Votos, interrupções, retomadas e correções.
- Permitir agrupar e consultar o histórico por dia para responder quais jogos e Partidas aconteceram em uma data específica.
- Permitir excluir uma Partida completa após confirmação.
- Recalcular estatísticas após exclusão ou correção.

### 11.2 Por Jogador

- Mímica: total de Desafios, acertos, erros, ignorados e percentual de acerto.
- Palavra na Testa: acertos, pulos, erros, ignorados e percentual de acerto.
- Quem é Mais Provável: total de Votos recebidos e detalhamento por Pergunta.
- Exibir o histórico mesmo para Jogadores arquivados.

### 11.3 Privacidade dos votos

- Totais agregados podem aparecer normalmente no histórico.
- A relação entre votante e escolhido permanece oculta por padrão também no histórico.
- Exigir confirmação a cada ação de revelar Votos individuais.

## 12. Backup, restauração e exclusão

- Exportar todo o estado em texto copiável e em arquivo JSON.
- Incluir versão do esquema, instante da exportação, Jogadores, conteúdo personalizado, configurações, Partidas concluídas e Partida interrompida.
- Preservar no backup todos os instantes, fusos/deslocamentos e metadados de correção usados na cronologia.
- Nome sugerido: `backup-dinamica-arruda-AAAA-MM-DD.json`.
- Importar de texto colado ou arquivo selecionado.
- Validar estrutura e versão antes de alterar dados locais.
- Mostrar uma prévia com quantidades de Jogadores, Partidas e resultados.
- Restaurar somente após confirmação e substituir o estado local por completo.
- Se possível, manter em memória o estado anterior até a restauração terminar com sucesso.
- Colocar `Apagar todos os dados` em área secundária e exigir confirmação forte.

## 13. Interface e acessibilidade

- Nome exibido e nome curto da PWA: `Dinâmica Arruda`.
- Estética cartunesca de fichas de papel creme sobre fundos fortes.
- Cores principais distintas para cada jogo.
- Tipografia grande, pesada e legível sob luz solar.
- Botões com áreas de toque amplas e espaçamento adequado.
- Nenhuma textura ou animação pode reduzir contraste ou legibilidade.
- Não depender apenas de cor para indicar estado.
- Respeitar `prefers-reduced-motion`, reduzindo rotações, descartes de fichas e pulsações não essenciais.
- Fornecer rótulos acessíveis, foco visível e navegação por teclado nas telas que não dependem do uso físico na testa.

## 14. Critérios globais de aceite

- É possível instalar a PWA e reabri-la offline depois do primeiro carregamento completo.
- Recarregar ou fechar o navegador não perde Jogadores, configurações, conteúdo, histórico ou progresso interrompido.
- O histórico permite identificar com precisão o dia e a hora de início e término de cada Partida e de cada acontecimento registrado dentro dela.
- Nenhum jogo repete conteúdo antes de esgotar seu baralho ativo.
- Todos os fluxos destrutivos exigem confirmação.
- Os três jogos podem ser concluídos integralmente em celular sem depender de teclado físico.
- A interface permanece utilizável em retrato, paisagem, tablet e desktop.
- O backup exportado pode restaurar fielmente o estado em outro navegador compatível.
- Testes automatizados cobrem regras puras de domínio, persistência, temporizadores, baralhos, votação e migração de backup.

## 15. Fora do escopo do MVP

- Backend, login, contas ou sincronização em nuvem.
- Partidas com vários aparelhos conectados.
- Votação remota.
- Publicação em lojas nativas.
- Compartilhamento público de estatísticas.
- Geração automática de conteúdo por IA dentro do app.
- Editor avançado de temas ou seletor livre de milhões de cores.
