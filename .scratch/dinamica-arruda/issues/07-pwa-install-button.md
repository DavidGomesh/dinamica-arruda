# Botão de instalação da PWA não pode ficar sem ação

Status: ready-for-agent
Blocked by: 01

## Problema

No celular, o botão `Instalar app` aparece, mas o toque não produz nenhuma resposta quando o navegador não emite `beforeinstallprompt`.

## Diagnóstico

A regra global de botões define `display: inline-flex` e sobrepõe o estilo nativo do atributo `hidden`. Com isso, o botão fica visível mesmo sem existir um prompt de instalação armazenado; o handler retorna imediatamente e o usuário não recebe retorno.

## Critérios de aceite

- Em navegadores com `beforeinstallprompt`, o botão abre o prompt nativo.
- Em iPhone/iPad, onde a instalação não pode ser iniciada por JavaScript, o botão explica como usar `Compartilhar` e `Adicionar à Tela de Início`.
- Em navegadores sem prompt nem fluxo orientado, o botão permanece oculto.
- No modo standalone, o botão permanece oculto.
- O atributo `hidden` sempre remove o elemento do layout, independentemente do estilo global de botões.
- O comportamento possui teste automatizado de regressão.

## Comments

- Reproduzido em 2026-08-09 em duas execuções: o botão tinha `hidden`, estava visualmente presente e o clique não abriu diálogo nem alterou a interface.
- Corrigido em 2026-08-09 com um controlador testável para os fluxos de instalação, instruções específicas para iPhone/iPad e uma regra explícita que preserva a semântica de `hidden`.
- O cache da PWA foi atualizado para `dinamica-arruda-v17`. A verificação no navegador ficou verde após a ativação desse service worker, sem erros no console.
- Novo relato em 2026-08-09: a opção de instalação ainda aparecia ao abrir uma PWA já instalada. A cobertura anterior verificava apenas `standalone` no carregamento inicial.
- O controlador agora reconhece todos os modos instalados (`standalone`, `minimal-ui`, `fullscreen` e `window-controls-overlay`), o sinal do iOS e mudanças de modo durante a transferência para a janela da PWA. O cache foi atualizado para `dinamica-arruda-v19`.
