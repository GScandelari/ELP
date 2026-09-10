# ADR-010 — Landing page e site institucional

## Status

Proposto

## Contexto

O SDD trata apenas dos portais autenticados (Professor e Aluno). Para divulgar a plataforma a professores independentes (visão de produto comercial, ver ADR-009), é necessária uma página pública de apresentação, acessível antes de qualquer login. Essa página também é o local natural para os avisos e documentos legais exigidos pela LGPD (Política de Privacidade, Termos de Uso, Política de Cookies — ver ADR-011).

## Decisão

- A landing page é um **grupo de rotas de marketing dentro de `apps/web`** (Next.js App Router, ex.: `app/(marketing)/`), renderizada estaticamente (SSG) e servida pelo Firebase Hosting — **sem um segundo pipeline de build/deploy**.
- Rotas públicas mínimas do MVP:
  - `/` — apresentação do produto e chamada para cadastro de professor;
  - `/privacidade` — Política de Privacidade (ver ADR-011);
  - `/termos` — Termos de Uso;
  - `/cookies` — Política de Cookies.
- Conteúdo institucional e legal em Markdown versionado no repositório (`apps/web/content/`, renderizado no servidor com `marked`), **não** em CMS — toda alteração de texto legal passa por Pull Request e revisão.
- SEO básico: `metadata`, `sitemap.xml`, `robots.txt`, Open Graph. **Sem** tag de analytics ou marketing no MVP (ver ADR-011 — apenas cookies essenciais).
- Mesmo design system acessível dos portais (RNF-007).
- Rotas públicas explicitamente liberadas no middleware de autenticação — um visitante anônimo em `/` nunca é redirecionado para login.

## Consequências

- A landing compartilha deploy, CI e domínio com o app. A separação `elp.com.br` (landing) x `app.elp.com.br` ou `/app` (portais) fica para a Fase 7.
- Os textos legais (`/privacidade`, `/termos`, `/cookies`) são artefatos com dono jurídico — entram na Definition of Done com checkbox de revisão.
- Sem rastreamento no MVP, o "banner de cookies" é apenas informativo (ver ADR-011), o que simplifica a landing e a primeira visita.
- Um shell da landing (estrutura + textos legais como rascunho) já entra na Fase 0; o conteúdo final de marketing é polido na Fase 7.

## Alternativas consideradas

- **Site estático separado (Astro, Next export próprio, etc.):** mais leve e isolado, mas adiciona um segundo repositório/pipeline, um segundo deploy e risco de divergência de design system. Não escolhida para o MVP; pode ser reavaliada se a landing crescer para blog/documentação extensa.
- **Serviço de landing page no-code (Framer, Webflow):** rápido para marketing, mas tira os textos legais do controle de versão e da revisão por PR. Não escolhida.
