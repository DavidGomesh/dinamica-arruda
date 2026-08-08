# Foundation, PWA and data

Status: ready-for-agent

## Objetivo

Construir a fundação navegável do Dinâmica Arruda, o modelo persistente e as áreas administrativas descritas na [especificação](../spec.md).

## Escopo

- Estrutura estática em HTML, CSS e JavaScript modular, sem framework e sem build obrigatório.
- Design system responsivo com identidade de fichas de papel e requisitos básicos de acessibilidade.
- Manifesto, service worker, cache versionado e experiência PWA offline.
- Store versionada em `localStorage`, migrações e recuperação segura de dados inválidos.
- Modelo temporal compartilhado com instantes ISO 8601, referência UTC, fuso/deslocamento local e metadados de correção.
- Navegação principal e detecção de Partida interrompida.
- Cadastro, edição, arquivamento e validações de Jogadores.
- Configurações globais e específicas dos jogos.
- Baralhos sem repetição e gerenciamento de conteúdo embutido/personalizado.
- Backup e restauração por texto e JSON.
- Testes das regras puras e da persistência introduzidas neste ticket.

## Critérios de aceite

- Cumprir as seções 2, 4, 5, 10, 12 e 13 da especificação.
- Disponibilizar APIs internas claras para os jogos gravarem Partidas, Turnos, Desafios, Perguntas e Votos.
- As APIs de persistência registrarem automaticamente data e hora em toda ação relevante, conforme a seção 6.5.
- Instalação e recarga offline funcionarem em servidor local compatível com PWA.
- Nenhum dado destrutivo ser alterado sem confirmação.

## Dependências

Nenhuma.

## Comments

- Implementação concluída em 2026-08-08 com fundação estática navegável, PWA offline, store versionada, cronologia compartilhada, administração de Jogadores, configurações, conteúdo, baralhos e backup/restauração.
- Testes automatizados cobrem os seams acordados: cronologia, Jogadores, configurações, persistência e recuperação, APIs de Partidas, conteúdo/baralhos e backup.
- A revisão em dois eixos foi aplicada; os achados de aderência sobre validação, migração, cronologia, atalhos, variedade de conteúdo e baralho obsoleto foram corrigidos antes do encerramento.
