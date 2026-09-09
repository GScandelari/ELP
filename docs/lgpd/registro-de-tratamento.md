# Registro das operações de tratamento de dados pessoais

**Base:** Art. 37 da LGPD. Documento vivo — atualizar sempre que uma nova operação de tratamento for adicionada (item da Definition of Done, SDD seção 31).

**Status:** rascunho inicial. As linhas abaixo são as operações previstas nas Fases 0–7; revisar e completar com o jurídico antes do go-live.

## Operações

| # | Operação | Dados pessoais | Titular | Base legal (Art. 7º / 11 / 14) | Finalidade | Retenção | Compartilhamento |
|---|---|---|---|---|---|---|---|
| 1 | Cadastro de professor | nome, e-mail | Professor | Execução de contrato (Art. 7º, V) | Criar e manter a conta | Enquanto a conta existir + 30 dias | Google (infra) |
| 2 | Cadastro/vínculo de aluno | nome, e-mail, data de nascimento | Aluno | Legítimo interesse educacional (maior de 18) / Consentimento do responsável (menor, Art. 14) | Participação nas turmas e atividades | Igual à conta; anonimizado na exclusão | Google (infra) |
| 3 | Registro de consentimento | identificador do titular, versão do texto, data/hora, papel de quem consentiu | Professor / Responsável legal | Cumprimento de obrigação legal (Art. 7º, II) | Comprovar consentimento | 5 anos após o término da relação | — |
| 4 | Tentativas e respostas de atividades | respostas do aluno, notas, timestamps | Aluno | Mesma da operação 2 | Correção automática e acompanhamento pedagógico | Igual à conta; anonimizado na exclusão | Google (infra) |
| 5 | Logs de auditoria | uid, ação, timestamp, IP | Professor / Aluno | Legítimo interesse — segurança (Art. 7º, IX) | Segurança e investigação de incidentes | 6 meses | — |
| 6 | Cookies essenciais | identificador de sessão | Visitante / Usuário | Legítimo interesse — cookies estritamente necessários | Manter sessão autenticada e proteção (App Check) | Sessão | — |
| 7 | Acesso de suporte a dados de um professor (Fase 8) | dados da conta suportada | Professor / Aluno | Legítimo interesse — prestação do serviço, sempre auditado | Diagnóstico mediante solicitação | Registro de acesso: 6 meses | — |

## Transferência internacional

Os dados são processados em infraestrutura do Google Cloud/Firebase na região `southamerica-east1` (São Paulo). Recursos auxiliares do Google podem processar metadados fora do Brasil — amparo no Art. 33 (cláusulas contratuais padrão do DPA do Google Cloud). Evidência do DPA arquivada em `dpa/`.

## Titulares e canais

- Direitos do titular atendidos pelo portal (exportar, corrigir, excluir) e pelo canal do encarregado (Art. 18, prazo de 15 dias — Art. 19).
- Solicitações relativas a alunos menores são feitas pelo responsável legal via professor/escola ou pelo canal do encarregado.
