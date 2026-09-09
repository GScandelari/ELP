# Plano de Implementação — ELP (English Learning Platform) sobre Firebase

**Versão:** 0.4.0
**Status:** Draft — questões em aberto respondidas (ver `OPEN-QUESTIONS.md`); modelo de dados atualizado para atividade reutilizável (ADR-012)
**Baseado em:** [`SDD.md`](./SDD.md) v0.3.0
**Objetivo deste documento:** traduzir o SDD original (que sugeria Next.js + FastAPI + PostgreSQL) para uma arquitetura 100% Firebase, e organizar a implementação em fases sequenciais e testáveis.

---

## 1. Por que Firebase muda a arquitetura

O SDD original (seção 5 e 6) propõe um monólito modular com backend próprio em FastAPI e PostgreSQL relacional. Ao adotar Firebase como plataforma, três coisas mudam de forma estrutural e precisam ficar explícitas antes de codificar:

1. **Não existe mais um "backend" único.** A lógica de servidor vira um conjunto de Cloud Functions (gatilhos e funções chamáveis) mais regras declarativas de segurança (Firestore Security Rules). Não há um processo FastAPI rodando continuamente.
2. **O banco deixa de ser relacional.** Firestore é um banco de documentos. O modelo entidade-relacionamento da seção 7 e 18 do SDD precisa ser redesenhado em coleções/subcoleções, com desnormalização deliberada onde fizer sentido (Firestore não tem `JOIN`).
3. **Autenticação e autorização usam primitivas do Firebase.** Login/senha, tokens e sessão passam a ser responsabilidade do Firebase Authentication; o RBAC (seção 15 do SDD) é implementado via *custom claims* no token + regras de segurança, em vez de middleware de aplicação.

Essas mudanças **substituem** as decisões implícitas em ADR-002, ADR-003, ADR-004, ADR-005 e ADR-006 listadas na seção 25 do SDD. Ver `docs/adr/` para o registro formal.

> **Atualização de escopo de produto:** este projeto passou a ser desenhado para virar um produto comercial vendido a professores independentes, com um portal admin futuro para suporte e provisionamento. Isso não muda o escopo do MVP (Fases 0–7 abaixo continuam as mesmas), mas afeta nomenclatura do modelo de dados desde já e adiciona uma fase pós-MVP — ver ADR-009 e seção 10.

> **Atualização 0.3.0 — landing page e LGPD:** o MVP passa a incluir (a) uma landing page pública para divulgação (ADR-010) e (b) conformidade com a LGPD desde o desenvolvimento, com tratamento diferenciado de dados de alunos menores de idade (ADR-011). Impacto nas fases: a região dos projetos Firebase é fixada em `southamerica-east1` na Fase 0 (decisão irreversível); a Fase 1 ganha age gate e registro de consentimento; a Fase 6 ganha exportação/exclusão de dados e banner de cookies; a Fase 7 ganha o RIPD como bloqueio de go-live. Detalhes no ADR-011 e nos artefatos de `docs/lgpd/`.

> **Atualização 0.4.0 — questões em aberto respondidas:** as decisões estão registradas em `OPEN-QUESTIONS.md`. As de maior impacto: (a) **atividade é reutilizável em várias salas** — deixa de ser subcoleção da sala e vira um repositório do professor (`activities/{activityId}`) com atribuição por sala (`assignments`), ver ADR-012; (b) **resultados (nota e gabarito) não são exibidos ao aluno até a liberação** (ação do professor, prazo ou encerramento), ver ADR-013; (c) **sem portal admin no MVP**, mas com um guia de onboarding/suporte manual — `docs/operations/onboarding-mvp.md`. As seções 3, 4, 6 e 9 abaixo já refletem essas decisões.

---

## 2. Arquitetura proposta

```text
                    +-------------------------------+
                    |     Next.js (App Router)       |
                    |  Teacher Portal | Student Portal|
                    +----------------+----------------+
                                     |
                     Firebase SDK (client) + App Check
                                     |
        +----------------------------------------------------+
        |                                                      |
        v                                                      v
+---------------+                               +----------------------------+
| Firebase Auth |                                |     Cloud Firestore        |
| (custom claims|<------------------------------>|  (leitura direta protegida |
|  role=teacher/|                                |   por Security Rules)      |
|  student/admin)                                +--------------+-------------+
+---------------+                                               |
                                                                 | triggers / callable
                                                                 v
                                                  +----------------------------+
                                                  |      Cloud Functions        |
                                                  |  - createClass               |
                                                  |  - joinClassByCode            |
                                                  |  - publishActivity            |
                                                  |  - createAttempt              |
                                                  |  - submitAttempt -> evaluate  |
                                                  |  - onUserCreate (set claims)  |
                                                  +--------------+---------------+
                                                                 |
                                                                 v
                                                  +----------------------------+
                                                  |   Admin SDK (bypassa rules) |
                                                  |   grava score, is_correct   |
                                                  +----------------------------+

  Observabilidade: Cloud Logging + Cloud Monitoring + Error Reporting
  Hosting: Firebase Hosting (frontend) + Cloud Functions (SSR/API)
  CI/CD: GitHub Actions -> firebase deploy (dev/staging/prod)
```

### 2.1 Componentes

| Camada | Original (SDD) | Proposta Firebase |
|---|---|---|
| Frontend | Next.js + React + TS | Mantido — Next.js + React + TS, deploy via Firebase Hosting (Web Frameworks integration) |
| Autenticação | JWT próprio | Firebase Authentication (email/senha; Google como opção futura) |
| Autorização | Middleware RBAC | Custom claims (`role`) + Firestore Security Rules |
| Backend/API | FastAPI + Pydantic | Cloud Functions (2ª geração): funções `callable` para operações de escrita sensíveis, triggers para eventos |
| Banco de dados | PostgreSQL (relacional) | Cloud Firestore (documentos, ver seção 3) |
| Armazenamento de arquivos (futuro) | Object Storage | Cloud Storage for Firebase |
| Observabilidade | logs/métricas custom | Cloud Logging, Cloud Monitoring, Error Reporting |
| Deploy | a definir | Firebase Hosting + Cloud Functions, ambientes dev/staging/prod via projetos Firebase separados |
| Landing page | não previsto no SDD | Grupo de rotas `(marketing)` no próprio `apps/web`, SSG, servido pelo Firebase Hosting — ver ADR-010 |
| Privacidade / LGPD | "segurança" genérica | Base legal por operação, registro de consentimento (`consents/{uid}`), cookies essenciais + banner informativo, funções de exportação/anonimização — ver ADR-011 |

### 2.2 Por que manter Cloud Functions "callable" para escrita, em vez de deixar o client escrever direto no Firestore

Regra de negócio crítica do SDD (RN-008): *"Resultado objetivo deve ser calculado pelo servidor."* Isso significa que o cálculo de nota **não pode** confiar em Security Rules sozinhas nem em escrita direta do cliente — precisa passar por uma função que roda com Admin SDK. Por isso, operações como `submitAttempt`, `publishActivity` e `joinClassByCode` (que precisa de uma transação atômica para evitar corrida no código único, RN-001) são funções `callable`, enquanto leituras e alguns campos de progresso (RF-013, salvar progresso) podem ser escritos diretamente pelo client, protegidos por regras.

---

## 3. Modelo de dados Firestore (redesenho do modelo relacional)

O modelo relacional do SDD (seção 7 e 18) vira a seguinte estrutura de coleções. Este é o ponto do plano com mais risco de retrabalho se mudar depois — recomendo validar antes da Fase 2.

> **Região:** todos os recursos (Firestore, Functions) são criados em `southamerica-east1` (São Paulo) — decida na Fase 0, porque a localização do Firestore **não pode ser alterada depois**. Reduz latência para usuários no Brasil e diminui a superfície de transferência internacional de dados na análise de LGPD (ADR-011).

```text
users/{uid}
  name, email, role, status, createdAt, updatedAt
  # role é espelhado como custom claim no token; o documento é a fonte
  # de verdade legível pelo client, o claim é o que as rules verificam

accounts/{accountId}
  status (ACTIVE | SUSPENDED | TRIAL), createdAt
  # novo, ver ADR-009. No MVP, accountId == uid do professor (1:1),
  # mas o portal admin (Fase 8) já encontra uma âncora pronta para
  # suspender/gerenciar contas sem precisar migrar dados depois

consents/{uid}/records/{recordId}
  type (TERMS | PRIVACY_POLICY | COOKIES | GUARDIAN_CONSENT),
  textVersion, grantedAt, grantedByRole, grantedByUid, evidence
  # registro de consentimento exigido pela LGPD (ver ADR-011).
  # GUARDIAN_CONSENT é a declaração do professor de que obteve o
  # consentimento do responsável legal de um aluno menor; `evidence`
  # aponta para o termo assinado guardado pelo professor/escola.
  # gravado só por Cloud Function (callable); documento imutável

enrollmentCodes/{code}
  classId
  # coleção auxiliar só para garantir unicidade (RN-001) e permitir
  # lookup O(1) por código sem precisar de uma query com índice em `classes`

classes/{classId}
  accountId, name, description, enrollmentCode, status, createdAt, updatedAt
  # accountId substitui o antigo teacherId (ver ADR-009) — no MVP o valor
  # é sempre o uid do professor dono da sala, mas o campo já nasce com o
  # nome que suporta "conta" (professor OU futura escola/equipe) sem
  # renomear em produção depois

classes/{classId}/enrollments/{studentId}
  enrollmentType (SELF_ENROLLMENT | TEACHER_ASSIGNED), status, createdAt
  # studentId como ID do documento evita duplicidade (RN-003) sem query extra

activities/{activityId}
  accountId, title, description, type, difficulty, tags[],
  status (DRAFT | READY | ARCHIVED), createdAt, updatedAt
  # repositório de atividades do professor — coleção top-level, NÃO
  # subcoleção da sala (ver ADR-012). É o "conteúdo" da atividade,
  # independente de qualquer turma. `status` aqui é de autoria
  # (rascunho / pronta / arquivada), não de publicação numa sala.

activities/{activityId}/items/{itemId}
  position, prompt, configuration, points

classes/{classId}/assignments/{assignmentId}
  activityId, activityTitle, type, contentSnapshot,
  status (PUBLISHED | CLOSED), position, publishedAt, dueDate,
  allowRetry, maxAttempts,
  resultsPolicy (ON_TEACHER_RELEASE | ON_DUE_DATE | ON_CLOSE),
  resultsReleased, resultsReleasedAt,
  createdAt, updatedAt
  # atribuição de uma atividade a uma sala (ver ADR-012). `contentSnapshot`
  # congela os itens no momento da publicação MAS SÓ A PARTE VISÍVEL AO
  # ALUNO (enunciados, opções) — nunca o gabarito. O professor pode editar
  # a atividade no repositório sem afetar as salas já atendidas.
  # resultsReleased controla a exibição de nota/gabarito ao aluno (ADR-013).

assignmentKeys/{assignmentId}
  classId, gradingConfig   # gabarito + regras de pontuação congelados
  # coleção top-level SEM leitura pelo client (regra: allow read, write: false).
  # só o Admin SDK lê, dentro de submitAttempt, para corrigir. Mantida
  # separada de `contentSnapshot` para que o gabarito nunca trafegue para
  # o aluno junto com o enunciado (ADR-012 + ADR-013).

attempts/{attemptId}
  assignmentId, classId, activityId, studentId, startedAt, submittedAt,
  status, score, maxScore
  # attempts fica top-level (não subcoleção) porque é consultado por
  # studentId em telas diferentes ("meu progresso"). assignmentId é o
  # vínculo principal (max_attempts é contado por assignment, RN-007);
  # classId e activityId são desnormalizados para queries por sala/atividade.

attempts/{attemptId}/answers/{itemId}
  # itemId do ActivityItem como ID do documento — 1 resposta por item
  answerPayload, isCorrect, pointsAwarded, feedback

# Documentos de agregação (para RF-018 / Épico 5, evitar N+1 reads)
classes/{classId}/resultsSummary/{studentId}
  assignmentScores: { [assignmentId]: { score, maxScore, submittedAt, released } }
  # atualizado por Cloud Function após cada avaliação (padrão
  # "aggregation on write", recomendado pela documentação do Firestore
  # para dashboards que hoje seriam GROUP BY no SDD original)
```

### 3.1 Índices compostos necessários (a declarar em `firestore.indexes.json`)

- `activities`: `accountId ASC, status ASC, updatedAt DESC` (listar o repositório de atividades do professor)
- `attempts`: `studentId ASC, assignmentId ASC` (verificar `max_attempts`, RN-007)
- `attempts`: `assignmentId ASC, status ASC` (dashboard do professor + varredura de liberação de resultados, ADR-013)
- `attempts`: `classId ASC, status ASC` (visão geral da sala)
- `classes/{classId}/assignments`: `status ASC, position ASC` (listar atividades da sala em ordem)

### 3.2 Decisões de modelagem (antes em aberto, agora resolvidas — ver `OPEN-QUESTIONS.md`)

- **Atividade reutilizável em várias salas:** resolvido — `Activity` é coleção top-level (`activities/{activityId}`, repositório do professor) e a aplicação numa turma é `classes/{classId}/assignments/{assignmentId}`, com snapshot de conteúdo. Ver **ADR-012**. Isso deixou de ser bloqueio da Fase 3.
- **Liberação de resultados:** resolvido — nota e gabarito só aparecem ao aluno após liberação (`resultsReleased` no assignment). Ver **ADR-013**.
- **Atividades sem peso no MVP:** confirmado — sem campo `weight`; `resultsSummary` usa soma simples de `score`/`maxScore`.
- **Nota:** confirmado — `score` (pontos) e `maxScore` guardados; percentual é derivado na exibição.
- `teacherId` → `accountId` em `classes` e `activities` (ver ADR-009) — decisão de baixo custo, já incorporada.
- Exclusão de conta (RF-020) **anonimiza** `attempts`/`answers` em vez de apagar: `studentId` vira um token não reversível e os identificadores diretos saem, preservando as agregações de `resultsSummary` — ver ADR-011.

---

## 4. Autorização (RBAC) em Firestore Security Rules

Mapeamento direto das permissões da seção 15 do SDD para regras:

```text
match /classes/{classId} {
  allow read: if isAccountOwner(classId) || isEnrolledStudent(classId);
  allow create: if hasRole('teacher');
  allow update, delete: if isAccountOwner(classId);
}

match /activities/{activityId} {
  allow read, write: if resource.data.accountId == request.auth.uid && hasRole('teacher');
  allow create: if request.resource.data.accountId == request.auth.uid && hasRole('teacher');
  // alunos NÃO leem `activities` — leem o `contentSnapshot` do assignment (ADR-012)
}

match /classes/{classId}/assignments/{assignmentId} {
  allow read: if isAccountOwner(classId)
              || (isEnrolledStudent(classId) && resource.data.status == 'PUBLISHED');
  allow write: if isAccountOwner(classId); // publicar/fechar; releaseResults via callable
}

match /attempts/{attemptId} {
  allow read: if resource.data.studentId == request.auth.uid
              || isAccountOwnerOfClass(resource.data.classId);
  allow create: if hasRole('student'); // validação de regras de negócio (max_attempts) fica na Cloud Function
  allow update: if false; // toda escrita de submissão/avaliação passa por Cloud Function com Admin SDK
}

match /consents/{uid}/records/{recordId} {
  allow read: if request.auth.uid == uid || hasRole('admin');
  allow write: if false; // gravado só por Cloud Function (callable) no aceite — registro imutável
}

match /assignmentKeys/{assignmentId} {
  allow read, write: if false; // gabarito congelado — só Admin SDK dentro de submitAttempt
}
```

Pontos importantes:

- **O gabarito nunca é legível pelo client.** Fica em `assignmentKeys/{assignmentId}` (fechado para todos) e o `contentSnapshot` do assignment carrega só o enunciado. Isso é o que sustenta o ADR-013 — o aluno não consegue ler a resposta certa antes da liberação nem inspecionando o Firestore.
- **Nenhuma regra escreve `score`/`isCorrect` diretamente.** Essas escritas só acontecem via Admin SDK dentro da função `submitAttempt`, que ignora as rules — isso é o que garante RN-008.
- Custom claims (`role`) são definidas por uma Cloud Function `onUserCreate`/`onCall setRole` (apenas admin pode promover; no MVP, todo cadastro define o papel no próprio formulário de registro e a função apenas espelha o valor como claim).
- Testar as regras com o **Firestore Emulator + `@firebase/rules-unit-testing`** é obrigatório antes de cada deploy (RNF-002, RNF-005).

---

## 5. Activity Engine no modelo serverless

A ideia conceitual da seção 8 do SDD (Builder / Renderer / Validator / ScoreCalculator por tipo de atividade) se mantém, mas muda de lugar:

```text
ActivityType
├── Builder          -> componente React (frontend), um por tipo
├── Renderer          -> componente React (frontend), um por tipo
├── Validator          -> função pura em functions/src/activity-types/{type}.ts
└── ScoreCalculator     -> função pura em functions/src/activity-types/{type}.ts
```

Cada tipo (fill-in-blanks, meaning matching, translation, multiple choice) implementa uma interface comum `ActivityTypeHandler { validate(config), toStudentContent(config), score(answer, gradingConfig) }`, registrada num mapa `type -> handler` dentro das Cloud Functions:

- `validate(config)` — usada no repositório do professor e no `publishAssignment` (RN-006);
- `toStudentContent(config)` — separa o que vai para o `contentSnapshot` (enunciado) do que vai para `assignmentKeys` (gabarito), ver ADR-012;
- `score(answer, gradingConfig)` — roda no `submitAttempt` com Admin SDK (RN-008).

Isso preserva o requisito RNF-005 (extensibilidade sem alterar o núcleo) mesmo fora de um backend tradicional.

---

## 6. Fases de implementação

Cada fase tem escopo fechado, é testável isoladamente e gera algo demonstrável. As estimativas assumem 1 desenvolvedor full-stack em ritmo sustentável; ajuste conforme o time real.

### Fase 0 — Fundação (1–2 semanas)

- Criar 3 projetos Firebase: `elp-dev`, `elp-staging`, `elp-prod`, **todos com Firestore/Functions na região `southamerica-east1`** (irreversível — ver seção 3).
- Aceitar o Adendo de Tratamento de Dados (DPA) do Google Cloud em cada projeto e arquivar a evidência em `docs/lgpd/dpa/`.
- Estruturar monorepo: `apps/web` (Next.js, incluindo o grupo de rotas `(marketing)` da landing — ADR-010), `functions/`, `docs/`.
- Configurar Firebase Emulator Suite (Auth, Firestore, Functions, Hosting) para desenvolvimento local sem custo.
- Pipeline CI (GitHub Actions): lint + testes + preview channel do Firebase Hosting em cada PR.
- Formalizar as ADRs pendentes (seção 25 do SDD, adaptadas — ver `docs/adr/`).
- Shell da landing page no ar (estrutura + páginas legais como rascunho versionado); conteúdo final fica para a Fase 7.
- Designar o encarregado (DPO) e abrir o RIPD (`docs/lgpd/ripd.md`) como documento vivo.
- **Critério de saída:** `firebase emulators:start` sobe os 4 serviços, um "hello world" do Next.js conversa com o emulador de Auth, e `elp-dev` está confirmado na região correta.

### Fase 1 — Identity & Access (2–3 semanas)

- Cadastro/login/logout via Firebase Authentication (email/senha).
- Cloud Function que espelha `role` escolhido no cadastro como custom claim.
- Documento `users/{uid}` criado automaticamente no cadastro.
- Telas de registro/login/logout (RF-001, RF-002).
- Age gate no cadastro do aluno e fluxo de vínculo de aluno menor pelo professor/escola (RF-021).
- Textos legais versionados (`apps/web/content/`) e função `recordConsent` (callable) gravando `consents/{uid}` no aceite (RF-019).
- Security Rules básicas de `users/{uid}` e `consents/{uid}` (RF-003).
- **Critério de saída:** RF-001 a RF-003, RF-019, RF-021 e UC-001 do SDD passam em teste E2E.

### Fase 2 — Salas / Classes (2 semanas)

- `createClass` (callable) com geração atômica de código único via transação em `enrollmentCodes/{code}` (RN-001).
- `joinClassByCode` (callable), validando sala ativa (RN-002) e não-duplicidade (RN-003).
- Inscrição manual pelo professor, incluindo o fluxo de aluno menor (declaração de consentimento do responsável — RF-021, ADR-011).
- Portal do professor: listar salas, ver alunos inscritos.
- Portal do aluno: listar salas, entrar por código.
- Rascunho do guia de onboarding/suporte manual (`docs/operations/onboarding-mvp.md`) — sem portal admin no MVP.
- **Critério de saída:** UC-002 e UC-003 do SDD completos, RN-001 a RN-004 cobertos por teste de regras.

### Fase 3 — Repositório de atividades + Activity Engine + 4 tipos do MVP (5–7 semanas, a maior fase)

- **Repositório de atividades do professor** (`activities/{activityId}` + `items`), máquina de estados de autoria DRAFT → READY → ARCHIVED (ADR-012).
- **Atribuição por sala:** `publishAssignment` (callable) que valida a configuração (RN-006), congela `contentSnapshot` (enunciado) e `assignmentKeys` (gabarito), e cria `classes/{classId}/assignments/{assignmentId}` — a mesma atividade pode ser atribuída a N salas (RN-012).
- Máquina de estados do assignment: PUBLISHED → CLOSED (RF-011).
- Builder + Renderer para os 4 tipos do MVP: fill-in-blanks, meaning matching, translation/localization, multiple choice (seção 9.1–9.4 do SDD).
- Handlers `validate` / `toStudentContent` / `score` por tipo nas Cloud Functions.
- **Critério de saída:** UC-004 e UC-005 completos; professor cria uma atividade de cada tipo no repositório e a atribui a duas salas distintas.

### Fase 4 — Execução e Avaliação — Attempts (3–4 semanas)

- `createAttempt` (callable) sobre um `assignment`, aplicando RN-005 (só assignment `PUBLISHED`) e RN-007 (`max_attempts` contado por assignment).
- Salvar progresso: escrita direta e incremental do client em `attempts/{id}` enquanto `status == IN_PROGRESS`, protegida por regra que impede editar após submissão.
- `submitAttempt` (callable) → lê `assignmentKeys` via Admin SDK, calcula `score` e `answers` server-side (RN-008), grava com `status = GRADED`. **Não retorna nota nem gabarito ao aluno se `resultsReleased == false`** (ADR-013, RN-011).
- `releaseAssignmentResults` (callable) para o professor liberar; Cloud Function agendada para a política `ON_DUE_DATE`.
- Tela de resultado do aluno (RF-017): mostra "enviado — aguardando liberação" ou o resultado completo, conforme `resultsReleased`; respeita RN-009.
- **Critério de saída:** UC-006 completo; fluxo E2E "aluno resolve → submete → (professor libera) → aluno vê nota"; antes da liberação, nota e gabarito não trafegam para o aluno nem via Firestore direto.

### Fase 5 — Analytics / Resultados do professor (2 semanas)

- Cloud Function que atualiza `classes/{classId}/resultsSummary/{studentId}` (indexado por `assignmentId`) a cada avaliação (padrão de agregação em escrita).
- Telas de acompanhamento por sala/atividade/aluno (RF-018), respeitando RN-010 — o professor vê os resultados da turma independentemente da liberação para os alunos.
- **Critério de saída:** UC-007 completo sem necessidade de ler todos os `attempts` no client.

### Fase 6 — Observabilidade, Segurança, Privacidade e Hardening (2–3 semanas)

- Cloud Logging estruturado + Error Reporting nas Cloud Functions (RNF-006).
- App Check habilitado (proteção contra abuso das funções `callable`).
- Revisão completa de Security Rules + suíte de testes de regras.
- Auditoria de acessibilidade (RNF-007): navegação por teclado, contraste, labels — especialmente nos exercícios de drag-and-drop.
- Funções `exportUserData` e `deleteUserData` (anonimização de `attempts`/`answers`) e telas de direitos do titular no portal (RF-020).
- Componente `<CookieConsent>` (categorias necessário/analytics/marketing; só "necessário" ativo no MVP) + página `/cookies` (RF-019).
- Cloud Function agendada `purgeExpiredData` aplicando a política de retenção (ADR-011).
- Preencher o registro das operações de tratamento (`docs/lgpd/registro-de-tratamento.md`).
- Testes E2E cobrindo o cenário da seção 21 do SDD (Playwright).
- **Critério de saída:** todos os itens da seção 22 (Critérios de Aceitação do MVP) do SDD verificados, incluindo o grupo "Privacidade e conformidade".

### Fase 7 — Beta / Lançamento do MVP

- Deploy em `elp-prod`, domínio customizado no Firebase Hosting.
- Conteúdo final da landing page e revisão jurídica dos textos legais (Política de Privacidade, Termos, Cookies).
- **RIPD concluído, revisado e assinado — bloqueio de go-live** (tratamento de dados de menores exige, ver ADR-011).
- Plano de resposta a incidentes documentado e canal do encarregado publicado.
- Guia de onboarding/suporte (`docs/operations/onboarding-mvp.md`) finalizado e material de apoio entregue aos professores piloto.
- Onboarding de professores piloto.
- Monitoramento ativo na primeira semana (Cloud Monitoring + alertas).

### Fases seguintes (pós-MVP, mapeadas do roadmap original do SDD seção 24)

| Fase original do SDD | Reinterpretação no contexto Firebase |
|---|---|
| Fase 2 — Learning Experience | Cloud Storage para anexos de leitura/escrita; múltiplas tentativas já suportado desde a Fase 4; histórico via `attempts` já existente |
| Fase 3 — Content Platform | Coleções `vocabularyBank`, `textBank` com tags e níveis CEFR; possível uso de Firestore + Algolia/Typesense para busca (Firestore não tem full-text nativo) |
| Fase 4 — Intelligence | Cloud Functions chamando um provedor de IA (ex.: Vertex AI / API externa) para geração assistida e correção de escrita |

---

## 7. Visão de produto — SaaS multi-tenant e portal admin (pós-MVP)

Detalhamento do ADR-009. Esta seção é roadmap, não escopo das Fases 0–7 — existe para que as decisões de dados tomadas agora (`accountId`, `accounts/{accountId}`) não precisem ser desfeitas quando esta fase começar.

### Fase 8 — Admin & Operação SaaS

- **Portal admin real:** papel `admin` ganha UI própria (hoje é só suporte via console/Admin SDK, conforme `OPEN-QUESTIONS.md`).
- **Provisionamento de professores independentes:** fluxo de aprovação/onboarding de novo `accounts/{accountId}` — pode ser self-service (cadastro aberto já é o default do MVP) ou com aprovação manual do admin, a decidir quando esta fase começar.
- **Suporte:** visão read-only das salas/atividades de um professor para diagnóstico, sempre com registro de auditoria (RNF-006 já pede auditoria de operações relevantes) — nunca acesso silencioso aos dados de um professor.
- **Gestão de contas:** suspender/reativar `accounts/{accountId}.status`, sem apagar dados.
- **Métricas de plataforma:** professores ativos, salas ativas, atividades concluídas — já listadas como "métricas futuras" na seção 20 do SDD, agora com dono claro (o portal admin).
- **Preparação para cobrança (sem implementar cobrança):** `accounts/{accountId}.status` como campo que futuramente acomoda `TRIAL`/`ACTIVE`/`PAST_DUE`/etc., sem integrar um provedor de pagamento agora (fora do MVP por decisão explícita do SDD original, seção 1.4).

### Evolução opcional — múltiplos professores por conta (escolas/equipes)

Se a demanda comercial pedir que uma "conta" represente uma escola com vários professores (não decidido — ver `OPEN-QUESTIONS.md`, "Haverá colaboração entre professores?"), o caminho de migração é aditivo, não destrutivo, graças ao ADR-009:

```text
accounts/{accountId}/members/{uid}
  role (OWNER | TEACHER), addedAt
```

`classes/{classId}.accountId` não muda; só passa a ser validado contra `accounts/{accountId}/members` em vez de `accountId == uid` diretamente. Isso é o benefício concreto de ter renomeado `teacherId` para `accountId` desde a Fase 0, em vez de esperar o portal admin existir.

---

## 8. Estrutura de repositório proposta

```text
elp/
├── apps/
│   └── web/                 # Next.js (Teacher Portal + Student Portal)
│       ├── app/(marketing)/  # landing page pública + páginas legais (ADR-010)
│       └── content/          # textos institucionais e legais em MDX, versionados
├── functions/
│   └── src/
│       ├── auth/             # onUserCreate, custom claims, recordConsent
│       ├── classes/          # createClass, joinClassByCode
│       ├── activities/       # publishAssignment, releaseAssignmentResults, activity-types/*
│       ├── attempts/         # createAttempt, submitAttempt, evaluate
│       └── privacy/          # exportUserData, deleteUserData, purgeExpiredData (ADR-011)
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── docs/
│   ├── SDD.md                 # este documento de origem
│   ├── IMPLEMENTATION-PLAN.md # este arquivo
│   ├── OPEN-QUESTIONS.md      # registro das decisões (antes: questões em aberto)
│   ├── lgpd/                  # RIPD, registro de tratamento, evidências de DPA (ADR-011)
│   ├── operations/            # guia de onboarding e suporte do MVP
│   └── adr/
│       ├── 0001-arquitetura-serverless-firebase.md
│       ├── ... (0002 a 0009)
│       ├── 0010-landing-page-e-site-institucional.md
│       ├── 0011-conformidade-com-a-lgpd.md
│       ├── 0012-atividade-reutilizavel-e-atribuicao-por-sala.md
│       └── 0013-liberacao-controlada-de-resultados.md
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

> Nesta etapa entreguei apenas os documentos de planejamento (`docs/`), sem o scaffold de código (`apps/`, `functions/`), conforme combinado. A estrutura acima é a referência para quando o scaffold for gerado.

---

## 9. Dependências e riscos

- **Bloqueio resolvido:** as "Questões em Aberto" do SDD foram respondidas (ver `docs/OPEN-QUESTIONS.md`). As decisões de maior impacto — atividade reutilizável em várias salas (ADR-012) e liberação controlada de resultados (ADR-013) — já estão refletidas nas seções 3 a 6.
- **Risco de conteúdo duplicado:** o `contentSnapshot` por assignment (ADR-012) multiplica o armazenamento do enunciado pelo número de salas. Aceitável na escala do MVP; se pesar, mover para subcoleção `assignments/{id}/items`.
- **Risco técnico:** Firestore não tem transações que abranjam mais que 500 documentos nem full-text search nativo — relevante já a partir da Fase 3 (banco de vocabulário/textos, Fase 3 do roadmap).
- **Risco de custo:** Cloud Functions com muitas invocações (ex.: salvar progresso a cada resposta) pode gerar custo relevante em escala — mitigar com debounce no client antes de escrever, e mover para escrita direta protegida por regra (já contemplado na Fase 4).
- **Risco de produto:** construir o portal admin (Fase 8) cedo demais, antes de haver professores pagantes reais, tende a ser esforço mal direcionado — o ADR-009 resolve o essencial (nomenclatura de dados) a custo baixo agora exatamente para permitir adiar a Fase 8 sem custo de migração depois.
- **Risco jurídico (LGPD):** tratar dados de alunos menores sem base legal clara, sem consentimento do responsável e sem RIPD é exposição direta desde o primeiro usuário real. Mitigação: RIPD aberto na Fase 0, consentimento registrado desde a Fase 1, RIPD assinado como bloqueio de go-live na Fase 7 (ADR-011).
- **Risco irreversível:** a região do Firestore não muda depois de criada. Escolher `southamerica-east1` na Fase 0; um projeto criado na região errada precisa ser recriado do zero.
- **Risco de cronograma:** a revisão jurídica dos textos legais e do RIPD é caminho crítico para a Fase 7 e depende de terceiro (advogado/consultoria) — contratar cedo.

---

## 10. Próximos passos imediatos

1. Questões em aberto respondidas (ver `docs/OPEN-QUESTIONS.md`) — modelo de dados e fases já atualizados (ADR-012, ADR-013).
2. Repositório GitHub sincronizado: `https://github.com/GScandelari/ELP.git`.
3. Redigir o termo simples de consentimento (professor, aluno, responsável) — sem equipe jurídica agora; endurecer pós-MVP (decisão registrada em `OPEN-QUESTIONS.md`).
4. Designar o encarregado (DPO) e abrir o RIPD como documento vivo em `docs/lgpd/`.
5. Iniciar Fase 0, criando os projetos Firebase já em `southamerica-east1` e usando `accountId` no schema desde o primeiro commit de código.
