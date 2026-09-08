# ADR-008 — Estratégia de deploy e ambientes (substitui ADR-010 do SDD)

## Status

Proposto

## Contexto

O SDD (seção 25, ADR-010) deixava a estratégia de deploy como decisão pendente. Firebase define boa parte dessa estratégia por convenção.

## Decisão

- Três projetos Firebase separados: `elp-dev` (desenvolvimento/local via emulador na maior parte do tempo), `elp-staging` (preview/homologação), `elp-prod` (produção).
- Firebase Hosting com **preview channels** para cada Pull Request (deploy efêmero, apagado ao mesclar/fechar o PR).
- GitHub Actions como CI/CD: lint + testes (incluindo testes de Security Rules via emulador) em cada PR; deploy para `elp-staging` ao mesclar na branch principal; deploy para `elp-prod` manual/tagueado.
- Variáveis de ambiente e credenciais de cada projeto Firebase geridas via GitHub Actions Secrets, nunca commitadas no repositório.

## Consequências

- Custo de manter 3 projetos Firebase (mas dentro do free tier / Spark-Blaze para volumes de MVP).
- Deploy de produção nunca é automático a partir de merge direto — exige uma ação explícita (tag de release), reduzindo risco de deploy acidental.

## Alternativas consideradas

- **Um único projeto Firebase com prefixos de coleção por ambiente:** descartada — mistura dados de teste e produção, e Security Rules ficariam mais complexas para diferenciar ambiente.
