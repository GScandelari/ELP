# Guia de onboarding e suporte — MVP

**Status:** seções 1–3 preenchidas com o fluxo real das Fases 1 e 2 (cadastro, login, salas, inscrição). Seção 4 (atividades/resultados) fica pendente até a Fase 3–5 existirem.

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

## 2. Provisionar um professor

1. Professor acessa `/cadastro`, escolhe "Professor", aceita Termos + Política de Privacidade e cria a conta (e-mail/senha).
2. `finalizeSignup` (Cloud Function) roda automaticamente no primeiro acesso: define o custom claim `role=teacher`, cria `users/{uid}` e `accounts/{uid}` já com `status: ACTIVE` — **não há aprovação manual no MVP**, o cadastro de professor é aberto (decisão registrada em `OPEN-QUESTIONS.md`).
3. Se for preciso suspender uma conta (abuso, cobrança em atraso quando isso existir): Firebase Console → Firestore → `accounts/{uid}` → `status: SUSPENDED` (sem UI própria até a Fase 8, ADR-009).
4. Enviar ao professor o link de acesso (`/entrar`) e este guia.

---

## 3. Provisionar alunos de uma turma

Pré-requisito: o professor já tem uma sala criada (`/salas` → "Criar sala"), que gera um código de inscrição de 6 caracteres (ex. `BCD-234`, visível em `/salas/{id}`). Se o código vazar, o professor pode gerar outro em "Gerar novo código" — o antigo para de funcionar na hora.

### 3.1 Alunos maiores de 18

- **Opção A — autoinscrição:** professor compartilha o código da sala (`/salas/{id}`, botão "Copiar"); o aluno cria a própria conta em `/cadastro` (escolhendo "Aluno" e confirmando "18 anos ou mais? Sim") e entra em `/salas/entrar` com o código.
- **Opção B — inscrição manual, aluno já tem conta:** professor abre a sala → "Adicionar aluno" → informa e-mail e nome → o sistema encontra a conta existente (por e-mail) e inscreve direto.
- **Opção C — inscrição manual, aluno sem conta:** mesmo formulário; se o e-mail não tem conta, o sistema cria uma (Admin SDK) e devolve um **link de definição de senha** na tela — **copie e envie esse link ao aluno por fora** (WhatsApp, e-mail manual). A ELP ainda não envia esse e-mail automaticamente (risco aceito no MVP, ver RIPD R4).

### 3.2 Alunos menores de 18

Nunca fazem cadastro self-service — `/cadastro` bloqueia quem responde "não" para "18 anos ou mais?" (RF-021). Só entram pela inscrição manual do professor:

1. O professor/escola **coleta o termo de consentimento do responsável legal** — modelo na rota pública `/termo-responsavel` (conteúdo-fonte em `apps/web/content/termo-responsavel.md`) — e guarda o documento assinado; a ELP não recebe nem armazena esse arquivo.
2. Na sala, "Adicionar aluno" → marca "Aluno menor de 18 anos" → preenche o nome do responsável → marca a declaração de que obteve o consentimento (texto fixo, com link para o modelo). Sem isso o botão "Adicionar" fica desabilitado.
3. O sistema cria a conta do aluno (`isMinor: true`) e grava a declaração como `GUARDIAN_CONSENT` em `consents/{uid}/records` (imutável, ADR-011) — e devolve o link de definição de senha, igual à opção C acima.

### 3.3 Removendo um aluno da sala

Na sala → lista de alunos → "Remover" (com confirmação). O aluno sai da lista mas o histórico é preservado (`status: REMOVED`, não é apagado) — se reingressar depois (pelo código ou por nova inscrição manual), reativa o mesmo vínculo.

---

## 4. Roteiro rápido para o professor (primeiro acesso)

_Vira material de apoio entregue ao professor piloto quando o onboarding real começar (Fase 7). Os dois primeiros itens já têm tela; os demais dependem das Fases 3–5._

- ✅ Como criar a primeira sala e obter o código de inscrição — seção 3 acima.
- ✅ Como inscrever alunos manualmente (com ou sem conta, incluindo menores) — seção 3 acima.
- ⬜ Como criar uma atividade no seu repositório e atribuí-la a uma ou mais salas (ADR-012) — Fase 3.
- ⬜ Como definir prazo e quando os alunos verão as respostas (ADR-013) — Fase 3/4.
- ⬜ Como acompanhar os resultados da turma — Fase 5.

---

## 5. Canais de suporte durante o MVP

- Canal de suporte ao professor: _(definir — e-mail/WhatsApp)_.
- Canal do encarregado (DPO) para assuntos de dados pessoais: _(e-mail do responsável pelo projeto, publicado na Política de Privacidade)_.
- Registro de todo acesso de suporte a dados de um professor: obrigatório, nunca acesso silencioso (RNF-006, ADR-009).
