# Cor e emoji personalizados para Jogadores

Status: ready-for-agent
Blocked by: 01

## Problema

O cadastro de Jogadores limita a aparência às 20 cores e aos 20 ícones predefinidos.

## Critérios de aceite

- Manter as 20 cores e os 20 ícones atuais.
- Acrescentar uma vigésima primeira opção para escolher qualquer cor hexadecimal pelo seletor nativo.
- Acrescentar uma vigésima primeira opção para digitar ou colar um único emoji.
- Exibir o emoji personalizado em todos os lugares onde a ficha do Jogador aparece.
- Permitir editar posteriormente a cor e o emoji personalizados.
- Preservar a exclusividade visual dos ícones predefinidos quando o mesmo emoji for informado pela opção personalizada.

## Comments

- Este pedido substitui, para a escolha livre, a restrição original que evitava um seletor com milhões de cores.
- Implementação concluída em 2026-08-09 com seletor nativo de cor, entrada limitada a um único emoji, edição dos valores personalizados e renderização segura em todas as fichas.
- A auditoria no navegador cobriu cadastro, contraste automático, persistência na edição, rejeição de texto, layout móvel em 390 × 844 e ausência de erros no console. O cache da PWA foi atualizado para `dinamica-arruda-v18`.
