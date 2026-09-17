# Política de retenção e expurgo/anonimização por categoria

**Base:** Art. 15/16 da LGPD (retenção limitada à finalidade) e ADR-011 §5. Aplicada por duas peças, cada uma cuidando de uma coisa diferente:

- **`deleteUserData`** (callable, ação do próprio titular — Fase 6, PR 6.1/6.2): anonimização **imediata**, sem período de carência ("exclusão = anonimização", ADR-011 §4). Não espera nenhum prazo — dispara na hora em que o titular pede.
- **`purgeExpiredData`** (Cloud Function agendada, `every 24 hours` — Fase 6, PR 6.3): só cuida de expiração por **tempo absoluto**, para os dados que continuam existindo depois da anonimização (prova de consentimento) ou que nunca dependem de uma conta ser excluída (logs de auditoria).

## Prazos por categoria

| Categoria | Prazo | Quem aplica | Observação |
|---|---|---|---|
| Dados de conta (nome, e-mail — `users/{uid}`) | Enquanto a conta existir | — | Sem expurgo automático de conta ativa; só o próprio titular decide excluir (RF-020) |
| Tentativas e respostas do aluno (`attempts`, `attemptResults`) | Igual à conta | `deleteUserData` | Ao excluir, `studentId` vira token não reversível — não é apagado, é anonimizado (preserva o histórico pedagógico da sala sem identificar o aluno) |
| Resumo agregado (`resultsSummary`) | Indefinido | — | Nunca é tocado, nem na exclusão — já não tem identificador direto (ADR-011 §4) |
| Registro de consentimento (`consents/{uid}/records`) | 5 anos **após a conta ser anonimizada** | `purgeExpiredData` | Enquanto a conta está ativa, o registro nunca expira (é a prova do consentimento vigente); os 5 anos só começam a contar da anonimização (`users/{uid}.updatedAt` no momento do `deleteUserData`) |
| Logs de auditoria (`auditLog`) | 6 meses **desde a gravação** | `purgeExpiredData` | Independe de qualquer conta ser excluída ou não |
| Salas/atividades de um professor excluído (`classes`, `activities`, `assignments`) | Sem expurgo automático | — | **Limitação documentada** (`docs/plano-fase-6.md` §4.2/§10): excluir a conta do professor anonimiza só os identificadores diretos dele; a estrutura pedagógica continua intacta porque ainda serve alunos matriculados. Ação manual (suporte/DPO) fora do escopo desta fase se um dia for necessário apagar isso também |

## Por que 5 anos pro consentimento, não os mesmos 6 meses do log de auditoria?

São provas de natureza diferente. O log de auditoria é operacional (quem fez o quê, pra investigar incidentes) — 6 meses já é generoso pra esse fim (RNF-006). O registro de consentimento é a prova de que a coleta de dados teve base legal (Art. 8º, §2º da LGPD exige que o controlador comprove o consentimento) — o prazo mais longo segue o mesmo raciocínio de prescrição civil geral (10 anos no Código Civil, mas medido a partir do fim da relação, não do início; 5 anos é o proposto em `OPEN-QUESTIONS.md`, já confirmado com o usuário).

## Relação com `docs/lgpd/registro-de-tratamento.md`

Esta política detalha os prazos que o registro de tratamento (operação #3 "Registro de consentimento" e #5 "Logs de auditoria") só resume numa coluna. Atualizar os dois juntos quando um prazo mudar.
