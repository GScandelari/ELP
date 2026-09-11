# Plano detalhado — Fase 2: Salas / Classes

**Branch:** `fase-2-salas` · **Base:** `main` @ `953c31a` (Fase 1 fechada)
**Referência:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) §6 · [`SDD.md`](./SDD.md) RF-004..RF-007, RF-021, UC-002, UC-003, RN-001..RN-004 · ADR-009, ADR-011, ADR-012

---

## 1. Objetivo e critério de saída

Entregar o ciclo de vida de **salas** e **inscrições**: professor cria e gerencia salas com código de convite; aluno maior entra por código; professor inscreve alunos manualmente (incluindo o fluxo de menor de idade com declaração de consentimento do responsável).

**Critério de saída (do IMPLEMENTATION-PLAN):**
- UC-002 e UC-003 completos, demonstráveis pela UI nos dois portais.
- RN-001 a RN-004 cobertos por testes de Security Rules e/ou testes de integração das Functions.
- Rascunho de [`docs/operations/onboarding-mvp.md`](./operations/onboarding-mvp.md) (suporte manual, sem portal admin — decisão de `OPEN-QUESTIONS.md`).
- E2E no CI: professor cria sala → aluno entra por código → sala aparece no portal do aluno.

**Fora de escopo desta fase** (fica para depois): atividades e `assignments` (Fase 3), attempts (Fase 4), App Check e rate limiting (Fase 6), exportação/exclusão de dados (Fase 6), portal admin (Fase 8).

---

## 2. Modelo de dados — o que esta fase materializa

Já previsto na §3 do IMPLEMENTATION-PLAN. Nesta fase passam a existir de fato:

```text
enrollmentCodes/{code}
  classId, accountId, createdAt
  # coleção auxiliar de unicidade (RN-001) + lookup O(1) por código.
  # nunca legível/gravável pelo client (só Cloud Function).

classes/{classId}
  accountId, name, description, enrollmentCode,
  status (ACTIVE | INACTIVE | ARCHIVED),
  studentCount,                 # denormalizado, mantido por join/add/remove
  createdAt, updatedAt

classes/{classId}/enrollments/{studentId}
  studentId,                    # == id do documento; repetido como campo p/ collectionGroup query
  enrollmentType (SELF_ENROLLMENT | TEACHER_ASSIGNED),
  status (ACTIVE | REMOVED),
  studentName, studentEmail,    # denormalizados p/ o roster do professor sem N leituras
  createdAt

consents/{uid}/records/{recordId}   # já existe; ganha o type GUARDIAN_CONSENT
  type: 'GUARDIAN_CONSENT', textVersion, grantedAt,
  grantedByRole: 'teacher', grantedByUid: <uid do professor>,
  guardianName, evidence         # evidence = referência ao termo guardado pelo professor/escola
```

### 2.1 Decisões de design a fixar

| Tema | Decisão proposta | Alternativa considerada |
|---|---|---|
| **Formato do código** | 6 caracteres do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (Crockford sem vogais e sem `I O 0 1` — evita ambiguidade e palavrões). ~10⁹ combinações. Exibido como `ABC-234`, normalizado para `ABC234` na entrada. | 8 chars (excesso p/ a escala do MVP); UUID curto (feio de digitar). |
| **Geração + unicidade** | No callable `createClass`, transação: gera código → `tx.get(enrollmentCodes/{code})` → se livre, cria `enrollmentCodes/{code}` **e** `classes/{classId}` no mesmo commit. Até 5 tentativas em colisão, depois `resource-exhausted`. | Contador sequencial (previsível, permite enumerar salas). |
| **Criação da sala** | Só via callable. Rule de `classes` create vira `if false`. | Deixar o client criar (não dá p/ garantir código único — `enrollmentCodes` é fechado). |
| **Mudança de status** (ativar/desativar/arquivar) | Escrita direta do client, protegida por rule que trava `accountId` e `enrollmentCode` (RN-004). Sem callable. | Callable `updateClass` (over-engineering p/ um campo). |
| **Lista de salas do aluno** | `collectionGroup('enrollments')` com `where('studentId','==',uid)`, depois busca cada `classes/{classId}`. Exige campo `studentId` no doc e índice de collection group + rule `match /{path=**}/enrollments/{sid}`. | Espelho `users/{uid}/classes/{classId}` (mais escrita, mais chance de divergir). |
| **Nome do aluno no roster** | Denormalizado em `enrollments.studentName/Email` no momento da inscrição; aceita ficar levemente desatualizado até a Fase 6 (quando houver `updateProfile`). | Ler `users/{uid}` por aluno (N leituras no roster). |
| **Convite do aluno criado pelo professor** | Admin SDK `createUser` + `generatePasswordResetLink`; no MVP o link é entregue manualmente pelo professor (emulador só loga; sem SMTP). Documentado como **R4 do RIPD — risco aceito no MVP**. | Integrar SMTP agora (fora de escopo da fase). |
| **Rotação de código** | Callable `rotateEnrollmentCode` (opcional, incluída na PR 2.7): apaga o `enrollmentCodes` antigo e cria um novo na mesma transação. | Não permitir (código vazado fica vazado até arquivar a sala). |

### 2.2 Índices a adicionar (`firestore.indexes.json`)

- `classes`: `accountId ASC, createdAt DESC` — listar as salas do professor em ordem.
- collectionGroup `enrollments`: `studentId ASC, status ASC` — listar as salas ativas do aluno.

---

## 3. Backend — Cloud Functions

Novo diretório `functions/src/classes/`. Registrar os exports em `functions/src/index.ts` (remover as linhas correspondentes do bloco de comentário "Funções planejadas").

### 3.1 `createClass` (callable) — RF-004, RN-001, UC-002

```
input:  { name: string, description?: string }
guard:  request.auth != null && token.role == 'teacher'
valida: name 2..80 chars; description 0..500 chars
efeito: gera código único (transação c/ retry); cria
        classes/{classId} = { accountId: uid, name, description,
          enrollmentCode, status: 'ACTIVE', studentCount: 0,
          createdAt: serverTimestamp, updatedAt: serverTimestamp }
        enrollmentCodes/{code} = { classId, accountId: uid, createdAt }
saída:  { classId, enrollmentCode }
erros:  unauthenticated | permission-denied | invalid-argument | resource-exhausted
```

`enrollment-code.ts` — módulo puro: `generateCode()` (alfabeto acima, 6 chars, `crypto.randomInt`), `formatCode`/`normalizeCode` (`ABC-234` ⇄ `ABC234`). Testável isoladamente (unit).

### 3.2 `joinClassByCode` (callable) — RF-006, RN-002, RN-003, UC-003

```
input:  { code: string }
guard:  token.role == 'student'  &&  users/{uid}.isMinor == false   (defesa em profundidade; menor não tem conta self-service)
passos: normaliza code
        enrollmentCodes/{code}  -> not-found  => 'not-found' ("código não encontrado")
        classes/{classId}       -> status != 'ACTIVE'  => 'failed-precondition' ("sala não está aceitando inscrições")  (RN-002)
        classes/{classId}/enrollments/{uid}:
          status == 'ACTIVE'   => 'already-exists' ("você já está nesta sala")  (RN-003)
          status == 'REMOVED'  => reativa (status = 'ACTIVE'), sem duplicar o doc
transação: cria enrollment { studentId: uid, enrollmentType: 'SELF_ENROLLMENT',
             status: 'ACTIVE', studentName, studentEmail, createdAt }
           classes/{classId}.studentCount += 1
saída:  { classId, className }
```

### 3.3 `addStudentToClass` (callable) — RF-007, RF-021, UC (manual)

```
input:  { classId, studentEmail, studentName,
          isMinor: boolean,
          guardianConsent?: { guardianName: string, statementAccepted: true, evidenceNote?: string } }
guard:  token.role == 'teacher'  &&  classes/{classId}.accountId == uid  (RN-004)

caso A — aluno já tem conta (getUserByEmail encontra):
  - se users/{uid}.role != 'student' => invalid-argument
  - cria enrollment TEACHER_ASSIGNED (mesma transação de studentCount)

caso B — aluno não tem conta:
  - isMinor && !guardianConsent?.statementAccepted => failed-precondition
  - Admin createUser(email) ; setCustomUserClaims(role: student)
  - users/{uid} = { name, email, role: 'student', status: 'ACTIVE', isMinor, timestamps }
  - se isMinor: consents/{uid}/records += { type: 'GUARDIAN_CONSENT', textVersion,
      grantedByRole: 'teacher', grantedByUid: uid_prof, guardianName, evidence }
  - generatePasswordResetLink(email) -> retornado ao professor (entrega manual no MVP, R4 do RIPD)
  - cria enrollment TEACHER_ASSIGNED
saída:  { studentId, enrollmentType, passwordSetupLink? }
```

> Divisão sugerida: **caso A na PR 2.5**, **caso B (criação de conta + consentimento de menor) na PR 2.6**. Podem ser uma PR só se preferir revisar tudo junto, mas separar isola a superfície jurídica do menor.

### 3.4 `removeStudentFromClass` (callable, mínimo) — RF-005, PR 2.5

```
input:  { classId, studentId }
guard:  token.role == 'teacher' && classes/{classId}.accountId == uid  (RN-004)
efeito: transação — enrollments/{studentId}.status = 'REMOVED'
        classes/{classId}.studentCount -= 1  (guardando contra < 0)
saída:  { ok: true }
```

Não apaga o doc (preserva histórico e futuras attempts); a re-inscrição do mesmo aluno reativa o `status` para `ACTIVE`.

### 3.5 `rotateEnrollmentCode` (callable, opcional) — PR 2.7

```
input: { classId } ; guard: dono da sala
transação: delete enrollmentCodes/{antigo} ; cria enrollmentCodes/{novo} ; classes.enrollmentCode = novo
```

### 3.6 Padrões a seguir (do `finalizeSignup`)

- `onCall` v2, região global já fixada em `index.ts` (`southamerica-east1`).
- `HttpsError` com códigos canônicos; mensagens em pt-BR prontas p/ exibição.
- Idempotência onde fizer sentido (re-inscrição retorna o estado atual em vez de erro? — **não**, RN-003 pede erro; mas `createClass` chamado 2× cria 2 salas, o que é aceitável).
- `FieldValue.serverTimestamp()` e `FieldValue.increment(1)`.
- Validação de entrada explícita antes de qualquer escrita.

---

## 4. Security Rules — mudanças

Arquivo `firestore.rules`. Diff conceitual:

```diff
  match /classes/{classId} {
    allow read: if isAccountOwner(classId) || isEnrolledStudent(classId);
-   allow create: if hasRole('teacher') && request.resource.data.accountId == request.auth.uid;
+   allow create: if false;                     // createClass (callable) — precisa do código único
-   allow update, delete: if isAccountOwner(classId);
+   allow delete: if isAccountOwner(classId);
+   allow update: if isAccountOwner(classId)
+     && request.resource.data.accountId == resource.data.accountId
+     && request.resource.data.enrollmentCode == resource.data.enrollmentCode
+     && request.resource.data.studentCount == resource.data.studentCount;   // RN-004; trava campos sensíveis

    match /enrollments/{studentId} {
      allow read: if isAccountOwner(classId) || isSelf(studentId);
      allow write: if false;                     // joinClassByCode / addStudentToClass (callables)
    }
  }

+ // collection group — o aluno lista as próprias inscrições em qualquer sala
+ match /{path=**}/enrollments/{studentId} {
+   allow read: if isSelf(studentId);
+ }
```

`isEnrolledStudent(classId)` já existe e cobre a leitura da sala pelo aluno inscrito. `enrollmentCodes` já é `read, write: if false` — mantém.

### 4.1 Casos de teste de Rules (`tests/rules/`)

| # | Cenário | Esperado |
|---|---|---|
| 1 | professor lê a própria `classes/{id}` | ✅ |
| 2 | professor lê `classes/{id}` de outro professor | ❌ |
| 3 | aluno inscrito lê a `classes/{id}` | ✅ |
| 4 | aluno não inscrito lê a `classes/{id}` | ❌ |
| 5 | client cria `classes/{id}` diretamente | ❌ (regra `if false`) |
| 6 | dono muda `name`/`status` da sala direto | ✅ |
| 7 | dono tenta mudar `enrollmentCode`/`accountId`/`studentCount` direto | ❌ |
| 8 | client escreve em `classes/{id}/enrollments/{sid}` | ❌ |
| 9 | client lê/escreve `enrollmentCodes/{code}` | ❌ |
| 10 | aluno lê a própria `enrollments/{uid}` (path direto e collectionGroup) | ✅ |
| 11 | aluno lê `enrollments/{outroSid}` | ❌ |
| 12 | professor lê o roster (`enrollments`) da própria sala | ✅ |
| 13 | `consents/{uid}/records` continua `write: if false` (inclui GUARDIAN_CONSENT) | ❌ |

### 4.2 Testes de integração das Functions (novo)

Sem infra de testes de Functions ainda (`functions/package.json` → `vitest ... --passWithNoTests`). Propor: script `test:functions` rodando `firebase emulators:exec --only auth,firestore,functions "vitest run --dir functions/test"`, com o cliente chamando os callables via SDK. Cobrir:

- `createClass`: papel errado → `permission-denied`; nome curto → `invalid-argument`; sucesso cria os dois docs; código no formato certo.
- `joinClassByCode`: código inexistente → `not-found`; sala `INACTIVE` → `failed-precondition` (RN-002); 2ª chamada → `already-exists` (RN-003); sucesso incrementa `studentCount`.
- `addStudentToClass`: não-dono → `permission-denied` (RN-004); caso A e caso B; menor sem consentimento → `failed-precondition`; menor com consentimento grava `GUARDIAN_CONSENT`.

> Alternativa mais leve: manter só testes de Rules + E2E e adiar testes de Functions. Recomendo incluir ao menos os de `joinClassByCode` (é onde moram RN-002/003).

---

## 5. Frontend — `apps/web`

### 5.1 Rotas (App Router, grupo `(app)`)

| Rota | Papel | Conteúdo |
|---|---|---|
| `/painel` | ambos | vira dispatcher: professor → resumo + atalho "Minhas Salas"; aluno → "Minhas Salas" + "Entrar em sala" |
| `/salas` | ambos (conteúdo por papel) | professor: grade de salas + "Criar sala". aluno: lista de salas em que está inscrito |
| `/salas/entrar` | aluno | formulário de código |
| `/salas/[classId]` | professor (dono) | detalhe: código com "copiar", contador, roster, "Adicionar aluno", ações de status |

Rota única `/salas` com ramificação por `role` do `useAuth` — evita duplicar navegação. Alternativa: `/turmas` (professor) vs `/salas` (aluno); descartada por dobrar rotas e menu.

### 5.2 Componentes novos

- `RequireRole` — envolve `RequireAuth`, redireciona p/ `/painel` se o papel não bate.
- `CreateClassDialog` — form (nome, descrição) → `httpsCallable('createClass')` → navega p/ `/salas/[classId]`.
- `ClassCard` — card na grade (nome, status, `studentCount`).
- `EnrollmentCodeBadge` — mostra `ABC-234` + botão copiar (`navigator.clipboard`).
- `StudentRoster` — tabela do roster (nome, e-mail, tipo, data); lê `enrollments` da sala.
- `JoinClassForm` — input de código (máscara/normalização) → `httpsCallable('joinClassByCode')` → mensagens de erro amigáveis por código do `HttpsError`.
- `AddStudentDialog` — e-mail, nome, toggle "menor de 18"; se menor, campos de consentimento do responsável + link p/ o modelo de termo. Exibe o `passwordSetupLink` retornado.

### 5.3 Leitura de dados (client SDK, protegida por Rules)

- Professor lista salas: `query(collection(db,'classes'), where('accountId','==',uid), orderBy('createdAt','desc'))`.
- Aluno lista salas: `query(collectionGroup(db,'enrollments'), where('studentId','==',uid), where('status','==','ACTIVE'))` → `Promise.all` de `getDoc(classes/{classId})`.
- Roster: `query(collection(db,'classes',classId,'enrollments'), where('status','==','ACTIVE'))`.
- `lib/classes.ts` centraliza os callables e as queries (espelha `lib/signup.ts`).

### 5.4 Conteúdo/legal

- Modelo de termo de consentimento do responsável: adicionar em `apps/web/content/termo-consentimento-responsavel.md` (renderizado com `marked`, como as outras páginas legais) e/ou linkar de `docs/lgpd/termos-e-consentimento.md`.

---

## 6. Testes

| Camada | O quê | Onde |
|---|---|---|
| Unit | gerador/normalizador de código | `functions/src/classes/enrollment-code.test.ts` |
| Rules | tabela da §4.1 | `tests/rules/firestore.rules.test.ts` (ou arquivo novo `classes.rules.test.ts`) |
| Integração Functions | §4.2 | `functions/test/*.test.ts` + script `test:functions` |
| E2E | professor cria sala → copia código → aluno (maior) se cadastra → entra por código → sala aparece; tentativa duplicada mostra erro | `e2e/salas.spec.ts` |

CI: o job `build` já roda `test` e `test:rules`. Adicionar `test:functions` ao job `build` (ou um job novo). O job `e2e` pega `salas.spec.ts` automaticamente.

---

## 7. Quebra em PRs

Cada PR: escopo fechado, verde no CI (lint/typecheck/test/build/rules/e2e + SonarCloud), mergeada por squash.

| PR | Título | Entrega | Cobre |
|---|---|---|---|
| **2.1** | `feat(classes): createClass + código único` | `functions/src/classes/{create-class,enrollment-code}.ts`; rules `classes.create = if false` + guarda de `update`; índice `classes(accountId,createdAt)`; unit do gerador; rules #1–#7 | RF-004, RN-001, RN-004, UC-002 (backend) |
| **2.2** | `feat(web): portal do professor — criar e listar salas` | `RequireRole`; `/salas` (professor); `CreateClassDialog`, `ClassCard`; `/salas/[classId]` com `EnrollmentCodeBadge`; `lib/classes.ts` | UC-002 (UI) |
| **2.3** | `feat(classes): joinClassByCode` | `functions/src/classes/join-class-by-code.ts`; rule collectionGroup `enrollments`; índice collectionGroup; rules #8–#12; integração `joinClassByCode` (RN-002/003) | RF-006, RN-002, RN-003, UC-003 (backend) |
| **2.4** | `feat(web): portal do aluno — entrar por código e listar salas` | `/salas` (aluno); `/salas/entrar`; `JoinClassForm` com mapeamento de erros | UC-003 (UI) |
| **2.5** | `feat(classes): inscrição manual (aluno com conta) + remoção` | `addStudentToClass` caso A; `removeStudentFromClass` (mínimo); `AddStudentDialog` (sem menor); `StudentRoster` com ação de remover | RF-007 (parcial), RF-005 |
| **2.6** | `feat(classes): inscrição manual de aluno menor + consentimento` | `addStudentToClass` caso B; `GUARDIAN_CONSENT`; `passwordSetupLink`; modelo de termo; rules #13; integração | RF-007, RF-021, ADR-011 |
| **2.7** | `feat(classes): gerência da sala + E2E + onboarding` | status da sala (editar/ativar/desativar/arquivar) na UI; `rotateEnrollmentCode` (opcional); `e2e/salas.spec.ts`; rascunho `docs/operations/onboarding-mvp.md`; Fase 2 marcada como concluída no IMPLEMENTATION-PLAN | RF-005, critério de saída |

Ordem: 2.1 → 2.2 → 2.3 → 2.4 → (2.5 → 2.6) → 2.7. 2.5/2.6 podem virar uma PR.

---

## 8. Riscos e questões — decididas

1. ✅ **Convite do aluno criado pelo professor** — `generatePasswordResetLink` devolvido ao professor p/ repasse manual (R4 do RIPD, risco aceito no MVP).
2. ✅ **Formato do código** — 6 chars, exibido `ABC-234`, normalizado `ABC234`.
3. ✅ **Testes de integração de Functions** — montar a infra `test:functions` já nesta fase (a partir da PR 2.1).
4. ✅ **Remoção de aluno da sala** — incluir um `removeStudentFromClass` **mínimo** (callable do dono; marca `enrollments/{sid}.status = 'REMOVED'` e decrementa `studentCount`). Entra na PR 2.5.

Em aberto (baixo impacto, decidir se/quando aparecerem):

- **Rotação de código** — `rotateEnrollmentCode` fica como opcional na PR 2.7.
- **Limites anti-abuso** (salas por professor, alunos por sala) — App Check só na Fase 6; sem teto por agora.
- **`studentName` desatualizado no roster** — aceito até a Fase 6 ter `updateProfile`.

### 8.1 Pegadinha de Security Rules encontrada na PR 2.3 — `list`/collection group só prova pelo filtro da query

Descoberta rodando o e2e: para `list` (inclui collection group), o Firestore só consegue **provar** a regra sem ler cada documento quando a condição bate **exatamente com um filtro `where` da própria query**, no campo de **dado** (`resource.data.x == request.auth.uid`) — não no segmento do path (`isSelf`/wildcard) nem num campo fora do filtro (mesmo denormalizado). Fora disso o emulador nega a query com `Null value error` / `Property X is undefined on object`, mesmo sem nenhum `get()` na regra. **Só afeta `list`** — `get` (documento único) aceita a condição cheia (path + `resource.data`, com `get()` se precisar).

Regra final em `classes/{classId}/enrollments/{studentId}` (via `match /{path=**}/enrollments/{studentId}`):
- `allow get`: `resource.data.accountId == uid || isSelf(studentId)` (professor OU o próprio aluno, documento único).
- `allow list`: só `resource.data.studentId == request.auth.uid` — por isso o client **precisa sempre incluir** `where('studentId', '==', uid)` na query (ver `watchTeacherClasses`/futura `watchMyEnrollments`).

**Implicação para a PR 2.5** (roster do professor, `classes/{classId}/enrollments` sem filtro por `studentId`): essa regra de `list` **não cobre** o professor listando o roster da própria sala sem um `where` compatível — vai precisar de uma condição de `list` própria e provável pelo filtro que a tela do professor efetivamente usar (ex.: `where('accountId','==', uid)` denormalizado, se a query filtrar por isso) ou reavaliar o desenho quando chegar lá.

---

## 9. Checklist de conclusão da fase

- [x] `createClass`, `joinClassByCode`, `addStudentToClass` (casos A e B), `removeStudentFromClass` implementados e exportados (PRs 2.1, 2.3, 2.5, 2.6)
- [x] Rules atualizadas + testes de rules verdes (27/27 depois da PR 2.6)
- [x] Índices adicionados e deployáveis (`classes`, `enrollments` collection group)
- [x] Portais de professor e aluno navegáveis (PRs 2.2, 2.4, 2.5)
- [x] Fluxo de menor com `GUARDIAN_CONSENT` registrado — `addStudentToClass` caso B (PR 2.6); modelo de termo em `apps/web/content/termo-responsavel.md`, rota pública `/termo-responsavel`
- [x] E2E cobrindo o fluxo (`salas-professor`, `salas-aluno`, `salas-inscricao-manual` — inclui o cenário de menor) verdes no CI
- [ ] `docs/operations/onboarding-mvp.md` (rascunho) — PR 2.7
- [ ] Fase 2 marcada como ✅ no `IMPLEMENTATION-PLAN.md` — PR 2.7
- [x] `docs/lgpd/registro-de-tratamento.md` atualizado (operação 2 já cobria "cadastro/vínculo de aluno"; explicitada a inscrição manual de menor pelo professor)

### 9.1 Decisões de implementação da PR 2.6 (não estavam fechadas no plano original)

- **Entrega do link de definição de senha:** o `AddStudentDialog` mostra o `passwordSetupLink` numa tela de sucesso com botão "Copiar link" antes de fechar — o professor repassa manualmente (R4 do RIPD, decisão 1 da §8 original).
- **Modelo de termo do responsável:** virou conteúdo público (`apps/web/content/termo-responsavel.md`, rota `/termo-responsavel`, fora do menu de navegação), linkado do `AddStudentDialog` quando "menor de 18" está marcado. Texto vem de `docs/lgpd/termos-e-consentimento.md` §2 (já existia, não foi inventado).
- **Consentimento de TERMOS/PRIVACIDADE para aluno adulto criado pelo professor (caso B, não-menor):** **não implementado** — o fluxo cria a conta sem registrar aceite de Termos/Privacidade (diferente do self-service, que registra via `finalizeSignup`). Gap conhecido; o aluno não vê essa tela até logar pela primeira vez, e não há tela de "primeiro login" nesta fase. Registrar como pendência para a Fase 6 (hardening) ou quando o portal ganhar uma tela de "completar cadastro".
