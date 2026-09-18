# Registro das operações de tratamento de dados pessoais

**Base:** Art. 37 da LGPD. Documento vivo — atualizar sempre que uma nova operação de tratamento for adicionada (item da Definition of Done, SDD seção 31).

**Status:** preenchido com as operações implementadas até a Fase 6 (✅ — ver `docs/IMPLEMENTATION-PLAN.md`); revisar e completar com o jurídico antes do go-live (Fase 7). Prazos de retenção detalhados por categoria em `docs/lgpd/politica-de-retencao.md` — esta tabela resume, aquele documento é a fonte de verdade quando os dois divergirem.

## Operações

| # | Operação | Dados pessoais | Titular | Base legal (Art. 7º / 11 / 14) | Finalidade | Retenção | Compartilhamento |
|---|---|---|---|---|---|---|---|
| 1 | Cadastro de professor | nome, e-mail | Professor | Execução de contrato (Art. 7º, V) | Criar e manter a conta | Enquanto a conta existir | Google (infra) |
| 2 | Cadastro/vínculo de aluno — self-service (maior de 18) ou inscrição manual pelo professor, incluindo a criação da conta de um aluno menor de 18 (`addStudentToClass`, Fase 2) | nome, e-mail, declaração "tem 18+?" (sem data de nascimento) | Aluno | Legítimo interesse educacional (maior de 18) / Consentimento do responsável (menor, Art. 14) | Participação nas turmas e atividades | Igual à conta; anonimizado na exclusão | Google (infra) |
| 3 | Registro de consentimento (`consents/{uid}/records`, gravado por `finalizeSignup`/`addStudentToClass`) | identificador do titular, versão do texto, data/hora, papel de quem consentiu | Professor / Responsável legal | Cumprimento de obrigação legal (Art. 7º, II) | Comprovar consentimento | 5 anos após a anonimização da conta (`purgeExpiredData`) — nunca enquanto a conta está ativa | — |
| 4 | Tentativas e respostas de atividades (`attempts`, `attemptResults`) | respostas do aluno, notas, timestamps | Aluno | Mesma da operação 2 | Correção automática e acompanhamento pedagógico | Igual à conta; `studentId` anonimizado na exclusão (token não reversível) | Google (infra) |
| 5 | Resumo agregado por aluno/sala (`resultsSummary`, Fase 5) — dashboard de resultados do professor (RF-018) | scores agregados por atividade, sem nome/e-mail | Aluno | Mesma da operação 2 | Acompanhamento pedagógico da turma pelo professor | Indefinido — não tem identificador direto pra anonimizar (ADR-011 §4) | — |
| 6 | Exportação dos próprios dados (`exportUserData`, Fase 6, Art. 18 LGPD) | todo o conjunto das operações 1/2/4/5 do próprio titular, devolvido a ele | Professor / Aluno | Cumprimento de obrigação legal — direito de portabilidade (Art. 18, V) | Atender o pedido de exportação | Não retido — resposta pontual, só a chamada em si vira uma linha de `auditLog` | — |
| 7 | Exclusão da própria conta (`deleteUserData`, Fase 6, Art. 18 LGPD) | identificadores diretos do titular (nome, e-mail) — anonimizados, não copiados a lugar nenhum | Professor / Aluno | Cumprimento de obrigação legal — direito de eliminação (Art. 18, VI) | Atender o pedido de exclusão | Imediato (síncrono, sem carência) — a chamada em si vira uma linha de `auditLog` | — |
| 8 | Logs de auditoria (`auditLog`) das operações 6/7 e de `purgeExpiredData` | uid, ação, timestamp, IP | Professor / Aluno | Legítimo interesse — segurança (Art. 7º, IX) | Segurança e investigação de incidentes | 6 meses | — |
| 9 | Cookies essenciais | identificador de sessão | Visitante / Usuário | Legítimo interesse — cookies estritamente necessários | Manter sessão autenticada e proteção (App Check) | Sessão | — |
| 10 | Acesso de suporte a dados de um professor (Fase 8) | dados da conta suportada | Professor / Aluno | Legítimo interesse — prestação do serviço, sempre auditado | Diagnóstico mediante solicitação | Registro de acesso: 6 meses | — |

## Transferência internacional

Os dados são processados em infraestrutura do Google Cloud/Firebase na região `southamerica-east1` (São Paulo). Recursos auxiliares do Google podem processar metadados fora do Brasil — amparo no Art. 33 (cláusulas contratuais padrão do DPA do Google Cloud). Evidência do DPA arquivada em `dpa/`.

## Titulares e canais

- **Encarregado (DPO):** Stanke Scandelari — stanke399@gmail.com.
- Direitos do titular atendidos pelo portal `/conta` (exportar, excluir — Fase 6) e pelo canal do encarregado (Art. 18, prazo de 15 dias — Art. 19). Correção de cadastro não tem tela própria: nome/e-mail já são geridos pelo Firebase Auth, sem nenhum outro campo de perfil hoje (ADR-011 §4) — pedido de correção, se algum dia surgir, vai pelo canal do encarregado.
- Solicitações relativas a alunos menores são feitas pelo responsável legal via professor/escola ou pelo canal do encarregado.
