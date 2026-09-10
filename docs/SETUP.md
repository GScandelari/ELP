# Setup de desenvolvimento — ELP

Monorepo pnpm: `apps/web` (Next.js) + `functions` (Cloud Functions) + `docs`.

> **Local do repositório:** `C:\dev\elp` — **não** manter dentro do OneDrive.
> A sincronização de `node_modules/` e `.next/` corrompe o cache do bundler do
> Next.js a cada troca de branch.

## Pré-requisitos

| Ferramenta | Versão | Observação |
| --- | --- | --- |
| Node.js | 20–22 LTS (`.nvmrc` = 22) | a máquina pode ter versão mais nova; funciona |
| pnpm | 9 | `corepack enable pnpm` |
| Java (JDK) | 17+ | necessário para o Firebase Emulator Suite |
| Firebase CLI | vem como devDependency (`pnpm firebase ...`) ou instale global |

## Primeiro uso (local, só emuladores — não precisa de projeto Firebase)

```bash
corepack enable pnpm
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # já vem apontando para os emuladores

# terminal 1 — sobe Auth (9099), Firestore (8080), Functions (5001) + UI em :4000
pnpm emulators

# terminal 2 — Next.js em http://localhost:3000
pnpm dev
```

O build de Functions roda antes: `pnpm --filter @elp/functions build` (ou
`pnpm build`). O emulador de Hosting (Next.js via integração de frameworks) não
sobe por padrão — no dia a dia use `pnpm dev`.

**Critério de saída da Fase 0:** abrir `http://localhost:3000`, a home deve
mostrar *"Emulador de Auth (127.0.0.1:9099): conectado ✓"*, e
`http://127.0.0.1:5001/demo-elp/southamerica-east1/ping` deve responder
`{ "status": "ok", ... }`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Next.js em modo desenvolvimento |
| `pnpm emulators` | Firebase Emulator Suite |
| `pnpm build` | build de todos os pacotes |
| `pnpm lint` / `pnpm typecheck` | qualidade |
| `pnpm test` | testes unitários (Vitest) |
| `pnpm test:rules` | testes das Security Rules (sobe o emulador de Firestore) |
| `pnpm test:e2e` | testes E2E (Playwright) — sobe emuladores + Next dev e roda o cenário cadastro→login |

## Quando os projetos Firebase existirem

1. Criar `elp-dev`, `elp-staging`, `elp-prod` **na região `southamerica-east1`**
   (irreversível), com plano Blaze e alerta de orçamento.
2. `pnpm firebase login`
3. Conferir/ajustar os IDs em `.firebaserc`.
4. `pnpm firebase experiments:enable webframeworks` (integração Next.js + Hosting).
5. Preencher `apps/web/.env.local` com a config do app web do `elp-dev` e
   `NEXT_PUBLIC_USE_EMULATORS=false` para testar contra o projeto real.
6. Aceitar o DPA do Google Cloud em cada projeto e salvar a evidência em
   `docs/lgpd/dpa/`.

## CI/CD

- `.github/workflows/ci.yml` — job `build` (lint, typecheck, testes, build,
  testes de rules) e job `e2e` (Playwright) em cada PR e push na `main`.
- `.github/workflows/deploy.yml` — preview por PR e deploy para `elp-staging` no
  merge. **Inativo até** criar os secrets `FIREBASE_SERVICE_ACCOUNT_STAGING` e
  `FIREBASE_SERVICE_ACCOUNT_PROD`. Produção é deploy manual/tagueado (ADR-008).

## Estrutura

```
apps/web/
  app/(marketing)/     landing + páginas legais (ADR-010)
  content/*.md          textos institucionais/legais (renderizados com marked)
  components/, lib/
functions/src/          Cloud Functions (health, auth/finalize-signup)
firestore.rules         Security Rules (ADR-005/012/013/014)
firestore.indexes.json  índices compostos
tests/rules/            testes de Security Rules (Vitest + rules-unit-testing)
e2e/                    testes E2E (Playwright)
```
