# Questões em Aberto do SDD — registro de decisão

**Status: todas respondidas em 2026-09-09.** Este documento deixou de ser uma lista de pendências e passou a ser o **registro das decisões** do stakeholder. Cada item traz a linha **Decisão**. As decisões com impacto arquitetural foram promovidas a ADR: atividade reutilizável em várias salas → **ADR-012**; liberação controlada de resultados → **ADR-013**.

**Fonte:** `SDD.md`, seção 29. O próprio SDD era explícito: essas decisões *"não devem ser inferidas automaticamente"* — por isso foram levadas ao stakeholder em vez de assumidas.

Cada item: **pergunta original** → **impacto técnico se a resposta mudar** → **sugestão de default** → **Decisão**.

---

### O cadastro será aberto ou por convite?
- **Impacto:** define se `createUser` precisa de validação adicional (ex.: domínio de e-mail institucional) e se há tela pública de cadastro.
- **Sugestão:** cadastro aberto para professores no MVP, sem convite. **Atualizada (LGPD, ADR-011):** aluno **maior de 18** pode se auto-cadastrar; aluno **menor de 18 não faz cadastro self-service** — a conta é criada/vinculada pelo professor ou escola, que declara ter o consentimento do responsável legal (RF-021).
 - **Decisão**: De acordo.

### Professor poderá compartilhar uma atividade entre salas?
- **Impacto:** **bloqueante para a modelagem da Fase 3.** Se sim, `Activity` não pode viver como subcoleção de `classes/{classId}` (ver seção 3.2 do plano de implementação) — precisa ser coleção top-level com relação N:N para salas.
- **Sugestão:** **não** no MVP (atividade pertence a uma única sala). Simplifica o modelo de dados; reavaliar na Fase 3 do roadmap original (Content Platform), quando "reutilização de conteúdo" já está no escopo.
 - **Decisão**: Sim, no MVP. A atividade criada pelo professor fica no repositório de atividades daquele professor. A atividade pode ser utilizada em N salas distintas.
 - **Refinamento (2026-09-10, ADR-014):** assim que o primeiro aluno inicia a atividade em qualquer sala, ela fica imutável e não pode ir para novas salas. Correção = clonar e, nas salas onde ninguém começou, substituir pela versão clonada.

### Uma atividade poderá pertencer a mais de uma sala?
- Mesma questão da anterior — mantido o mesmo default (não, no MVP).
 - **Decisão**: Sim.

### Aluno poderá sair de uma sala?
- **Impacto:** requer uma transição de estado em `Enrollment` (`ACTIVE -> LEFT`) e decidir se `attempts` anteriores continuam visíveis ao professor.
- **Sugestão:** sim, com soft-delete (`status: LEFT` no documento de enrollment, não exclusão), preservando histórico de resultados para o professor.
 - **Decisão**: De acordo.

### Professor poderá permitir múltiplas tentativas?
- **Impacto:** já contemplado no modelo (`max_attempts` em `Activity`, RN-007) — não bloqueia a modelagem.
- **Sugestão:** sim, `max_attempts` configurável por atividade, default 1.
 - **Decisão**: De acordo.

### Como será calculada a nota?
- **Impacto:** define os campos de `resultsSummary` (seção 3 do plano) e a lógica de `ScoreCalculator`.
- **Sugestão:** pontos por item (`ActivityItem.points`), somados e convertidos em percentual (`score / max_score * 100`) para exibição — ambos os valores guardados (ver próxima pergunta).
 - **Decisão**: De acordo.

### Haverá nota percentual, pontos ou ambos?
- **Sugestão:** ambos — `score` (pontos brutos) e `max_score` guardados; percentual é derivado na exibição, não precisa ser persistido separadamente.
 - **Decisão**: De acordo.

### Atividades terão peso?
- **Impacto:** se sim, `resultsSummary` (agregação por sala) precisa de uma média ponderada, não simples.
- **Sugestão:** não no MVP. Reavaliar quando houver "nota de sala" consolidada além de nota por atividade — não há requisito funcional (RF) pedindo isso ainda.
 - **Decisão**: De acordo.

### Haverá prazo obrigatório?
- **Impacto:** `due_date` já existe no modelo (`Activity.dueDate`); "obrigatório" só muda uma validação no `publishActivity`.
- **Sugestão:** opcional. Professor decide se define prazo.
 - **Decisão**: De acordo.

### O aluno verá a resposta correta imediatamente?
- **Impacto:** afeta o payload que `submitAttempt` retorna ao client e o que fica gravado em `Answer.feedback`.
- **Sugestão:** sim, por padrão, mas com uma flag por atividade (`showAnswersAfterSubmit: boolean`, default `true`) — cobre a pergunta seguinte no mesmo campo.
 - **Decisão**: Não. O aluno só verá a resposta correta após validação do professor ou data de encerramento da atividade. Isso evitará alunos finalizando atividade e repassando respostas entre sí durante o periodo aberto.

### O professor poderá bloquear a visualização das respostas?
- **Sugestão:** coberto pelo campo `showAnswersAfterSubmit` proposto acima.
 - **Decisão**: Não.

### Como funcionará a correção de escrita?
- **Impacto:** fora do escopo do MVP (SDD seção 1.4 exclui "correção automática avançada de textos"; seção 9.6 marca "Writing" como futuro). Não bloqueia as Fases 0–7 deste plano.
- **Sugestão:** não decidir agora — endereçar junto com a Fase 2 do roadmap original (Learning Experience) quando "Writing" entrar em escopo.
 - **Decisão**: De acordo.

### O sistema terá suporte a outros idiomas além de inglês/português?
- **Impacto:** se sim desde já, afeta i18n do frontend (não afeta o modelo de dados no MVP, já que `Activity`/`ActivityItem` não têm campo de idioma da interface).
- **Sugestão:** interface só em português no MVP; conteúdo das atividades (inglês) já é natural do domínio. i18n de interface fica no roadmap, não é um bloqueio.
 - **Decisão**: De acordo.

### Haverá níveis CEFR obrigatórios?
- **Impacto:** fora do MVP (SDD seção 24, Fase 3 do roadmap original).
- **Sugestão:** não no MVP; campo `cefrLevel` opcional pode ser adicionado em `Activity` sem quebrar nada, se o professor já quiser começar a taguear.
 - **Decisão**: De acordo.

### Conteúdo poderá ser reutilizado entre atividades?
- **Impacto:** relacionado à pergunta de atividade multi-sala — mesmo racional.
- **Sugestão:** não no MVP; reavaliar na Fase 3 do roadmap original (Content Platform).
 - **Decisão**: Sim, seguindo a resposta à pergunta de atividade multi-sala.

### Haverá banco global de palavras?
- **Sugestão:** não no MVP — fora de escopo explícito do SDD (seção 1.4) e do roadmap original (Fase 3).
 - **Decisão**: De acordo.

### Haverá colaboração entre professores?
- **Impacto:** se sim, `Class.accountId` (singular) precisaria virar uma lista/subcoleção de professores por conta.
- **Sugestão:** não no MVP — mas **atualizada** após a decisão de virar produto comercial (ver ADR-009): o campo já se chama `accountId` em vez de `teacherId` desde a Fase 0 exatamente para que essa evolução (uma conta = uma escola/equipe com vários professores) seja aditiva depois, via `accounts/{accountId}/members`, sem migração de `classes`. Continua não sendo construído até haver demanda comercial real.
 - **Decisão**: De acordo.

### Haverá administrador no MVP?
- **Impacto:** SDD seção 1.3 (escopo do MVP) não lista telas de admin; seção 2.3 descreve Admin como "persona futura".
- **Sugestão:** não como papel operacional com UI própria nas Fases 0–7; manter suporte técnico ao papel `admin` nas Security Rules (para dar suporte via console/Admin SDK). **Atualizada:** com a intenção de virar produto vendido a professores independentes, o portal admin (gestão de contas, suporte, provisionamento) passa a ser um roadmap explícito — "Fase 8 — Admin & Operação SaaS" em `IMPLEMENTATION-PLAN.md` seção 7 — mas continua fora do MVP, a ser priorizado quando houver professores pagantes reais.
 - **Decisão**: De acordo - porém, será necessário gerar um guia de como inserir professores e alunos no sistema para darmos o start-up do projeto e prestar o suporte necessário nesse MVP.


### A plataforma será single-tenant ou multi-tenant (vários professores independentes num mesmo deploy)?
- **Novo, adicionado após definição de que o projeto vira produto comercial.**
- **Impacto:** já resolvido pela modelagem existente — `classes/{classId}.accountId` (antes `teacherId`) já isola dados por professor via Security Rules, então múltiplos professores independentes já podem coexistir num único deploy Firebase sem mudança de arquitetura.
- **Sugestão:** modelo pooled/multi-tenant compartilhado (um conjunto de projetos Firebase para todos os clientes), não um projeto Firebase dedicado por professor — ver ADR-009 para o racional completo. Isolamento físico por cliente fica como possível tier enterprise muito mais à frente, não uma necessidade conhecida hoje.
 - **Decisão**: De acordo.

### Qual estratégia de hospedagem será utilizada?
- **Status:** **já respondida** por este plano — Firebase Hosting + Cloud Functions (ver ADR-008). A única decisão do stakeholder que gerou este documento.
 - **Decisão**: De acordo.

---

## Questões de LGPD (adicionadas na v0.2.0, ver ADR-011)

### Quem será o encarregado (DPO)?
- **Impacto:** obrigatório ter um canal do encarregado publicado na Política de Privacidade (Art. 41). Pode ser uma pessoa interna ou um serviço terceirizado ("DPO as a service").
- **Sugestão:** no início, o próprio responsável pelo projeto acumula a função, com um e-mail dedicado (`privacidade@...`); reavaliar a contratação de serviço especializado quando houver volume de titulares.
 - **Decisão**: Neste início, considerar meu prório email como DPO.

### Qual a base legal para tratar dados de alunos inseridos pelo professor?
- **Impacto:** define se cada aluno precisa consentir individualmente ou se o professor/escola ampara o tratamento por legítimo interesse educacional.
- **Sugestão:** legítimo interesse do professor/escola para o fim pedagógico (Art. 7º, IX) para alunos maiores; para menores, consentimento do responsável legal (Art. 14) sempre. Confirmar com o jurídico e permitir configuração por perfil de cliente (escola x professor autônomo).
 - **Decisão**: Neste momento não há uma equipe jurídica. Sugiro criarmos um termo simples e básico para o professor, alunos e responsáveis consentir. Ponto de melhoria real após o lançamento do MVP com validações mais rigorosas, principalmente para alunos menores.

### Como verificar o consentimento do responsável legal de um aluno menor?
- **Impacto:** define o fluxo de RF-021 e o valor probatório do registro em `consents/{uid}`.
- **Sugestão MVP:** declaração do professor/escola de que obteve e guarda o termo assinado (modelo fornecido pela plataforma), registrada com data/hora. **Reforço opcional:** e-mail de confirmação enviado ao responsável. Verificação documental forte (upload do termo) fica para depois.
 - **Decisão**: De acordo.

### Quais os prazos de retenção por categoria de dado?
- **Impacto:** parametriza a função `purgeExpiredData` e a `politica-de-retencao.md`.
- **Sugestão:** dados de conta enquanto a conta existir + 30 dias; tentativas/respostas idem, depois anonimizadas; registro de consentimento 5 anos; logs de auditoria 6 meses. Confirmar com o jurídico.
 - **Decisão**: Não há juridico nesse momento, mas de acordo.

### Confirmar a região `southamerica-east1` (São Paulo) para Firestore/Functions?
- **Impacto:** **decisão irreversível**, tomada na criação dos projetos (Fase 0). Afeta latência e a disponibilidade de alguns recursos do Firebase que chegam mais tarde a São Paulo.
- **Sugestão:** sim — reduz latência no Brasil e simplifica a análise de transferência internacional. Aceitar o trade-off de features novas chegarem um pouco depois.
 - **Decisão**: De acordo.

### Todo menor de 18 entra pelo mesmo fluxo, ou diferenciar criança (<12) de adolescente (12–17)?
- **Impacto:** o ECA distingue criança e adolescente; a LGPD Art. 14 fala em "crianças", mas a ANPD recomenda cautela também com adolescentes.
- **Sugestão:** tratar todo menor de 18 pelo fluxo com responsável legal no MVP (mais simples e conservador); diferenciar só se houver demanda.
 - **Decisão**: De acordo.

### A plataforma oferecerá contrato de operador (DPA) para escolas clientes?
- **Impacto:** necessário para vender para escolas — elas são controladoras e precisam de um DPA com a plataforma.
- **Sugestão:** ter um modelo de DPA pronto antes do primeiro cliente-escola; não bloqueia professores autônomos.
 - **Decisão**: De acordo.

---

## Como usar este documento

As decisões acima já foram refletidas em `SDD.md` (v0.3.0), `IMPLEMENTATION-PLAN.md` (v0.4.0) e nos ADR-012/013. Se uma decisão mudar, atualize aqui a linha **Decisão**, registre o impacto e propague para o SDD, o plano e os ADRs afetados (processo da seção 28 do SDD).

Decisões ainda dependentes de terceiros (não bloqueiam a Fase 0):

- **Termo de consentimento** (professor / aluno / responsável): redigir uma versão simples agora; endurecer com apoio jurídico após o MVP.
- **Prazos de retenção** e **modelo de DPA para escolas:** confirmar com jurídico quando houver.
- **Encarregado (DPO):** e-mail do responsável pelo projeto no MVP; reavaliar serviço dedicado com volume.
