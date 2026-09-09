# Guia de onboarding e suporte — MVP

**Status:** esqueleto. Preencher com os passos reais de tela durante as Fases 1–2, quando o fluxo de cadastro existir.

**Por que este documento existe:** a decisão sobre "Haverá administrador no MVP?" (ver `../OPEN-QUESTIONS.md`) foi *não haver portal admin com UI*, mas **é necessário um procedimento manual documentado** para colocar os primeiros professores e alunos no sistema e dar suporte durante o MVP. O portal admin real é a Fase 8 (ADR-009).

---

## 1. Papéis e responsabilidades no MVP

| Tarefa | Quem faz | Como |
|---|---|---|
| Criar conta de professor | Professor (self-service) | Tela pública de cadastro |
| Aprovar/ativar professor | Operador (suporte) | Firebase Console / Admin SDK — marcar `accounts/{accountId}.status = ACTIVE` |
| Criar sala | Professor | Portal do professor |
| Inscrever aluno maior de 18 | Aluno (self-service) ou professor | Código de autoinscrição ou inscrição manual |
| Inscrever aluno menor de 18 | Professor/escola | Inscrição manual + registro da declaração de consentimento do responsável (RF-021, ADR-011) |
| Redefinir senha / destravar acesso | Operador (suporte) | Firebase Console → Authentication |
| Atender pedido de exclusão/exportação de dados | Operador (suporte) / encarregado | Funções `exportUserData` / `deleteUserData` (Fase 6) ou manual via Admin SDK antes disso |

---

## 2. Provisionar um professor (manual, MVP)

_(preencher na Fase 1)_

1. Professor se cadastra na tela pública escolhendo o papel "Professor".
2. Operador confere e ativa a conta:
   - Firebase Console → Firestore → `accounts/{uid}` → `status: ACTIVE`.
   - Conferir se o custom claim `role=teacher` foi aplicado (`users/{uid}.role` deve espelhar).
3. Enviar ao professor o link de acesso e este guia (seção 4).

---

## 3. Provisionar alunos de uma turma

_(preencher na Fase 2)_

### 3.1 Alunos maiores de 18

- Opção A: professor compartilha o **código da sala**; o aluno se cadastra e usa o código para entrar.
- Opção B: professor cadastra manualmente (nome + e-mail); o aluno recebe convite para definir a senha.

### 3.2 Alunos menores de 18

1. O professor/escola coleta o **termo de consentimento do responsável legal** (modelo fornecido pela plataforma) e o guarda.
2. O professor cadastra o aluno manualmente e **declara no sistema** que obteve o consentimento — isso grava um registro `GUARDIAN_CONSENT` em `consents/{uid}` (ADR-011).
3. O aluno menor não recebe fluxo de autocadastro.

---

## 4. Roteiro rápido para o professor (primeiro acesso)

_(preencher — vira material de apoio entregue ao professor piloto)_

- Como criar a primeira sala e obter o código de inscrição.
- Como criar uma atividade no seu repositório e atribuí-la a uma ou mais salas (ADR-012).
- Como definir prazo e quando os alunos verão as respostas (ADR-013).
- Como acompanhar os resultados da turma.

---

## 5. Canais de suporte durante o MVP

- Canal de suporte ao professor: _(definir — e-mail/WhatsApp)_.
- Canal do encarregado (DPO) para assuntos de dados pessoais: _(e-mail do responsável pelo projeto, publicado na Política de Privacidade)_.
- Registro de todo acesso de suporte a dados de um professor: obrigatório, nunca acesso silencioso (RNF-006, ADR-009).
