# RIPD — Relatório de Impacto à Proteção de Dados Pessoais

**Base:** Art. 38 da LGPD. Obrigatório aqui por haver tratamento de dados de crianças e adolescentes (Art. 14).

**Status:** ⬜ Aberto na Fase 0 · ⬜ Rascunho · ⬜ Revisado pelo jurídico · ⬜ Assinado (bloqueio de go-live — Fase 7)

## 1. Descrição do tratamento

_(preencher: natureza, escopo, contexto e finalidades — referenciar `registro-de-tratamento.md`)_

## 2. Necessidade e proporcionalidade

_(preencher: por que cada dado é necessário à finalidade; alternativas menos invasivas consideradas)_

## 3. Dados de menores (Art. 14)

_(preencher: como o melhor interesse do menor é observado; fluxo de consentimento do responsável legal; minimização reforçada; ausência de perfilamento e de publicidade comportamental)_

## 4. Riscos aos titulares

| Risco | Probabilidade | Impacto | Medida de mitigação |
|---|---|---|---|
| Acesso indevido a dados de aluno | | | Security Rules + App Check + testes de regras |
| Vazamento por credencial de professor comprometida | | | MFA opcional, rate limiting, alertas de acesso anômalo |
| Retenção além do necessário | | | `purgeExpiredData` + política de retenção |
| Reidentificação após "exclusão" | | | Anonimização irreversível de `attempts`/`answers` |
| Transferência internacional sem amparo | | | DPA do Google Cloud + região `southamerica-east1` |

## 5. Medidas de segurança

_(referenciar RNF-002, RNF-008, ADR-005, ADR-011)_

## 6. Conclusão e parecer do encarregado

_(preencher)_
