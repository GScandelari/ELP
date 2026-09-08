# Questões em Aberto do SDD — recomendações para validação

**Fonte:** `SDD.md`, seção 29. O próprio SDD é explícito: essas decisões *"não devem ser inferidas automaticamente"*. Este documento não as decide — propõe um default defensável para cada uma, para acelerar a conversa com o stakeholder. Nada aqui deve ser tratado como definitivo até confirmação.

Cada item: **pergunta original** → **impacto técnico se a resposta mudar** → **sugestão de default**.

---

### O cadastro será aberto ou por convite?
- **Impacto:** define se `createUser` precisa de validação adicional (ex.: domínio de e-mail institucional) e se há tela pública de cadastro.
- **Sugestão:** cadastro aberto para professores e alunos no MVP, sem convite — mais simples de validar o produto. Fácil de restringir depois com Security Rules adicionais.

### Professor poderá compartilhar uma atividade entre salas?
- **Impacto:** **bloqueante para a modelagem da Fase 3.** Se sim, `Activity` não pode viver como subcoleção de `classes/{classId}` (ver seção 3.2 do plano de implementação) — precisa ser coleção top-level com relação N:N para salas.
- **Sugestão:** **não** no MVP (atividade pertence a uma única sala). Simplifica o modelo de dados; reavaliar na Fase 3 do roadmap original (Content Platform), quando "reutilização de conteúdo" já está no escopo.

### Uma atividade poderá pertencer a mais de uma sala?
- Mesma questão da anterior — mantido o mesmo default (não, no MVP).

### Aluno poderá sair de uma sala?
- **Impacto:** requer uma transição de estado em `Enrollment` (`ACTIVE -> LEFT`) e decidir se `attempts` anteriores continuam visíveis ao professor.
- **Sugestão:** sim, com soft-delete (`status: LEFT` no documento de enrollment, não exclusão), preservando histórico de resultados para o professor.

### Professor poderá permitir múltiplas tentativas?
- **Impacto:** já contemplado no modelo (`max_attempts` em `Activity`, RN-007) — não bloqueia a modelagem.
- **Sugestão:** sim, `max_attempts` configurável por atividade, default 1.

### Como será calculada a nota?
- **Impacto:** define os campos de `resultsSummary` (seção 3 do plano) e a lógica de `ScoreCalculator`.
- **Sugestão:** pontos por item (`ActivityItem.points`), somados e convertidos em percentual (`score / max_score * 100`) para exibição — ambos os valores guardados (ver próxima pergunta).

### Haverá nota percentual, pontos ou ambos?
- **Sugestão:** ambos — `score` (pontos brutos) e `max_score` guardados; percentual é derivado na exibição, não precisa ser persistido separadamente.

### Atividades terão peso?
- **Impacto:** se sim, `resultsSummary` (agregação por sala) precisa de uma média ponderada, não simples.
- **Sugestão:** não no MVP. Reavaliar quando houver "nota de sala" consolidada além de nota por atividade — não há requisito funcional (RF) pedindo isso ainda.

### Haverá prazo obrigatório?
- **Impacto:** `due_date` já existe no modelo (`Activity.dueDate`); "obrigatório" só muda uma validação no `publishActivity`.
- **Sugestão:** opcional. Professor decide se define prazo.

### O aluno verá a resposta correta imediatamente?
- **Impacto:** afeta o payload que `submitAttempt` retorna ao client e o que fica gravado em `Answer.feedback`.
- **Sugestão:** sim, por padrão, mas com uma flag por atividade (`showAnswersAfterSubmit: boolean`, default `true`) — cobre a pergunta seguinte no mesmo campo.

### O professor poderá bloquear a visualização das respostas?
- **Sugestão:** coberto pelo campo `showAnswersAfterSubmit` proposto acima.

### Como funcionará a correção de escrita?
- **Impacto:** fora do escopo do MVP (SDD seção 1.4 exclui "correção automática avançada de textos"; seção 9.6 marca "Writing" como futuro). Não bloqueia as Fases 0–7 deste plano.
- **Sugestão:** não decidir agora — endereçar junto com a Fase 2 do roadmap original (Learning Experience) quando "Writing" entrar em escopo.

### O sistema terá suporte a outros idiomas além de inglês/português?
- **Impacto:** se sim desde já, afeta i18n do frontend (não afeta o modelo de dados no MVP, já que `Activity`/`ActivityItem` não têm campo de idioma da interface).
- **Sugestão:** interface só em português no MVP; conteúdo das atividades (inglês) já é natural do domínio. i18n de interface fica no roadmap, não é um bloqueio.

### Haverá níveis CEFR obrigatórios?
- **Impacto:** fora do MVP (SDD seção 24, Fase 3 do roadmap original).
- **Sugestão:** não no MVP; campo `cefrLevel` opcional pode ser adicionado em `Activity` sem quebrar nada, se o professor já quiser começar a taguear.

### Conteúdo poderá ser reutilizado entre atividades?
- **Impacto:** relacionado à pergunta de atividade multi-sala — mesmo racional.
- **Sugestão:** não no MVP; reavaliar na Fase 3 do roadmap original (Content Platform).

### Haverá banco global de palavras?
- **Sugestão:** não no MVP — fora de escopo explícito do SDD (seção 1.4) e do roadmap original (Fase 3).

### Haverá colaboração entre professores?
- **Impacto:** se sim, `Class.accountId` (singular) precisaria virar uma lista/subcoleção de professores por conta.
- **Sugestão:** não no MVP — mas **atualizada** após a decisão de virar produto comercial (ver ADR-009): o campo já se chama `accountId` em vez de `teacherId` desde a Fase 0 exatamente para que essa evolução (uma conta = uma escola/equipe com vários professores) seja aditiva depois, via `accounts/{accountId}/members`, sem migração de `classes`. Continua não sendo construído até haver demanda comercial real.

### Haverá administrador no MVP?
- **Impacto:** SDD seção 1.3 (escopo do MVP) não lista telas de admin; seção 2.3 descreve Admin como "persona futura".
- **Sugestão:** não como papel operacional com UI própria nas Fases 0–7; manter suporte técnico ao papel `admin` nas Security Rules (para dar suporte via console/Admin SDK). **Atualizada:** com a intenção de virar produto vendido a professores independentes, o portal admin (gestão de contas, suporte, provisionamento) passa a ser um roadmap explícito — "Fase 8 — Admin & Operação SaaS" em `IMPLEMENTATION-PLAN.md` seção 7 — mas continua fora do MVP, a ser priorizado quando houver professores pagantes reais.

### A plataforma será single-tenant ou multi-tenant (vários professores independentes num mesmo deploy)?
- **Novo, adicionado após definição de que o projeto vira produto comercial.**
- **Impacto:** já resolvido pela modelagem existente — `classes/{classId}.accountId` (antes `teacherId`) já isola dados por professor via Security Rules, então múltiplos professores independentes já podem coexistir num único deploy Firebase sem mudança de arquitetura.
- **Sugestão:** modelo pooled/multi-tenant compartilhado (um conjunto de projetos Firebase para todos os clientes), não um projeto Firebase dedicado por professor — ver ADR-009 para o racional completo. Isolamento físico por cliente fica como possível tier enterprise muito mais à frente, não uma necessidade conhecida hoje.

### Qual estratégia de hospedagem será utilizada?
- **Status:** **já respondida** por este plano — Firebase Hosting + Cloud Functions (ver ADR-008). A única decisão do stakeholder que gerou este documento.

---

## Como usar este documento

Se você concordar com os defaults sugeridos, me diga "aceito os defaults" e eu atualizo o `IMPLEMENTATION-PLAN.md` marcando essas decisões como confirmadas (não mais "em aberto"). Se quiser mudar algum, me diga qual e eu ajusto o modelo de dados/plano de fases correspondente antes de começarmos a Fase 0.
