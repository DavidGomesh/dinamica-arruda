# Notificações transitórias desaparecem automaticamente

Status: ready-for-agent
Blocked by: 01

## Objetivo

Garantir que confirmações como `Jogador salvo.` e `Partida excluída.` apareçam por tempo suficiente para leitura e depois desapareçam completamente.

## Critérios de aceite

- A notificação fica visível por aproximadamente 2,6 segundos.
- Depois desse período, ela não permanece visível nem ocupa uma posição aparente sobre a interface móvel.
- Uma nova notificação reinicia o período completo e não é ocultada pelo temporizador de uma notificação anterior.
- O comportamento continua compatível com `prefers-reduced-motion`.

## Comments

- Corrigido em 2026-08-08. O estado oculto anterior usava `translateY(150%)`, deslocamento relativo à própria altura, mas mantinha a notificação dentro da viewport porque `bottom: 5.5rem` reservava espaço para a navegação móvel.
- O estado oculto agora combina `opacity: 0` e `visibility: hidden`; a transição mantém apenas um deslocamento curto. `showToast` também cancela o timeout anterior antes de iniciar outro.
- O cache da PWA foi atualizado para `dinamica-arruda-v8` para distribuir a correção em instalações existentes.
