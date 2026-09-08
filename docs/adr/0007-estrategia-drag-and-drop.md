# ADR-007 — Estratégia de drag-and-drop (mantém ADR-009 do SDD, sem mudança pela migração para Firebase)

## Status

Proposto

## Contexto

Meaning Matching (seção 9.2) e algumas configurações de Fill in the Blanks e Translation (seção 9.1 e 9.3) do SDD dependem de interação drag-and-drop no frontend. Essa decisão é independente da escolha de Firebase — é puramente de frontend.

## Decisão

Usar uma biblioteca de drag-and-drop acessível para React (ex.: `@dnd-kit/core`), que suporta navegação por teclado nativamente — requisito RNF-007 (acessibilidade) e item explícito da seção 21 do SDD ("Testes específicos de UI: drag-and-drop, teclado, acessibilidade").

## Consequências

- Toda configuração de atividade que usa `mode: DRAG_AND_DROP` (seção 9.1, 9.2, 9.3 do SDD) precisa também de um modo alternativo acessível por teclado/clique (ex.: `WORD_BANK` com seleção por clique), não apenas arrastar — já previsto nas configurações do SDD.
- Testes E2E de drag-and-drop precisam simular tanto mouse quanto teclado.

## Alternativas consideradas

- Nenhuma nova alternativa avaliada nesta rodada — decisão herdada do SDD original (ADR-009), apenas formalizada aqui porque o número do ADR mudou.
