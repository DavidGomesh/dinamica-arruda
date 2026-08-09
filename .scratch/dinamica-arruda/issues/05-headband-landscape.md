# Palavra na Testa em paisagem durante o Turno

Status: claimed
Blocked by: 02

## Objetivo

Fazer a fase ativa do Turno de Palavra na Testa privilegiar a orientação paisagem em celulares e tablets, mantendo o Desafio legível, o tempo separado do conteúdo e as zonas de Acerto e Pulo fáceis de tocar enquanto o aparelho está apoiado na testa.

## Decisões de implementação

- Preparar e manter a orientação paisagem desde `timed.phase === "countdown"` até o fim de `timed.phase === "challenge"` em Palavra na Testa. A contagem `3, 2, 1` só começa quando o aparelho já estiver deitado; seleção de Jogadores, pausa, resumo e histórico continuam no layout responsivo normal.
- Ao entrar nessa fase, tentar travar a orientação com `screen.orientation.lock("landscape")` quando a API estiver disponível e o documento estiver em tela cheia ou como PWA instalada. A falha da API é esperada e não pode bloquear o Turno.
- Quando o navegador não permitir o bloqueio, detectar retrato com media query e mostrar uma camada não modal pedindo `Gire o aparelho para jogar`, sem consumir o tempo do Turno. A opção mais segura é interromper o relógio enquanto a orientação estiver inadequada e retomá-lo quando a paisagem voltar, usando as operações existentes de interrupção e retomada.
- Liberar qualquer bloqueio de orientação ao sair da fase ativa, pausar, encerrar o Turno, encerrar a Partida ou navegar para outra tela.
- Construir o layout ativo como uma grade de três faixas: zona de Acerto à esquerda, área central de conteúdo e zona de Pulo à direita. As duas zonas laterais ocupam toda a altura útil e continuam sendo os únicos alvos interativos principais.
- Posicionar o tempo em uma faixa própria acima do Desafio dentro da coluna central. O tempo nunca pode sobrepor, empurrar lateralmente nem reduzir a leitura do Desafio.
- Reservar largura estável para o número do tempo com algarismos tabulares. Nos segundos finais, tensão, cor e pulsação só podem usar `transform`/cor, sem alterar a posição ou a largura do componente.
- Manter Pausar e Encerrar fora das zonas de toque principais, em uma faixa central inferior compacta, respeitando as safe areas do aparelho.
- Não alterar `manifest.webmanifest` para `orientation: landscape`, pois isso forçaria paisagem em toda a PWA, inclusive cadastro, ajustes e histórico.

## Plano de implementação

1. Extrair um controlador pequeno de orientação em `js/app.js`, idempotente, chamado depois de cada `render()` e também na saída da contagem ou da fase ativa.
2. Introduzir no `body` estados separados para `headband-active` e `headband-needs-landscape`, derivados da rota, da fase do Turno e de `matchMedia("(orientation: portrait)")`.
3. Reorganizar apenas o markup da fase `challenge` de Palavra na Testa em um contêiner específico, sem mudar as regras de `recordChallengeResult` ou do relógio.
4. Substituir o posicionamento `fixed` concorrente de `.game-timer`, `.challenge-card` e `.headband-zones` por CSS Grid no modo paisagem; manter um fallback explícito em retrato com a instrução de giro.
5. Conectar mudanças de orientação à pausa/retomada sem duplicar eventos e garantir que uma pausa manual não seja retomada automaticamente.
6. Adicionar testes das decisões puras do controlador (entrada, saída, falha da API e distinção entre pausa manual e pausa por orientação) e uma verificação visual nas larguras/alturas móveis e de tablet.
7. Atualizar a versão do cache do service worker para distribuir os novos arquivos aos aparelhos já instalados.

## Critérios de aceite

- Em celular e tablet, o Turno ativo orienta a pessoa a usar paisagem e tenta travar essa orientação quando o navegador permite.
- O Desafio permanece inteiro e legível em 667×375, 844×390, 1024×768 e 1366×1024, considerando também safe areas.
- O tempo não cobre o Desafio em nenhum dos tamanhos-alvo.
- A transição de `10` para `9` e os três segundos finais não deslocam o tempo para os lados.
- Acerto e Pulo continuam ocupando áreas inequívocas em lados opostos e recebem toques em toda a altura útil.
- Girar para retrato durante o Turno não consome tempo nem registra resultado; voltar à paisagem continua do ponto correto.
- Pausar ou sair não deixa a orientação travada.
- Falta de suporte ou rejeição de `screen.orientation.lock()` não quebra a Partida.
- Desktop continua utilizável e não recebe solicitação de orientação.
- `prefers-reduced-motion` remove a pulsação sem remover a indicação de urgência por cor.

## Comments

- Plano consolidado em 2026-08-08 a partir do relato de uso físico com o aparelho na testa. A implementação atual usa três elementos `fixed` sobrepostos; por isso o tempo cobre o Desafio e sua animação compete com o `translateX(-50%)` usado para centralizá-lo.
