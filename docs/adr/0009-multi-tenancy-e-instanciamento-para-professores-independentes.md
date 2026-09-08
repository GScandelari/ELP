# ADR-009 — Estratégia de multi-tenancy e "instanciamento" para professores independentes

## Status

Proposto — decisão de baixo custo agora (só afeta nomenclatura de campo), decisão de portal fica para fase pós-MVP.

## Contexto

O SDD original não previa um modelo de negócio — tratava o produto como uma plataforma única, com Professor/Aluno/Admin como papéis, e "Administrador" como persona futura de operação (seção 2.3). A intenção agora é transformar o projeto em produto comercial vendido a professores independentes, com um portal admin capaz de dar suporte e "instanciar" a plataforma para novos professores, incluindo a possibilidade de mais de um professor usar a mesma plataforma.

Essa segunda parte já está parcialmente resolvida pelo modelo de dados: como `classes/{classId}.teacherId` já isola os dados por professor, **múltiplos professores independentes já podem coexistir num único deploy do Firebase hoje**, sem nenhuma mudança de arquitetura — cada um só enxerga suas próprias salas via Security Rules. O que falta para virar produto é a camada de operação em torno disso: cadastro self-service, suporte, e (eventualmente) cobrança.

A pergunta que importa é: **"instanciar a plataforma para um professor" significa provisionar uma conta dentro de uma plataforma compartilhada, ou subir infraestrutura Firebase dedicada por professor/cliente?**

## Decisão

Adotar o modelo **pooled (multi-tenant compartilhado)** como padrão: um único conjunto de projetos Firebase (`elp-dev`/`elp-staging`/`elp-prod`, já definidos no ADR-008) atende todos os professores, com isolamento lógico via `accountId` (não infraestrutura dedicada por cliente).

Duas mudanças de baixo custo, a fazer já no modelo de dados (mesmo antes do portal admin existir), para que essa evolução não exija migração de dados depois:

1. Renomear conceitualmente `teacherId` para **`accountId`** nos documentos de `classes` (o valor continua sendo o `uid` do professor no MVP — nada muda no comportamento, só no nome do campo e no vocabulário do código). Isso deixa a porta aberta para, no futuro, um `accountId` representar uma escola/equipe em vez de um único professor, sem precisar renomear campos em produção.
2. Adicionar um documento `accounts/{accountId}` (pode começar como espelho de `users/{uid}` com `status`) — hoje só guarda `status` (ex.: `ACTIVE`, `SUSPENDED`, `TRIAL`) e serve de âncora para o que o portal admin vai gerenciar: suspender acesso, trocar plano, etc.

**Fora do MVP, mapeado como fase pós-MVP** ("Fase 8 — Admin & Operação SaaS", ver `IMPLEMENTATION-PLAN.md` seção 10):

- Portal admin real (papel `admin` com UI, não só suporte técnico via console).
- Fluxo de provisionamento/aprovação de novos professores independentes.
- Ferramentas de suporte (visão read-only das salas de um professor mediante auditoria, nunca acesso silencioso).
- Métricas de plataforma agregadas (professores ativos, salas ativas — já listadas como métricas futuras na seção 20 do SDD).
- Hooks para cobrança/plano (SDD seção 1.4 exclui pagamentos do MVP; aqui só deixamos o campo `status` em `accounts/{accountId}` pronto para carregar isso depois, sem implementar cobrança agora).

## Consequências

- Nenhum impacto na Fase 0–7 já planejadas, exceto a troca de nome `teacherId` → `accountId` no schema (mudança mecânica, decidir agora evita migração depois).
- "Colaboração entre professores"/"mais de um professor usar a mesma sala" continua **não decidido para o MVP** (ver `OPEN-QUESTIONS.md`), mas agora tem um caminho claro de evolução: se `accountId` passar a representar uma organização/escola em vez de um único professor, uma sala já pode ganhar múltiplos professores por relação `accounts/{accountId}/members`, sem redesenhar `classes`.
- Modelo pooled é o padrão de mercado para SaaS B2B de porte pequeno/médio (menor custo operacional, deploy único, atualização única). Isolamento físico por cliente (projeto Firebase dedicado) fica como opção de "tier enterprise" muito mais à frente, só se algum cliente institucional exigir isolamento de infraestrutura por contrato — não é uma necessidade conhecida hoje.

## Alternativas consideradas

- **Siloed — um projeto Firebase por professor/cliente:** descartada como padrão. Multiplicaria custo operacional (N projetos para manter, N deploys, N faturas) proporcionalmente ao número de professores, o que inviabiliza um produto de assinatura de baixo ticket para professores independentes. Mantida como nota de possível tier futuro, não como arquitetura padrão.
- **Não fazer nada agora e decidir só quando o portal admin for construído:** rejeitada porque renomear `teacherId` → `accountId` depois de haver dados em produção é uma migração; fazer isso agora, antes da Fase 1 gerar dados reais, custa quase nada.
