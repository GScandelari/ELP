# Plano de Implementação — ELP (English Learning Platform) sobre Firebase

**Versão:** 0.1.0
**Status:** Draft — depende de validação das questões em aberto (ver seção 8)
**Baseado em:** [`SDD.md`](./SDD.md) v0.1.0
**Objetivo deste documento:** traduzir o SDD original (que sugeria Next.js + FastAPI + PostgreSQL) para uma arquitetura 100% Firebase, e organizar a implementação em fases sequenciais e testáveis.

---

## 1. Por que Firebase muda a arquitetura

O SDD original (seção 5 e 6) propõe um monólito modular com backend próprio em FastAPI e PostgreSQL relacional. Ao adotar Firebase como plataforma, três coisas mudam de forma estrutural e precisam ficar explícitas antes de codificar:

1. **Não existe mais um "backend" único.** A lógica de servidor vira um conjunto de Cloud Functions (gatilhos e funções chamáveis) mais regras declarativas de segurança (Firestore Security Rules). Não há um processo FastAPI rodando continuamente.
2. **O banco deixa de ser relacional.** Firestore é um banco de documentos. O modelo entidade-relacionamento da seção 7 e 18 do SDD precisa ser redesenhado em coleções/subcoleções, com desnormalização deliberada onde fizer sentido (Firestore não tem `JOIN`).
3. **Autenticação e autorização usam primitivas do Firebase.** Login/senha, tokens e sessão passam a ser responsabilidade do Firebase Authentication; o RBAC (seção 15 do SDD) é implementado via *custom claims* no token + regras de segurança, em vez de middleware de aplicação.

Essas mudanças **substituem** as decisões implícitas em ADR-002, ADR-003, ADR-004, ADR-005 e ADR-006 listadas na seção 25 do SDD. Ver `docs/adr/` para o registro formal.

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

### 2.2 Por que manter Cloud Functions "callable" para escrita, em vez de deixar o client escrever direto no Firestore

Regra de negócio crítica do SDD (RN-008): *"Resultado objetivo deve ser calculado pelo servidor."* Isso significa que o cálculo de nota **não pode** confiar em Security Rules sozinhas nem em escrita direta do cliente — precisa passar por uma função que roda com Admin SDK. Por isso, operações como `submitAttempt`, `publishActivity` e `joinClassByCode` (que precisa de uma transação atômica para evitar corrida no código único, RN-001) são funções `callable`, enquanto leituras e alguns campos de progresso (RF-013, salvar progresso) podem ser escritos diretamente pelo client, protegidos por regras.

---

## 3. Modelo de dados Firestore (redesenho do modelo relacional)

O modelo relacional do SDD (seção 7 e 18) vira a seguinte estrutura de coleções. Este é o ponto do plano com mais risco de retrabalho se mudar depois — recomendo validar antes da Fase 2.

```text
users/{uid}
  name, email, role, status, createdAt, updatedAt
  # role é espelhado como custom claim no token; o documento é a fonte
  # de verdade legível pelo client, o claim é o que as rules verificam

enrollmentCodes/{code}
  classId
  # coleção auxiliar só para garantir unicidade (RN-001) e permitir
  # lookup O(1) por código sem precisar de uma query com índice em `classes`

classes/{classId}
  teacherId, name, description, enrollmentCode, status, createdAt, updatedAt

classes/{classId}/enrollments/{studentId}
  enrollmentType (SELF_ENROLLMENT | TEACHER_ASSIGNED), status, createdAt
  # studentId como ID do documento evita duplicidade (RN-003) sem query extra

classes/{classId}/activities/{activityId}
  title, description, type, difficulty, status, position,
  allowRetry, maxAttempts, publishedAt, dueDate, createdAt, updatedAt

classes/{classId}/activities/{activityId}/items/{itemId}
  position, prompt, configuration, points

attempts/{attemptId}
  activityId, classId, studentId, startedAt, submittedAt,
  status, score, maxScore
  # attempts fica top-level (não subcoleção de activity) porque é
  # consultado por studentId em telas diferentes ("meu progresso");
  # classId e activityId são desnormalizados aqui para permitir
  # queries por sala/atividade sem collection group query cara

attempts/{attemptId}/answers/{itemId}
  # itemId do ActivityItem como ID do documento — 1 resposta por item
  answerPayload, isCorrect, pointsAwarded, feedback

# Documentos de agregação (para RF-018 / Épico 5, evitar N+1 reads)
classes/{classId}/resultsSummary/{studentId}
  activityScores: { [activityId]: { score, maxScore, submittedAt } }
  # atualizado por Cloud Function após cada avaliação (padrão
  # "aggregation on write", recomendado pela documentação do Firestore
  # para dashboards que hoje seriam GROUP BY no SDD original)
```

### 3.1 Índices compostos necessários (a declarar em `firestore.indexes.json`)

- `attempts`: `studentId ASC, activityId ASC` (verificar `max_attempts`, RN-007)
- `attempts`: `classId ASC, status ASC` (dashboard do professor)
- `classes/{classId}/activities`: `status ASC, position ASC` (listar atividades publicadas em ordem)

### 3.2 Decisões de modelagem que precisam de validação (ligadas à seção 29 do SDD)

- Se uma atividade puder pertencer a mais de uma sala (pergunta em aberto do SDD), o modelo acima precisa mudar de `classes/{classId}/activities` para uma coleção top-level `activities` com uma subcoleção `activityClasses` — **decisão bloqueante para a Fase 3**, não deve ser assumida.
- Se atividades tiverem peso, o campo `weight` entra em `Activity`; se houver nota percentual **e** pontos, `resultsSummary` precisa guardar os dois.

---

## 4. Autorização (RBAC) em Firestore Security Rules

Mapeamento direto das permissões da seção 15 do SDD para regras:

```text
match /classes/{classId} {
  allow read: if isTeacherOwner(classId) || isEnrolledStudent(classId);
  allow create: if hasRole('teacher');
  allow update, delete: if isTeacherOwner(classId);
}

match /classes/{classId}/activities/{activityId} {
  allow read: if isTeacherOwner(classId)
              || (isEnrolledStudent(classId) && resource.data.status == 'PUBLISHED');
  allow write: if isTeacherOwner(classId);
}

match /attempts/{attemptId} {
  allow read: if resource.data.studentId == request.auth.uid
              || isTeacherOwnerOfClass(resource.data.classId);
  allow create: if hasRole('student'); // validação de regras de negócio (max_attempts) fica na Cloud Function
  allow update: if false; // toda escrita de submissão/avaliação passa por Cloud Function com Admin SDK
}
```

Pontos importantes:

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

Cada tipo (fill-in-blanks, meaning matching, translation, multiple choice) implementa uma interface comum `ActivityTypeHandler { validate(config), score(answer, config) }`, registrada num mapa `type -> handler` dentro das Cloud Functions. Isso preserva o requisito RNF-005 (extensibilidade sem alterar o núcleo) mesmo fora de um backend tradicional.

---

## 6. Fases de implementação

Cada fase tem escopo fechado, é testável isoladamente e gera algo demonstrável. As estimativas assumem 1 desenvolvedor full-stack em ritmo sustentável; ajuste conforme o time real.

### Fase 0 — Fundação (1–2 semanas)

- Criar 3 projetos Firebase: `elp-dev`, `elp-staging`, `elp-prod`.
- Estruturar monorepo: `apps/web` (Next.js), `functions/` (Cloud Functions), `docs/`.
- Configurar Firebase Emulator Suite (Auth, Firestore, Functions, Hosting) para desenvolvimento local sem custo.
- Pipeline CI (GitHub Actions): lint + testes + preview channel do Firebase Hosting em cada PR.
- Formalizar as ADRs pendentes (seção 25 do SDD, adaptadas — ver `docs/adr/`).
- **Critério de saída:** `firebase emulators:start` sobe os 4 serviços e um "hello world" do Next.js conversa com o emulador de Auth.

### Fase 1 — Identity & Access (2–3 semanas)

- Cadastro/login/logout via Firebase Authentication (email/senha).
- Cloud Function que espelha `role` escolhido no cadastro como custom claim.
- Documento `users/{uid}` criado automaticamente no cadastro.
- Telas de registro/login/logout (RF-001, RF-002).
- Security Rules básicas de `users/{uid}` (RF-003).
- **Critério de saída:** RF-001 a RF-003 e UC-001 do SDD passam em teste E2E.

### Fase 2 — Salas / Classes (2 semanas)

- `createClass` (callable) com geração atômica de código único via transação em `enrollmentCodes/{code}` (RN-001).
- `joinClassByCode` (callable), validando sala ativa (RN-002) e não-duplicidade (RN-003).
- Inscrição manual pelo professor.
- Portal do professor: listar salas, ver alunos inscritos.
- Portal do aluno: listar salas, entrar por código.
- **Critério de saída:** UC-002 e UC-003 do SDD completos, RN-001 a RN-004 cobertos por teste de regras.

### Fase 3 — Activity Engine + 4 tipos do MVP (4–6 semanas, a maior fase)

- Estrutura genérica `Activity`/`ActivityItem` no Firestore + máquina de estados DRAFT/PUBLISHED/CLOSED/ARCHIVED (RF-011).
- Builder + Renderer para os 4 tipos do MVP: fill-in-blanks, meaning matching, translation/localization, multiple choice (seção 9.1–9.4 do SDD).
- Validators/ScoreCalculators correspondentes nas Cloud Functions.
- `publishActivity` (callable) validando RN-006 (não publicar configuração inválida).
- **Critério de saída:** UC-004 e UC-005 completos; professor consegue criar, configurar e publicar uma atividade de cada tipo.

### Fase 4 — Execução e Avaliação — Attempts (3 semanas)

- `createAttempt` (callable), aplicando RN-005 (só atividade publicada) e RN-007 (`max_attempts`).
- Salvar progresso: escrita direta e incremental do client em `attempts/{id}` enquanto `status == IN_PROGRESS`, protegida por regra que impede editar após submissão.
- `submitAttempt` (callable) → dispara avaliação server-side via Admin SDK (RN-008), grava `answers`, calcula `score`.
- Tela de resultado para o aluno (RF-017), respeitando RN-009.
- **Critério de saída:** UC-006 completo; fluxo E2E "aluno resolve → submete → recebe nota" funcionando ponta a ponta.

### Fase 5 — Analytics / Resultados do professor (2 semanas)

- Cloud Function que atualiza `classes/{classId}/resultsSummary/{studentId}` a cada avaliação (padrão de agregação em escrita).
- Telas de acompanhamento por sala/atividade/aluno (RF-018), respeitando RN-010.
- **Critério de saída:** UC-007 completo sem necessidade de ler todos os `attempts` no client.

### Fase 6 — Observabilidade, Segurança e Hardening (2 semanas)

- Cloud Logging estruturado + Error Reporting nas Cloud Functions (RNF-006).
- App Check habilitado (proteção contra abuso das funções `callable`).
- Revisão completa de Security Rules + suíte de testes de regras.
- Auditoria de acessibilidade (RNF-007): navegação por teclado, contraste, labels — especialmente nos exercícios de drag-and-drop.
- Testes E2E cobrindo o cenário da seção 21 do SDD (Playwright).
- **Critério de saída:** todos os itens da seção 22 (Critérios de Aceitação do MVP) do SDD verificados.

### Fase 7 — Beta / Lançamento do MVP

- Deploy em `elp-prod`, domínio customizado no Firebase Hosting.
- Onboarding de professores piloto.
- Monitoramento ativo na primeira semana (Cloud Monitoring + alertas).

### Fases seguintes (pós-MVP, mapeadas do roadmap original do SDD seção 24)

| Fase original do SDD | Reinterpretação no contexto Firebase |
|---|---|
| Fase 2 — Learning Experience | Cloud Storage para anexos de leitura/escrita; múltiplas tentativas já suportado desde a Fase 4; histórico via `attempts` já existente |
| Fase 3 — Content Platform | Coleções `vocabularyBank`, `textBank` com tags e níveis CEFR; possível uso de Firestore + Algolia/Typesense para busca (Firestore não tem full-text nativo) |
| Fase 4 — Intelligence | Cloud Functions chamando um provedor de IA (ex.: Vertex AI / API externa) para geração assistida e correção de escrita |

---

## 7. Estrutura de repositório proposta

```text
elp/
├── apps/
│   └── web/                 # Next.js (Teacher Portal + Student Portal)
├── functions/
│   └── src/
│       ├── auth/             # onUserCreate, custom claims
│       ├── classes/          # createClass, joinClassByCode
│       ├── activities/       # publishActivity, activity-types/*
│       └── attempts/         # createAttempt, submitAttempt, evaluate
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── docs/
│   ├── SDD.md                 # este documento de origem
│   ├── IMPLEMENTATION-PLAN.md # este arquivo
│   ├── OPEN-QUESTIONS.md
│   └── adr/
│       ├── 0001-arquitetura-serverless-firebase.md
│       ├── 0002-firestore-como-banco-de-dados.md
│       ├── 0003-cloud-functions-para-logica-de-servidor.md
│       ├── 0004-firebase-authentication-e-custom-claims.md
│       ├── 0005-security-rules-como-camada-de-autorizacao.md
│       ├── 0006-modelagem-de-attempts-e-answers.md
│       ├── 0007-estrategia-drag-and-drop.md
│       └── 0008-estrategia-de-deploy-e-ambientes.md
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

> Nesta etapa entreguei apenas os documentos de planejamento (`docs/`), sem o scaffold de código (`apps/`, `functions/`), conforme combinado. A estrutura acima é a referência para quando o scaffold for gerado.

---

## 8. Dependências e riscos

- **Bloqueio real:** as "Questões em Aberto" da seção 29 do SDD afetam diretamente o modelo de dados da seção 3 deste documento (principalmente: atividade pertencer a múltiplas salas, cálculo de nota, visibilidade de resposta correta). Recomendo fechar essas respostas **antes** de iniciar a Fase 3 — ver `docs/OPEN-QUESTIONS.md` com sugestões de default.
- **Risco técnico:** Firestore não tem transações que abranjam mais que 500 documentos nem full-text search nativo — relevante já a partir da Fase 3 (banco de vocabulário/textos, Fase 3 do roadmap).
- **Risco de custo:** Cloud Functions com muitas invocações (ex.: salvar progresso a cada resposta) pode gerar custo relevante em escala — mitigar com debounce no client antes de escrever, e mover para escrita direta protegida por regra (já contemplado na Fase 4).

---

## 9. Próximos passos imediatos

1. Validar (ou aceitar os defaults sugeridos em `docs/OPEN-QUESTIONS.md`) as questões em aberto que bloqueiam a Fase 3.
2. Confirmar acesso ao repositório GitHub para o primeiro push (estrutura já commitada localmente).
3. Iniciar Fase 0.
