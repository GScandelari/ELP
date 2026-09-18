# Plano detalhado — Fase 6: Observabilidade, Segurança, Privacidade e Hardening

**Branch base:** `main` (Fase 5 fechada, PR #31) · **Referência:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) §6 (Fase 6) · [`SDD.md`](./SDD.md) RNF-006, RNF-007, RF-019 a RF-021, seções 21-22 · [`ADR-011`](./adr/0011-conformidade-com-a-lgpd.md) · [`docs/lgpd/`](./lgpd/)

---

## 1. Objetivo e critério de saída

Fechar os requisitos não-funcionais que o MVP ainda deve antes do lançamento (Fase 7): direitos do titular (RF-020) de verdade — exportar e excluir dados pelo portal —, observabilidade nas Cloud Functions que tratam dado sensível, App Check, uma revisão completa das Security Rules acumuladas desde a Fase 0, uma auditoria de acessibilidade, e os artefatos de LGPD que ainda estão como rascunho (`registro-de-tratamento.md`, `politica-de-retencao.md`).

**Critério de saída** (do IMPLEMENTATION-PLAN): todos os itens da seção 22 do SDD (Critérios de Aceitação do MVP) verificados, incluindo o grupo "Privacidade e conformidade".

**Fora de escopo** (não são tarefas de engenharia, não bloqueiam o fechamento desta fase):
- Revisão jurídica dos textos legais e do RIPD — bloqueio da **Fase 7**, depende de terceiro.
- Aceite do DPA do Google Cloud e arquivamento em `docs/lgpd/dpa/` — ação administrativa no console, não em código; nota como pendência aberta (§10).
- Nome/CNPJ da controladora nos textos legais — mesma natureza, mesma nota.

---

## 2. O achado desta fase — antes de escrever qualquer linha

Boa parte do grupo "Privacidade e conformidade" da seção 22 do SDD **já está pronta**, entregue organicamente nas Fases 1-2 sem ter sido contabilizada como tal:

- ✅ Landing page + `/privacidade`, `/termos`, `/termo-responsavel`, `/cookies` já existem.
- ✅ `CookieNotice` (banner informativo, sem opt-in) já cobre RF-019 — decisão do MVP é "só cookies essenciais, sem rastreamento" (`OPEN-QUESTIONS.md`), então não há nada pra um usuário consentir/recusar.
- ✅ Cadastro já exige aceite de Termos + Política de Privacidade (checkbox não pré-marcado) e grava em `consents/{uid}/records` com versão do texto e data/hora (`finalize-signup.ts`).
- ✅ RF-021 (idade, consentimento do responsável) completo desde a Fase 2.

**Discrepância encontrada:** o `ADR-011` §7 descreve um componente `<CookieConsent>` com categorias necessário/analytics/marketing e um `ConsentContext` — nunca construído; o que existe é o `CookieNotice`, mais simples. Confirmado com o usuário: sem nenhum script de analytics/marketing planejado pro MVP, a arquitetura de categorias não teria o que fazer — é complexidade sem uso real. O `ADR-011` §7 é atualizado nesta fase pra refletir a implementação real, em vez de construir o componente maior.

Isso reduz o escopo real da fase a: **RF-020 (direitos do titular) de ponta a ponta**, **observabilidade**, **App Check**, **revisão de rules**, **acessibilidade**, e **fechar os documentos de LGPD ainda em rascunho**.

---

## 3. Modelo de dados — novidades

```
auditLog/{logId}
  uid, action, timestamp, ip
  # trilha de auditoria das operações sensíveis desta fase (RNF-006,
  # registro-de-tratamento.md item 5) - só exportUserData/deleteUserData
  # escrevem aqui; sem leitura pelo client (console/Admin SDK só).
  # Retenção: 6 meses (purgeExpiredData).
```

Nenhuma mudança nas coleções existentes além de:
- `users`/`accounts`: ganham um estado "anonimizado" após `deleteUserData` (nome/e-mail substituídos por placeholder; ver §4.2).
- `attempts`/`answers`/`attemptResults`: `studentId` substituído por um token não reversível na anonimização (ADR-011 §4) — `resultsSummary` já é uma agregação e não referencia identificadores diretos, então não muda.

---

## 4. Backend — Cloud Functions

### 4.1 `exportUserData` (callable)

Reúne os dados do **próprio** usuário autenticado (portabilidade, Art. 18) e devolve como JSON: conta, matrículas/salas (como aluno) ou salas/atividades (como professor), tentativas/respostas/resultados (como aluno) — **sem gate por `resultsReleased`**: é o titular pedindo os próprios dados brutos, não a experiência pedagógica da RN-011, que é uma regra de exibição em sala de aula, não de direito de portabilidade. Grava uma entrada em `auditLog`.

### 4.2 `deleteUserData` (callable)

Anonimiza **imediatamente** (sem período de carência — "exclusão = anonimização", ADR-011 §4):
- **Aluno:** `studentId` nos próprios `attempts`/`answers`/`attemptResults` vira um token não reversível; nome/e-mail no `enrollments`/`users` são substituídos por um placeholder. `resultsSummary` (agregado, sem identificador direto) não muda.
- **Professor:** identificadores diretos da própria conta (`users`/`accounts`) são substituídos por um placeholder. **Salas/atividades/assignments não são apagados nem anonimizados** — pertencem à relação educacional em andamento e ainda servem alunos matriculados; a alternativa (cascatear exclusão pelas turmas) afetaria dados de terceiros (os alunos) e foge do escopo de "excluir os *meus* dados". Fica registrado como limitação conhecida (§10).

Grava uma entrada em `auditLog`. Depois de rodar, a sessão do usuário é revogada (Firebase Auth) e a conta não pode mais logar.

### 4.3 `purgeExpiredData` (scheduled, `every 24 hours`)

Só cuida de expiração **baseada em tempo absoluto**, não em ação do usuário (isso já é `deleteUserData`, síncrono):
- `auditLog`: apaga entradas com mais de 6 meses.
- `consents/*/records`: apaga registros de contas já anonimizadas com mais de 5 anos desde a anonimização (mantém intacto o registro de contas ativas — é a prova do consentimento enquanto a conta existir).

Mesmo padrão de testabilidade já usado (`releaseResultsOnDueDateOnce`, `aggregateResultOnce`): lógica pura exportada + wrapper do scheduler.

### 4.4 Logging estruturado (RNF-006) — escopo confirmado com o usuário

Só nas Cloud Functions que tratam dado sensível a LGPD: `exportUserData`, `deleteUserData`, `purgeExpiredData`, `joinClassByCode`, `addStudentToClass` (essas duas últimas já lidam com consentimento/idade de menor). Usa `firebase-functions/logger` (structured logging nativo, chega em Cloud Logging automaticamente) com `uid`/ação/resultado; erros usam `logger.error` com o `HttpsError` original, o que já aciona o Cloud Error Reporting sem configuração adicional. As ~14 Cloud Functions restantes mantêm o logging padrão do runtime (suficiente pro MVP, decisão confirmada).

---

## 5. Security Rules

### 5.1 `auditLog`

```
match /auditLog/{logId} {
  allow read, write: if false; // só Admin SDK (exportUserData/deleteUserData/purgeExpiredData)
}
```

### 5.2 Revisão completa (sem mudança de comportamento esperada)

Passar a régua em todo o `firestore.rules` acumulado desde a Fase 0, com foco em:
- Toda regra de `list` bate num campo de `resource.data` que também é `where()` da query real (a lição repetida a cada fase deste projeto) — checagem cruzada com o que o client de fato consulta em `apps/web/lib/*.ts`.
- Nenhuma coleção sensível (gabarito, nota antes da liberação, dado de menor) com uma regra mais permissiva do que o necessário.
- Cobertura de teste: toda `match` tem pelo menos um caso de "nega" e um de "permite" em `tests/rules/`.

Qualquer gap encontrado vira ajuste de regra + teste nesta mesma PR (§9, PR 6.6) — não é esperado achar nada grande (cada fase já revisou a régua na hora de escrever), mas é a primeira vez que alguém olha o arquivo inteiro de uma vez desde a Fase 3.

---

## 6. Frontend

- **`/conta`** (nova rota, ambos os papéis): "Meus dados" — botão "Exportar meus dados" (baixa o JSON de `exportUserData`) e "Excluir minha conta" (confirmação dupla — é irreversível — chama `deleteUserData`, desloga). Link a partir do `UserMenu` (cabeçalho, já presente em toda página autenticada).
- Sem tela de "corrigir cadastro" dedicada nesta fase — nome/e-mail já são editáveis onde fazem sentido hoje (perfil vem do próprio Firebase Auth); criar uma tela de edição de perfil sem nenhum campo além do que já existe seria tela por tela, não requisito novo.
- `CookieNotice`: sem mudança de código, só o ajuste de texto no `ADR-011` §7 (achado, §2).

---

## 7. O que dá (e o que não dá) para testar de verdade

- `exportUserData`/`deleteUserData`/`purgeExpiredData`: testáveis por integração (semeando dados e conferindo o que sai/o que vira placeholder), mesmo padrão de todas as fases anteriores.
- Acessibilidade automatizada (`@axe-core/playwright`): roda como uma asserção a mais dentro dos specs E2E já existentes (não precisa de specs novos) — pega problemas estruturais (contraste, labels ausentes, roles) nas telas que os testes já visitam.
- App Check: **não dá pra testar de ponta a ponta no emulador da forma como o projeto já testa hoje** — o emulador aceita tokens de teste, então a suíte de rules/functions continua passando sem token real; a validação de que o enforcement bloqueia de verdade fica pra verificação manual em `staging` (mesmo padrão que "preview"/"staging" já usam no CI).
- Revisão de rules: nenhum teste novo *dedicado*, os achados (se houver) ganham teste dentro do arquivo de rules já existente daquela coleção.

---

## 8. Decisões — confirmadas

1. ✅ **App Check:** o usuário registra a chave reCAPTCHA no console do Firebase; a integração do SDK (web) e o enforcement nas Cloud Functions ficam pra quando a chave existir (PR 6.5 só fecha depois disso — ver riscos, §10).
2. ✅ **Logging estruturado só nas Cloud Functions sensíveis a LGPD** (§4.4) — não em todas as ~19.
3. ✅ **Acessibilidade: automatizado (`@axe-core/playwright`) + checklist manual dirigido** (teclado nos formulários de resolução de atividade, contraste) — não só manual.
4. ✅ **`CookieNotice` atual fica como está; `<CookieConsent>` com categorias não é construído** — ADR-011 §7 atualizado pra refletir a implementação real (achado, §2).

---

## 9. Quebra em PRs

| PR | Título | Entrega |
|---|---|---|
| **6.1** | `feat(privacy): exportUserData + deleteUserData` | Callables (§4.1/4.2) + `auditLog` (rules + escrita) + testes de integração |
| **6.2** | `feat(web): tela de direitos do titular` | Rota `/conta` (exportar/excluir), link no `UserMenu`; E2E: aluno exporta e exclui a própria conta |
| **6.3** | `feat(privacy): purgeExpiredData + política de retenção` | Scheduled function (§4.3) + `docs/lgpd/politica-de-retencao.md` preenchido; teste de integração |
| **6.4** | `feat(functions): logging estruturado nas Cloud Functions sensíveis` | `firebase-functions/logger` nas 5 functions do §4.4 |
| **6.5** | `feat(web): App Check` | SDK integrado + enforcement — **depende da chave reCAPTCHA do usuário** (decisão 1, §8); se a chave não chegar a tempo, a fase fecha sem esta PR e ela vira item avulso antes da Fase 7 |
| **6.6** | `fix(rules): revisão completa de Security Rules` | Passagem por todo `firestore.rules` (§5.2); ajustes + testes onde achar gap |
| **6.7** | `test(a11y): auditoria de acessibilidade` | `@axe-core/playwright` nos specs E2E existentes + checklist manual; correções onde forem baratas |
| **6.8** | `docs(lgpd): registro de tratamento + E2E final + fecha a Fase 6` | `docs/lgpd/registro-de-tratamento.md` atualizado (novas operações desde a Fase 4: attempts/attemptResults/resultsSummary/auditLog); E2E cobrindo o cenário da seção 21 do SDD de ponta a ponta; `IMPLEMENTATION-PLAN.md` marcado ✅ |

Ordem sequencial solta: 6.1 é pré-requisito de 6.2 e 6.3; as demais (6.4-6.7) são independentes entre si; 6.8 fecha depois de tudo.

---

## 10. Riscos

- **App Check depende de uma ação externa do usuário** (registrar a chave no console) — é o único item desta fase que não está 100% sob controle da implementação. Mitigado deixando-o como a última PR antes do fechamento (6.5, não bloqueia 6.1-6.4/6.6-6.8) — se a chave não chegar a tempo, a Fase 6 fecha sem ele e vira pendência isolada antes da Fase 7, não trava o resto.
- **Exclusão de professor não cascateia pras salas/atividades** (§4.2) — decisão de escopo documentada, não um bug, mas é uma limitação real do "excluir minha conta" pro papel professor que vale registrar no RIPD antes do go-live (Fase 7).
- **`dpa/` (evidência do DPA do Google) e revisão jurídica dos textos** — ações administrativas fora do que este plano de engenharia cobre; ficam como pendência explícita, não bloqueiam o fechamento da Fase 6 (só a Fase 7).

---

## 11. Checklist de conclusão da fase

- [x] `exportUserData`/`deleteUserData` funcionando, com `auditLog` e teste de integração (PR 6.1)
- [x] `/conta`: aluno e professor conseguem exportar e excluir os próprios dados pelo portal (PR 6.2)
- [x] `purgeExpiredData` aplicando a política de retenção (§4.3), com `docs/lgpd/politica-de-retencao.md` preenchido (PR 6.3)
- [x] Logging estruturado nas 5 Cloud Functions sensíveis a LGPD (§4.4) (PR 6.4)
- [x] App Check integrado e habilitado — a chave reCAPTCHA chegou a tempo, sem precisar da pendência isolada do §10 (PR 6.5)
- [x] Revisão completa de Security Rules concluída, sem gap conhecido em aberto (achado real corrigido: `assignments.update` não travava `startedCount`/`firstStartedAt`, o gate de RN-013) (PR 6.6)
- [x] Auditoria de acessibilidade rodada (`@axe-core/playwright` + checklist manual), achados corrigidos (3 achados reais, todos corrigidos) — `docs/acessibilidade.md` (PR 6.7)
- [x] `docs/lgpd/registro-de-tratamento.md` atualizado com as operações desde a Fase 4 (PR 6.8)
- [x] E2E cobrindo o cenário da seção 21 do SDD — já coberto por `e2e/fase-3-fim-a-fim.spec.ts`/`e2e/fase-4-fim-a-fim.spec.ts`, confirmado sem necessidade de spec novo (PR 6.8)
- [x] `docs/IMPLEMENTATION-PLAN.md` — Fase 6 marcada como ✅ (PR 6.8)
