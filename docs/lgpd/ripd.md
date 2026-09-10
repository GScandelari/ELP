# RIPD — Relatório de Impacto à Proteção de Dados Pessoais

**Projeto:** ELP — English Learning Platform
**Base legal do documento:** art. 5º, XVII e art. 38 da Lei 13.709/2018 (LGPD). Elaboração obrigatória aqui por haver tratamento de dados de **crianças e adolescentes** (art. 14).

**Versão:** 1.1 — rascunho
**Data:** 2026-09-10
**Elaborado por:** Stanke Scandelari (encarregado / DPO — stanke399@gmail.com)
**Controladora:** [NOME / CPF ou CNPJ — a definir]

**Status:** ☑ Aberto · ☑ Rascunho · ⬜ Revisado pelo jurídico · ⬜ Assinado (bloqueio de go-live — Fase 7 do plano de implementação)

> Este rascunho consolida o que já está definido nos ADRs (`../adr/`), no registro de operações de tratamento (`registro-de-tratamento.md`) e nos textos de `termos-e-consentimento.md`. Os pontos ainda abertos estão marcados com **[pendente]**. Deve ser revisado a cada mudança relevante de tratamento (processo da seção 28 do SDD) e concluído antes do lançamento.

---

## 1. Identificação dos agentes

| Papel | Quem | Observação |
|---|---|---|
| Controladora | [a definir] | Opera a plataforma ELP; controladora dos dados de cadastro dos professores |
| Operadora / co-controlador | Cada professor ou escola | Em relação aos dados dos seus próprios alunos (ver ADR-009) |
| Operador (suboperador) | Google LLC / Firebase | Infraestrutura (Auth, Firestore, Functions, Hosting), região `southamerica-east1` |
| Encarregado (DPO) | Stanke Scandelari — stanke399@gmail.com | Acumula a função no MVP (ADR-011) |
| Titulares | Professores, alunos (inclusive menores de 18), responsáveis legais, visitantes da landing page | — |

---

## 2. Descrição do tratamento

### 2.1 Natureza e finalidade

Plataforma web em que professores de inglês montam um repositório de atividades, atribuem essas atividades a salas virtuais, e alunos as resolvem com correção automática. Finalidades:

- autenticar e manter contas de professores e alunos;
- permitir a criação de salas, a inscrição de alunos e a aplicação de atividades;
- corrigir automaticamente as respostas e apresentar resultados;
- permitir ao professor acompanhar o desempenho da turma;
- cumprir obrigações legais (registro de consentimento, atendimento aos direitos do titular).

**Não** há, no MVP: pagamentos, marketing, perfilamento, decisões automatizadas com efeito jurídico, geração de conteúdo por IA (SDD seção 1.4).

### 2.2 Categorias de dados pessoais

| Categoria | Dados | Titular |
|---|---|---|
| Identificação | nome, e-mail | Professor, aluno |
| Etária | apenas a declaração "tem 18 anos ou mais?" (`isMinor` booleano) — **sem data de nascimento** | Aluno |
| Dados acadêmicos | respostas às atividades, notas, tentativas, progresso | Aluno |
| Registros de acesso | IP, data/hora, identificador de sessão, agente do navegador | Professor, aluno |
| Registro de consentimento | identificador de quem aceitou, versão do texto, data/hora, papel | Professor, responsável legal |
| Consentimento parental (declaração + termo físico) | nomes do responsável e do aluno, escola, assinatura | Responsável legal, aluno |

**Não são coletados dados sensíveis** (art. 5º, II — origem racial/étnica, convicção religiosa, opinião política, saúde, vida sexual, dado genético ou biométrico). Os dados acadêmicos podem indiretamente revelar dificuldades de aprendizagem e, por isso, recebem cuidado reforçado quando se trata de menores (ver seção 4).

### 2.3 Origem dos dados

- Professor: fornecidos por ele mesmo no cadastro.
- Aluno maior de 18: fornecidos por ele no cadastro (autoinscrição) ou pelo professor (inscrição manual).
- Aluno menor de 18: **sempre** inseridos pelo professor/escola (não há autocadastro — RF-021).
- Dados acadêmicos: gerados pelo próprio aluno ao resolver as atividades.
- Registros de acesso: gerados automaticamente pela plataforma.

### 2.4 Ciclo de vida e retenção

| Dado | Retenção | Fim do ciclo |
|---|---|---|
| Dados da conta | enquanto a conta existir + 30 dias | exclusão |
| Respostas, notas, tentativas | enquanto a conta existir | **anonimização** (não exclusão — preserva estatística agregada da turma) |
| Registros de acesso | 6 meses | exclusão |
| Registro de consentimento | 5 anos após o fim da relação | exclusão |
| Dados de alunos de uma conta de professor encerrada | até 30 dias após o encerramento | anonimização |

Aplicação automatizada pela Cloud Function agendada `purgeExpiredData` (Fase 6). Prazos ainda **[pendente]** de confirmação jurídica — são os defaults propostos no ADR-011.

### 2.5 Volume estimado

MVP / piloto: dezenas a centenas de titulares. **[pendente]** revisar quando houver projeção comercial.

### 2.6 Compartilhamento e operadores

- **Google/Firebase:** único operador de infraestrutura. Necessário aceitar o Adendo de Tratamento de Dados (DPA) do Google Cloud em cada projeto e arquivar a evidência em `dpa/` (Fase 0).
- Nenhum compartilhamento com terceiros para publicidade ou enriquecimento de dados.
- Acesso de suporte da controladora aos dados de um professor (Fase 8): **sempre com registro de auditoria, nunca silencioso** (ADR-009).

---

## 3. Necessidade e proporcionalidade

### 3.1 Base legal por operação

| Operação | Base legal (LGPD) |
|---|---|
| Cadastro e operação da conta do professor | Execução de contrato — art. 7º, V |
| Dados de aluno **maior de 18** inseridos pelo professor | Legítimo interesse educacional do professor/escola — art. 7º, IX |
| Dados de aluno **menor de 18** | **Consentimento específico e destacado do responsável legal** — art. 14, §1º |
| Registro de consentimento | Cumprimento de obrigação legal — art. 7º, II |
| Registros de acesso (segurança) | Legítimo interesse — art. 7º, IX |
| Cookies estritamente necessários | Legítimo interesse / execução de contrato; dispensam consentimento prévio, exigem informação |

### 3.2 Minimização — justificativa de cada dado

| Dado | Por que é necessário | Alternativa menos invasiva considerada |
|---|---|---|
| Nome | o professor precisa identificar quem respondeu para corrigir e dar feedback | conta pseudônima com mapeamento offline pelo professor — rejeitada: transfere o dado para uma planilha fora de controle e piora a rastreabilidade |
| E-mail | login, redefinição de senha, comunicações essenciais do serviço | login por código entregue pelo professor — considerar pós-MVP para turmas de menores |
| Faixa etária (é maior de 18?) | determinar se o aluno é menor de 18 (aciona o art. 14) e bloquear o autocadastro de menor | **adotado:** coleta-se só a declaração "18 anos ou mais?", não a data de nascimento (decisão de 2026-09-10) |
| Respostas e notas | núcleo da finalidade pedagógica (correção e acompanhamento) | — |
| IP / registros de acesso | investigar acessos indevidos e incidentes | reduzir o detalhe do log e o prazo de guarda (já limitado a 6 meses) |

**Status:** ✅ implementado na especificação — o cadastro coleta só a declaração de faixa etária (`isMinor`), sem data de nascimento (SDD RF-021, ADR-011).

### 3.3 Transparência

- Política de Privacidade resumida e em linguagem simples (`termos-e-consentimento.md`), acessível na landing page antes do login (ADR-010).
- Textos de aceite específicos e não pré-marcados; versão registrada em `consents/{uid}` (ADR-011).
- Canal do encarregado publicado.

### 3.4 Direitos do titular (art. 18)

| Direito | Como é atendido |
|---|---|
| Acesso / confirmação | tela no portal + função `exportUserData` (Fase 6) |
| Correção | edição do cadastro no portal |
| Portabilidade | `exportUserData` em formato legível por máquina (JSON) |
| Eliminação | `deleteUserData` — anonimiza `attempts`/`answers` e remove identificadores diretos (Fase 6) |
| Informação sobre compartilhamento | Política de Privacidade |
| Revogação de consentimento | responsável legal solicita ao professor/escola ou ao encarregado |

Prazo de resposta: 15 dias (art. 19). Solicitações de/para menores são exercidas pelo responsável legal.

---

## 4. Tratamento de dados de crianças e adolescentes (art. 14)

Ponto de maior atenção do projeto.

| Exigência do art. 14 | Como o projeto atende |
|---|---|
| Melhor interesse da criança/adolescente | finalidade estritamente pedagógica; sem publicidade, sem perfilamento, sem compartilhamento com terceiros |
| Consentimento específico e destacado de pelo menos um dos pais/responsável (§1º) | aluno menor **não** faz autocadastro; a conta é criada pelo professor/escola, que coleta o termo assinado do responsável (`termos-e-consentimento.md`) e **declara** no sistema tê-lo obtido — registro `GUARDIAN_CONSENT` em `consents/{uid}` (RF-021) |
| Coleta do mínimo indispensável (§5º) | apenas nome, e-mail, faixa etária e dados das atividades; nenhum outro dado de contato, foto ou localização |
| Não condicionar a participação a dados excessivos (§3º) | a resolução das atividades não exige nenhum dado além do necessário |
| Informação clara sobre o tratamento (§6º) | Política de Privacidade tem seção específica "Menores de idade" |

### Fragilidade conhecida e plano

O MVP confia na **declaração do professor** de que obteve o consentimento do responsável — não há verificação documental forte (upload do termo, confirmação por e-mail ao responsável). **Decisão de 2026-09-10: risco aceito para o MVP** (registrada em `OPEN-QUESTIONS.md`), com **plano de reforço pós-lançamento**:

1. e-mail de confirmação ao responsável (dado de contato do responsável passa a ser coletado);
2. upload do termo assinado como evidência anexada ao `GUARDIAN_CONSENT`;
3. reavaliar a base legal por perfil de cliente (escola x professor autônomo).

O reforço deve ser reavaliado assim que a plataforma sair do piloto ou atingir volume relevante de alunos menores.

---

## 5. Partes interessadas e consulta

- **Titulares:** não houve consulta formal no MVP; a Política de Privacidade e os canais de contato são os instrumentos de diálogo. **[pendente]** considerar coleta de feedback dos professores piloto sobre o fluxo de consentimento.
- **Encarregado:** este documento.
- **Jurídico:** **[pendente]** — sem assessoria no MVP; revisão contratada antes do go-live (Fase 7).
- **ANPD:** não consultada; RIPD mantido à disposição para eventual requisição (art. 38).

---

## 6. Identificação e avaliação de riscos aos titulares

Escala: probabilidade e impacto em **Baixa / Média / Alta**. "Risco residual" é a avaliação após as medidas da seção 7.

| # | Risco ao titular | Prob. (sem mitigação) | Impacto | Medidas de mitigação | Risco residual |
|---|---|---|---|---|---|
| R1 | Acesso indevido a dados de um aluno por falha nas Security Rules ou em custom claim | Média | Alto | RBAC em duas camadas (claims + rules); suíte obrigatória de testes de regras no emulador antes de cada deploy (ADR-005); revisão completa de regras na Fase 6 | Baixo |
| R2 | Professor acessa dados de alunos de **outra** conta (quebra de isolamento multi-tenant) | Baixa | Alto | isolamento lógico por `accountId` em toda regra de leitura/escrita (ADR-009); testes de regras cobrindo cross-tenant | Baixo |
| R3 | Vazamento por credencial de professor comprometida | Média | Alto | senha e sessão geridas pelo Firebase Auth; App Check nas funções `callable`; registros de acesso. **Decisão 2026-09-10:** MFA fica para depois do MVP | Médio (aceito no MVP) |
| R4 | Dados de aluno menor tratados sem consentimento válido do responsável (declaração falsa ou equivocada do professor) | Média | Alto | fluxo RF-021 (sem autocadastro de menor); termo modelo fornecido; registro `GUARDIAN_CONSENT`; Política de Privacidade explícita. **Decisão 2026-09-10:** aceito no MVP com o plano de reforço da seção 4 | Médio (aceito no MVP) |
| R5 | Coleta ou retenção excessiva de dados de menores | Média | Médio | minimização (seção 3.2); **cadastro sem data de nascimento** (só `isMinor`); `purgeExpiredData` aplica a retenção | Baixo |
| R6 | Reidentificação de um aluno após pedido de exclusão | Baixa | Alto | `deleteUserData` substitui `studentId` por token não reversível e remove identificadores diretos; `contentSnapshot` do aluno não guarda PII de terceiros | Baixo |
| R7 | Nota/gabarito de um aluno expostos a colegas antes da liberação | Média | Baixo | gabarito nunca trafega ao client (`assignmentKeys` fechado); resultado retido por `resultsReleased` (ADR-013) | Baixo |
| R8 | Transferência internacional de dados sem base adequada | Média | Médio | Firestore/Functions em `southamerica-east1`; DPA do Google Cloud com cláusulas-padrão (art. 33); registro da transferência no `registro-de-tratamento.md` | Baixo |
| R9 | Incidente de segurança sem contenção/notificação adequada | Baixa | Alto | Cloud Logging + Error Reporting; `plano-resposta-incidentes.md` v1.0 (fluxo, prazos, papéis, modelo de registro). **Teste de mesa obrigatório antes do go-live** | Médio até o teste; Baixo depois |
| R10 | Dados pessoais em excesso nos logs de auditoria | Média | Médio | política de log estruturado sem PII além do necessário; retenção de 6 meses; revisão na Fase 6 | Baixo |
| R11 | Acesso de suporte da controladora a dados de um professor de forma não rastreada (Fase 8) | Baixa | Alto | acesso de suporte sempre auditado, nunca silencioso (ADR-009); só read-only para diagnóstico | Baixo |
| R12 | Perda de progresso do aluno (integridade) por escrita direta em `answers` | Baixa | Baixo | escrita permitida só ao dono e só enquanto `IN_PROGRESS`; `submitAttempt` congela (ADR-006) | Baixo |

### Decisões sobre riscos residuais (2026-09-10)

- **R3 (credencial de professor):** MFA **adiado para depois do MVP**. Risco médio aceito; reavaliar antes/junto do lançamento comercial.
- **R4 (consentimento parental):** **aceito no MVP** com o plano de reforço da seção 4 (e-mail ao responsável + upload do termo), a implementar pós-lançamento.
- **R9 (resposta a incidente):** plano simples criado (`plano-resposta-incidentes.md`); **teste de mesa obrigatório antes do go-live** (item de verificação da Fase 7).

---

## 7. Medidas de segurança e governança (art. 46 a 49)

**Técnicas**

- Autenticação gerida pelo Firebase Authentication (ADR-004); autorização em duas camadas — custom claims + Firestore Security Rules (ADR-005).
- Toda escrita que determina nota/resultado passa por Cloud Function com Admin SDK; nunca por escrita direta do client (RN-008).
- Gabarito isolado em `assignmentKeys`, sem leitura pelo client (ADR-012); resultados retidos até liberação (ADR-013).
- App Check nas funções `callable` (Fase 6).
- Criptografia em trânsito (padrão Firebase Hosting/Functions) e em repouso (padrão Firestore).
- Isolamento lógico multi-tenant por `accountId` (ADR-009).
- Região de dados `southamerica-east1`.
- Suíte de testes de Security Rules no emulador, obrigatória no CI antes de cada deploy.
- Cloud Function `purgeExpiredData` para aplicar a retenção; `exportUserData` / `deleteUserData` para os direitos do titular.

**Organizacionais**

- Registro das operações de tratamento mantido e versionado (`registro-de-tratamento.md`, art. 37).
- Textos legais versionados no repositório, alterados só por Pull Request.
- Encarregado designado, com canal público.
- Plano de resposta a incidentes: `plano-resposta-incidentes.md` v1.0 — **teste de mesa pendente (antes do go-live)**.
- Política de retenção formal **[pendente]** (defaults no ADR-011).
- Três ambientes separados (`dev`/`staging`/`prod`); deploy de produção só por ação explícita (ADR-008).
- Acesso de suporte auditado (ADR-009).

**[pendente]** definir periodicidade de revisão deste RIPD (sugestão: a cada mudança relevante e, no mínimo, anual).

---

## 8. Conclusão e parecer do encarregado

**[a preencher antes do go-live — Fase 7]**

Estrutura do parecer:

- os riscos identificados são proporcionais à finalidade e às expectativas dos titulares?
- as medidas da seção 7 reduzem os riscos a um nível aceitável?
- os riscos residuais R3, R4 e R9 estão tratados por decisão explícita e plano com prazo?
- o tratamento de dados de menores atende ao art. 14 no MVP, com o plano de reforço registrado?
- recomendação: **prosseguir / prosseguir com condições / não prosseguir** até o lançamento.

Parecer de: Stanke Scandelari (encarregado) — data e assinatura na versão final.

---

## 9. Controle de revisão

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 rascunho | 2026-09-10 | Stanke Scandelari | Primeira versão, consolidando ADRs 001–014, `registro-de-tratamento.md` e `termos-e-consentimento.md` |
| 1.1 rascunho | 2026-09-10 | Stanke Scandelari | Decisões sobre R3 (MFA adiado), R4 (aceito no MVP c/ plano), R9 (plano de incidentes criado); cadastro sem data de nascimento (`isMinor`) |

### Itens a verificar antes do lançamento (Fase 7)

1. Nome / CPF ou CNPJ da controladora.
2. Confirmar prazos de retenção (`politica-de-retencao.md`).
3. ✅ Cadastro sem data de nascimento — feito na especificação (só `isMinor`).
4. ✅ MFA para professor — decidido: adiado para pós-MVP.
5. Teste de mesa do plano de resposta a incidentes (`plano-resposta-incidentes.md`).
6. ✅ Reforço do consentimento parental — decidido: aceito no MVP, reforço pós-lançamento (plano na seção 4).
7. Revisão jurídica de todo o conjunto LGPD.
8. Parecer do encarregado (seção 8) e assinatura.
9. Definir a periodicidade de revisão do RIPD.
9. Periodicidade de revisão do RIPD.
