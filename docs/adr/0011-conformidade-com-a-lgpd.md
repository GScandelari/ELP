# ADR-011 — Conformidade com a LGPD (Lei 13.709/2018)

## Status

Proposto — decisão estruturante; afeta modelo de dados, cadastro, Cloud Functions e Security Rules desde a Fase 1, e a região dos projetos Firebase desde a Fase 0.

## Contexto

A plataforma trata dados pessoais de professores e alunos, e **alunos podem ser menores de idade** (turmas escolares e cursos infantis estão em escopo — decisão do stakeholder). Isso aciona o Art. 14 da LGPD (dados de crianças e adolescentes), além dos deveres gerais de base legal, transparência, segurança e atendimento aos direitos do titular.

O SDD original não tratava privacidade como requisito — apenas "segurança" genérica (RNF-002, seção 19). Esta ADR eleva a conformidade com a LGPD a requisito de projeto (privacy by design) e define como isso se materializa na arquitetura Firebase.

## Decisão

### 1. Papéis (Art. 5º)

- No modelo SaaS (ADR-009), a operadora da ELP é **controladora** dos dados de cadastro dos professores e **operadora** dos dados de alunos inseridos por cada professor/escola — que é **co-controlador** do conteúdo pedagógico e da relação com os alunos.
- Google/Firebase é **suboperador**. Necessário aceitar o Adendo de Tratamento de Dados (DPA) do Google Cloud em cada projeto e registrar a **transferência internacional** (Art. 33), amparada nas cláusulas contratuais padrão do DPA.
- Firestore e Functions são criados na região **`southamerica-east1` (São Paulo)** — reduz latência no Brasil e a superfície de transferência internacional. A região do Firestore **não pode ser alterada depois**, então a escolha acontece na Fase 0.

### 2. Bases legais (Art. 7º e 14)

- Cadastro e operação da conta do professor: **execução de contrato** (Art. 7º, V).
- Dados de aluno **maior de 18** inseridos pelo professor: **legítimo interesse** educacional do professor/escola (Art. 7º, IX) — configurável para consentimento por perfil de cliente.
- Aluno **menor de 18** (Art. 14): tratamento no **melhor interesse** da criança/adolescente; **consentimento específico e destacado de pelo menos um dos pais ou responsável legal**; coleta limitada ao mínimo necessário ao fim pedagógico; **sem perfilamento nem publicidade comportamental** direcionada a menores.

### 3. Fluxo de cadastro (revisa RF-001, cria RF-021)

- Professor: aceite de Termos + Política de Privacidade em checkbox **não pré-marcado**, com data/hora e versão do texto registrados.
- Aluno: coleta de **data de nascimento** para determinar se é menor.
  - Maior de 18: aceite próprio.
  - Menor de 18: **não há cadastro self-service** — a conta é criada/vinculada pelo professor ou escola, que declara ter obtido o consentimento do responsável legal, usando um **modelo de termo** fornecido pela plataforma. A plataforma registra a declaração; verificação reforçada (e-mail ao responsável, upload do termo) fica como questão em aberto.
- Minimização: aluno menor não fornece telefone, endereço, foto ou qualquer dado não essencial ao exercício.

### 4. Direitos do titular (Art. 18) — cria RF-020

- Autoatendimento no portal: **exportar meus dados** (JSON, portabilidade), **corrigir** cadastro, **excluir** minha conta.
- Exclusão = **anonimização** das tentativas/respostas (`studentId` substituído por token não reversível, identificadores diretos removidos), preservando as agregações de `resultsSummary`.
- Prazo de resposta: 15 dias (Art. 19). Canal do encarregado (DPO) publicado na Política de Privacidade.

### 5. Retenção e ciclo de vida

- Prazos por categoria de dado definidos em `docs/lgpd/politica-de-retencao.md` (defaults propostos: dados de conta enquanto a conta existir + 30 dias; logs de auditoria 6 meses; dados de alunos de uma conta encerrada anonimizados em até 30 dias).
- Cloud Function agendada `purgeExpiredData` aplica a política.

### 6. Segurança e registro (Art. 37, 38, 46, 48)

- **RIPD** (Relatório de Impacto à Proteção de Dados Pessoais) elaborado antes do go-live — obrigatório pelo tratamento de dados de menores. É bloqueio da Fase 7.
- **Registro das operações de tratamento** (Art. 37) mantido em `docs/lgpd/registro-de-tratamento.md`.
- Plano de resposta a incidentes com notificação à ANPD e aos titulares (Art. 48).
- Security Rules + App Check (já previstos) são parte das medidas técnicas; princípio do menor privilégio nas Functions.
- Logs de auditoria não registram dados pessoais além do necessário. Acesso de suporte a dados de um professor (ADR-009, Fase 8) é **sempre auditado, nunca silencioso**.

### 7. Cookies e rastreamento

- MVP: **somente cookies estritamente necessários** (sessão Firebase Auth, App Check, preferência de idioma). Exigem informação, não consentimento prévio — **banner informativo** + link para `/cookies`.
- Componente `<CookieConsent>` implementado já com arquitetura de categorias (necessário / analytics / marketing) e um `ConsentContext`; no MVP só "necessário" está ativo. Qualquer script não essencial fica **bloqueado até opt-in**.
- **Nenhuma** tag de terceiros (Google Analytics, Meta Pixel, etc.) no MVP.

## Consequências

- Fase 0: projetos Firebase em `southamerica-east1`; DPA do Google aceito e arquivado; RIPD aberto como documento vivo; encarregado (DPO) designado.
- Fase 1 cresce: age gate, versionamento de textos legais, função `recordConsent` e coleção `consents/{uid}`.
- Fase 6 ganha: funções `exportUserData` / `deleteUserData` / `purgeExpiredData`, telas de direitos do titular, componente `<CookieConsent>`, preenchimento do registro de tratamento.
- Fase 7: revisão jurídica dos textos e RIPD assinado — caminho crítico, depende de terceiro.
- Custo/tempo de assessoria jurídica para textos e RIPD.
- Nova coleção `consents/{uid}/records/{recordId}` (imutável, gravada só por Cloud Function).

## Alternativas consideradas

- **Restringir o MVP a maiores de 18:** eliminaria o Art. 14 e simplificaria o cadastro, mas o stakeholder decidiu incluir menores (o mercado escolar é o alvo). Não escolhida.
- **Tratar todo dado de aluno apenas com consentimento (sem legítimo interesse):** mais conservador, porém cria atrito operacional para o professor coletar consentimento individual de turmas inteiras. Decisão por perfil de cliente fica em aberto.
- **Adiar a LGPD para pós-MVP:** inaceitável — tratar dados de menores sem base legal e sem RIPD é risco jurídico direto desde o primeiro usuário real.
- **Região multirregião (`nam5`/`eur3`) ou `us-central1`:** melhor disponibilidade de features novas do Firebase, mas aumenta a transferência internacional e a latência no Brasil. Não escolhida.
