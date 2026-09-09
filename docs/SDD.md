# SDD — English Learning Classroom

**Versão:** 0.2.0  
**Status:** Draft / Baseline para descoberta e modelagem  
**Tipo:** Software Design Document (SDD)  
**Objetivo:** Especificar uma plataforma web de apoio ao ensino de inglês, com foco em leitura, escrita, vocabulário, significado, tradução/localização e avaliação.

**Atualização 0.2.0:** incorporadas duas frentes transversais — (a) landing page pública para divulgação da plataforma (ADR-010) e (b) conformidade com a LGPD desde o desenvolvimento, incluindo o tratamento de dados de alunos menores de idade (Art. 14 — ADR-011). As mudanças estão nas seções 1.3, 2, 3, 4, 15, 19, 22, 25, 29 e 31.

---

# 1. Visão do Produto

## 1.1 Objetivo

Criar uma plataforma web que permita a professores de inglês criar salas virtuais e atividades interativas de leitura e escrita, enquanto alunos podem ingressar nas salas e realizar exercícios.

A plataforma deverá separar claramente os contextos de **Professor**, **Aluno** e, futuramente, **Administrador**.

Fluxo conceitual:

```text
Professor
   |
   v
Sala
   |
   v
Atividades
   |
   v
Aluno
   |
   v
Respostas
   |
   v
Avaliação
   |
   v
Resultados / Progresso
```

## 1.2 Objetivos de negócio

- Facilitar a criação e aplicação de exercícios de inglês.
- Permitir atividades interativas em ambiente web.
- Reduzir o trabalho manual do professor na avaliação de atividades objetivas.
- Centralizar salas, atividades, alunos e resultados.
- Permitir acompanhamento da evolução dos alunos.
- Criar uma arquitetura extensível para novos tipos de exercícios.

## 1.3 Escopo inicial

O MVP deverá contemplar:

- autenticação;
- usuários com papéis de Professor e Aluno;
- criação e gerenciamento de salas;
- código para autoinscrição;
- inscrição manual de alunos;
- criação de atividades;
- publicação de atividades;
- resolução de atividades;
- submissão de respostas;
- avaliação automática das atividades objetivas;
- visualização de resultados;
- acompanhamento básico pelo professor;
- landing page pública com informações do produto e páginas legais (privacidade, termos, cookies) — ver ADR-010;
- aviso de cookies na primeira visita (apenas cookies essenciais no MVP) — ver ADR-011;
- conformidade com a LGPD: base legal de tratamento, transparência, atendimento aos direitos do titular e tratamento diferenciado de dados de menores (Art. 14) — ver ADR-011.

## 1.4 Fora do escopo inicial

Não fazem parte do MVP:

- pagamentos;
- marketplace de cursos;
- videoconferência;
- geração de conteúdo por IA;
- aplicativo mobile nativo;
- integração com LMS externos;
- correção automática avançada de textos;
- gamificação completa.

Esses itens poderão fazer parte do roadmap.

---

# 2. Personas

## 2.1 Professor

Responsável por criar salas, preparar atividades, acompanhar alunos e analisar resultados.

### Necessidades

- criar atividades rapidamente;
- reutilizar conteúdo;
- controlar alunos;
- visualizar respostas;
- identificar dificuldades;
- fornecer feedback.

## 2.2 Aluno

Usuário que participa das salas e realiza atividades.

### Necessidades

- acessar suas salas;
- ingressar por código;
- entender claramente as instruções;
- responder exercícios;
- receber feedback;
- acompanhar seu progresso.

## 2.3 Administrador

Persona futura responsável pela operação da plataforma.

Responsabilidades potenciais:

- gerenciamento de usuários;
- suporte;
- moderação;
- configurações globais;
- auditoria;
- métricas da plataforma.

## 2.4 Responsável legal

Pai, mãe ou responsável por um aluno menor de idade. Não acessa a plataforma diretamente no MVP, mas é quem fornece o consentimento (Art. 14 da LGPD) para o tratamento dos dados do aluno menor. A coleta e a guarda desse consentimento são intermediadas pelo professor ou pela escola (ver ADR-011).

### Necessidades

- entender quais dados do menor são tratados e para quê;
- poder solicitar acesso, correção ou exclusão dos dados do menor;
- ter um canal para falar com o encarregado (DPO).

## 2.5 Encarregado (DPO)

Pessoa indicada como canal de comunicação entre a controladora, os titulares e a ANPD (Art. 41 da LGPD). Papel operacional/jurídico, não um usuário de sistema no MVP; seu contato é publicado na Política de Privacidade.

---

# 3. Requisitos Funcionais

## RF-001 — Cadastro

O sistema deve permitir o cadastro de usuários. O fluxo é detalhado em RF-021 (verificação de idade e consentimento parental) e RF-019 (aceite de textos legais).

## RF-002 — Autenticação

O sistema deve permitir login e logout.

## RF-003 — Controle de acesso

O sistema deve controlar acesso conforme o papel do usuário.

Papéis:

```text
TEACHER
STUDENT
ADMIN
```

## RF-004 — Criar sala

Professor deve poder criar uma sala informando:

- nome;
- descrição;
- status.

O sistema deverá gerar um código único para autoinscrição.

## RF-005 — Gerenciar sala

Professor deve poder:

- editar;
- ativar;
- desativar;
- arquivar;
- visualizar alunos;
- visualizar atividades.

## RF-006 — Autoinscrição

Aluno deve poder informar o código de uma sala ativa para ingressar nela.

## RF-007 — Inscrição manual

Professor deve poder adicionar alunos a uma sala.

## RF-008 — Criar atividade

Professor deve poder criar atividades associadas a uma sala.

## RF-009 — Tipos de atividade

O MVP deverá suportar:

- preencher espaços;
- relacionamento de significados;
- tradução/localização;
- múltipla escolha.

Tipos futuros:

- leitura e compreensão;
- verdadeiro/falso;
- escrita aberta;
- ordenação;
- associação de sentenças;
- vocabulário;
- gramática.

## RF-010 — Configurar atividade

Professor deve poder definir:

- título;
- instruções;
- conteúdo;
- questões;
- respostas corretas;
- pontuação;
- dificuldade;
- possibilidade de tentativa;
- prazo;
- status de publicação.

## RF-011 — Publicar atividade

Atividades poderão estar nos estados:

```text
DRAFT
PUBLISHED
CLOSED
ARCHIVED
```

## RF-012 — Resolver atividade

Aluno deve poder iniciar uma atividade publicada e disponível.

## RF-013 — Salvar progresso

O sistema deverá permitir persistir o progresso quando aplicável.

## RF-014 — Submeter atividade

Aluno deve poder enviar sua tentativa.

## RF-015 — Avaliação automática

Atividades objetivas devem ser avaliadas automaticamente.

## RF-016 — Avaliação manual

Atividades abertas futuras deverão permitir avaliação manual pelo professor.

## RF-017 — Visualizar resultado

Aluno poderá visualizar:

- nota;
- acertos;
- erros;
- feedback;
- tentativa.

## RF-018 — Acompanhar desempenho

Professor poderá visualizar resultados por:

- sala;
- atividade;
- aluno.

## RF-019 — Consentimento, cookies e textos legais

O sistema deve:

- exibir um aviso de cookies na primeira visita (no MVP, informativo — apenas cookies essenciais são usados);
- disponibilizar páginas públicas de Política de Privacidade, Termos de Uso e Política de Cookies;
- exigir aceite explícito (checkbox não pré-marcado) dos Termos e da Política de Privacidade no cadastro;
- registrar o consentimento com data/hora, identificação do titular e versão do texto aceito.

## RF-020 — Direitos do titular

O sistema deve permitir que o usuário autenticado:

- exporte seus dados pessoais em formato legível por máquina (portabilidade);
- corrija dados cadastrais incorretos;
- solicite a exclusão da própria conta, com anonimização das tentativas/respostas associadas (preservando estatística agregada da turma).

Para dados de alunos menores, as solicitações do responsável legal são atendidas via professor/escola ou pelo canal do encarregado.

## RF-021 — Cadastro com verificação de idade e consentimento parental

No cadastro:

- o professor aceita Termos e Política de Privacidade em nome próprio;
- o aluno informa data de nascimento (ou faixa etária);
- aluno maior de 18 anos completa o cadastro com aceite próprio;
- aluno menor de 18 anos não faz cadastro self-service: a conta é criada/vinculada pelo professor ou escola, que declara ter obtido o consentimento do responsável legal, usando o modelo de termo fornecido pela plataforma (ver ADR-011).

---

# 4. Requisitos Não Funcionais

## RNF-001 — Responsividade

A aplicação deverá funcionar em desktop, tablet e dispositivos móveis.

## RNF-002 — Segurança

- senhas armazenadas de forma segura;
- comunicação HTTPS;
- autorização por papel;
- validação de entrada;
- proteção contra acesso indevido a recursos.

## RNF-003 — Performance

Operações comuns de navegação deverão responder rapidamente sob carga normal.

## RNF-004 — Escalabilidade

A arquitetura deverá permitir crescimento horizontal da aplicação.

## RNF-005 — Manutenibilidade

O código deverá ser modular e orientado a domínio.

## RNF-006 — Observabilidade

A aplicação deverá possuir:

- logs estruturados;
- métricas;
- rastreamento de erros;
- auditoria de operações relevantes.

## RNF-007 — Acessibilidade

A interface deverá buscar conformidade com boas práticas WCAG, especialmente:

- navegação por teclado;
- contraste;
- labels;
- feedback visual e textual;
- compatibilidade com tecnologias assistivas.

## RNF-008 — Privacidade e proteção de dados (LGPD)

O desenvolvimento deverá observar a Lei 13.709/2018 desde o design (privacy by design):

- toda operação de tratamento de dados pessoais deve ter base legal identificada e registrada;
- coleta limitada ao mínimo necessário à finalidade (minimização), com atenção reforçada para dados de menores (Art. 14);
- prazos de retenção definidos por categoria de dado, com expurgo/anonimização automatizados;
- Relatório de Impacto à Proteção de Dados Pessoais (RIPD) elaborado antes do lançamento;
- registro das operações de tratamento mantido e versionado (`docs/lgpd/`);
- plano de resposta a incidentes com notificação à ANPD e aos titulares;
- transferência internacional de dados (infraestrutura Firebase) amparada em hipótese do Art. 33 e documentada.

Detalhamento em ADR-011.

---

# 5. Arquitetura Conceitual

A recomendação inicial é utilizar um **Monólito Modular**, evitando complexidade prematura de microserviços.

```text
+------------------------------------------------+
|                 Web Application                |
+------------------------------------------------+
|                                                |
|  Teacher Portal          Student Portal        |
|         |                       |              |
+---------+-----------------------+--------------+
|              Application API                   |
+------------------------------------------------+
| Authentication | Classes | Activities         |
| Enrollment     | Attempts | Evaluation         |
| Reports        | Content  | Users              |
+------------------------------------------------+
|                  Domain Layer                  |
+------------------------------------------------+
| PostgreSQL | Cache | Object Storage (future)  |
+------------------------------------------------+
```

---

# 6. Stack Tecnológica Sugerida

## Frontend

- Next.js
- React
- TypeScript
- biblioteca de componentes acessíveis
- biblioteca de drag-and-drop

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy

## Banco

- PostgreSQL

## Infraestrutura

Inicialmente:

```text
Web Browser
    |
    v
Frontend
    |
    v
Backend API
    |
    v
PostgreSQL
```

A escolha definitiva da infraestrutura deverá ser registrada em ADR (Architecture Decision Record).

---

# 7. Modelo de Domínio

Entidades principais:

```text
User
 |
 +---- Teacher
 |
 +---- Student
 |
 +---- Admin

Teacher
 |
 +---- Class
          |
          +---- Enrollment
          |
          +---- Activity
                    |
                    +---- ActivityItem
                    |
                    +---- Attempt
                              |
                              +---- Answer
```

## 7.1 User

```text
User
- id
- name
- email
- password_hash
- role
- status
- created_at
- updated_at
```

## 7.2 Class

```text
Class
- id
- teacher_id
- name
- description
- enrollment_code
- status
- created_at
- updated_at
```

## 7.3 Enrollment

```text
Enrollment
- id
- class_id
- student_id
- enrollment_type
- status
- created_at
```

`enrollment_type`:

```text
SELF_ENROLLMENT
TEACHER_ASSIGNED
```

## 7.4 Activity

```text
Activity
- id
- class_id
- title
- description
- type
- difficulty
- status
- position
- allow_retry
- max_attempts
- published_at
- due_date
- created_at
- updated_at
```

## 7.5 ActivityItem

Representa uma unidade de questão dentro de uma atividade.

```text
ActivityItem
- id
- activity_id
- position
- prompt
- configuration
- points
```

`configuration` deverá ser validada de acordo com o tipo da atividade.

## 7.6 Attempt

```text
Attempt
- id
- activity_id
- student_id
- started_at
- submitted_at
- status
- score
- max_score
```

Estados:

```text
IN_PROGRESS
SUBMITTED
GRADED
CANCELLED
```

## 7.7 Answer

```text
Answer
- id
- attempt_id
- activity_item_id
- answer_payload
- is_correct
- points_awarded
- feedback
```

---

# 8. Activity Engine

O Activity Engine é o principal mecanismo extensível da plataforma.

```text
                    Activity Engine
                          |
          +---------------+---------------+
          |               |               |
       Builder         Renderer       Validator
          |               |               |
          v               v               v
      Professor         Aluno         Avaliação
```

Cada tipo de atividade deverá possuir, conceitualmente:

```text
ActivityType
├── Builder
├── Renderer
├── Validator
└── ScoreCalculator
```

Isso permitirá adicionar novos exercícios sem alterar o núcleo da aplicação.

---

# 9. Tipos de Atividade

## 9.1 Fill in the Blanks

Professor fornece texto e marca palavras que deverão ser removidas.

Exemplo:

```text
Texto original:

I usually wake up at 7 o'clock.

Palavra selecionada:

wake
```

Aluno:

```text
I usually ______ up at 7 o'clock.
```

Possíveis configurações:

```text
mode:
  TYPING
  WORD_BANK
  DRAG_AND_DROP
```

## 9.2 Meaning Matching

Professor cria pares:

```text
apple -> maçã
house -> casa
book  -> livro
car   -> carro
```

Sistema embaralha os elementos.

Aluno relaciona por drag-and-drop.

## 9.3 Translation / Localization

Professor cria:

```text
Source:
I am hungry.

Options:
Estou com fome.
Estou cansado.
Estou feliz.
```

Aluno seleciona ou relaciona a tradução correta.

A atividade poderá suportar:

```text
DRAG_AND_DROP
INDEXING
MULTIPLE_CHOICE
```

## 9.4 Multiple Choice

Professor cria uma questão e alternativas.

```text
Question:
Where does John live?

A. London
B. Paris
C. Dublin
D. Madrid
```

## 9.5 Reading Comprehension — futuro

Professor fornece um texto e perguntas associadas.

Tipos possíveis:

- múltipla escolha;
- resposta curta;
- verdadeiro/falso;
- preenchimento.

## 9.6 Writing — futuro

Aluno produz resposta textual livre.

Professor poderá avaliar:

- manualmente;
- por rubrica;
- futuramente com auxílio de IA.

---

# 10. Casos de Uso UML

## UC-001 — Autenticar usuário

**Ator:** Usuário

### Fluxo principal

1. Usuário informa e-mail e senha.
2. Sistema valida credenciais.
3. Sistema cria sessão/token.
4. Sistema identifica o papel do usuário.
5. Sistema direciona ao portal correspondente.

---

## UC-002 — Criar sala

**Ator:** Professor

### Pré-condições

- professor autenticado.

### Fluxo

1. Professor acessa "Minhas Salas".
2. Seleciona "Criar Sala".
3. Informa nome e descrição.
4. Sistema valida dados.
5. Sistema cria sala.
6. Sistema gera código de inscrição.
7. Sistema apresenta a sala.

### Pós-condição

Sala ativa criada e associada ao professor.

---

## UC-003 — Entrar em sala por código

**Ator:** Aluno

### Fluxo

1. Aluno acessa "Entrar em Sala".
2. Informa código.
3. Sistema procura sala.
4. Sistema verifica se está ativa.
5. Sistema verifica se o aluno já está inscrito.
6. Sistema cria Enrollment.
7. Sala passa a aparecer no portal do aluno.

---

## UC-004 — Criar atividade

**Ator:** Professor

### Fluxo

1. Professor acessa uma sala.
2. Seleciona "Nova Atividade".
3. Escolhe tipo.
4. Sistema apresenta Builder correspondente.
5. Professor configura atividade.
6. Professor salva como rascunho.

---

## UC-005 — Publicar atividade

**Ator:** Professor

### Fluxo

1. Professor abre atividade em DRAFT.
2. Sistema valida configuração.
3. Professor seleciona publicar.
4. Sistema altera status para PUBLISHED.
5. Alunos elegíveis passam a visualizar a atividade.

---

## UC-006 — Resolver atividade

**Ator:** Aluno

### Fluxo

1. Aluno acessa sala.
2. Seleciona atividade publicada.
3. Sistema cria ou recupera tentativa.
4. Aluno responde questões.
5. Sistema salva progresso.
6. Aluno envia atividade.
7. Sistema valida respostas.
8. Sistema calcula resultado.
9. Sistema apresenta resultado quando permitido.

---

## UC-007 — Visualizar desempenho

**Ator:** Professor

Professor poderá consultar:

```text
Sala
 |
 +-- Aluno A
 |     +-- Atividade 1: 90%
 |     +-- Atividade 2: 70%
 |
 +-- Aluno B
       +-- Atividade 1: 100%
       +-- Atividade 2: 80%
```

---

# 11. Relacionamentos UML

## 11.1 Relacionamentos principais

```text
User "1" ---- "0..*" Class
Teacher "1" ---- "0..*" Class

Class "1" ---- "0..*" Enrollment
Student "1" ---- "0..*" Enrollment

Class "1" ---- "0..*" Activity

Activity "1" ---- "1..*" ActivityItem

Student "1" ---- "0..*" Attempt
Activity "1" ---- "0..*" Attempt

Attempt "1" ---- "0..*" Answer
ActivityItem "1" ---- "0..*" Answer
```

## 11.2 Regras

- Uma sala pertence a um professor.
- Uma sala pode possuir zero ou muitos alunos.
- Um aluno pode estar em zero ou muitas salas.
- Uma sala pode possuir zero ou muitas atividades.
- Uma atividade deve possuir pelo menos um item antes de ser publicada.
- Um aluno pode possuir múltiplas tentativas se a configuração permitir.
- Uma resposta pertence a uma tentativa e a um item de atividade.

---

# 12. Máquina de Estados

## 12.1 Activity

```text
          +--------+
          | DRAFT  |
          +---+----+
              |
           Publish
              |
              v
       +-------------+
       |  PUBLISHED  |
       +------+------+ 
              |
        Close/Archive
              |
              v
       +-------------+
       | CLOSED      |
       +-------------+
```

## 12.2 Attempt

```text
+-------------+
| IN_PROGRESS |
+------+------+
       |
    Submit
       |
       v
+-------------+
|  SUBMITTED  |
+------+------+
       |
    Evaluate
       |
       v
+-------------+
|   GRADED    |
+-------------+
```

---

# 13. Fluxos de Atividade

## 13.1 Criação

```text
Professor
   |
   v
Seleciona sala
   |
   v
Nova atividade
   |
   v
Seleciona tipo
   |
   v
Activity Builder
   |
   v
Configura conteúdo
   |
   v
Validação
   |
   v
DRAFT
   |
   v
PUBLICAR
```

## 13.2 Execução

```text
Aluno
  |
  v
Sala
  |
  v
Atividade
  |
  v
Iniciar
  |
  v
Attempt(IN_PROGRESS)
  |
  v
Responder
  |
  v
Enviar
  |
  v
Validator
  |
  v
Score Calculator
  |
  v
Resultado
```

---

# 14. API — Contrato Conceitual

A API deverá ser RESTful no MVP.

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Classes

```text
GET    /api/v1/classes
POST   /api/v1/classes
GET    /api/v1/classes/{classId}
PATCH  /api/v1/classes/{classId}
DELETE /api/v1/classes/{classId}
POST   /api/v1/classes/join
GET    /api/v1/classes/{classId}/students
```

## Activities

```text
GET    /api/v1/classes/{classId}/activities
POST   /api/v1/classes/{classId}/activities
GET    /api/v1/activities/{activityId}
PATCH  /api/v1/activities/{activityId}
DELETE /api/v1/activities/{activityId}
POST   /api/v1/activities/{activityId}/publish
```

## Attempts

```text
POST /api/v1/activities/{activityId}/attempts
GET  /api/v1/attempts/{attemptId}
PATCH /api/v1/attempts/{attemptId}
POST /api/v1/attempts/{attemptId}/submit
```

## Results

```text
GET /api/v1/attempts/{attemptId}/result
GET /api/v1/classes/{classId}/results
GET /api/v1/classes/{classId}/students/{studentId}/results
```

A especificação detalhada de request/response deverá ser criada posteriormente em OpenAPI.

---

# 15. Autorização

O acesso deverá seguir RBAC.

## Professor

Pode:

```text
CREATE_CLASS
UPDATE_OWN_CLASS
MANAGE_ENROLLMENTS
CREATE_ACTIVITY
UPDATE_OWN_ACTIVITY
PUBLISH_ACTIVITY
VIEW_CLASS_RESULTS
```

## Aluno

Pode:

```text
JOIN_CLASS
VIEW_ENROLLED_CLASS
VIEW_PUBLISHED_ACTIVITY
CREATE_ATTEMPT
SUBMIT_ATTEMPT
VIEW_OWN_RESULT
```

## Administrador

Terá permissões administrativas futuras.

## Responsável legal / Encarregado

Não são papéis com credencial de acesso no MVP. O responsável legal exerce os direitos do titular sobre os dados do aluno menor por meio do professor/escola ou do canal do encarregado (ver seção 19 — Privacidade, e ADR-011).

---

# 16. Regras de Negócio

## RN-001

Código de sala deve ser único.

## RN-002

Somente salas ativas podem aceitar autoinscrição.

## RN-003

Aluno não pode ingressar duas vezes na mesma sala.

## RN-004

Somente o professor proprietário pode editar sua sala.

## RN-005

Somente atividades publicadas podem ser iniciadas por alunos.

## RN-006

Uma atividade não pode ser publicada se sua configuração for inválida.

## RN-007

Número de tentativas deve respeitar `max_attempts`.

## RN-008

Resultado objetivo deve ser calculado pelo servidor.

## RN-009

Aluno só pode consultar seus próprios resultados, salvo permissões administrativas.

## RN-010

Professor só pode visualizar resultados das salas sob sua responsabilidade.

---

# 17. UX/UI

## Portal do Professor

Principais áreas:

```text
Dashboard
├── Minhas Salas
├── Criar Sala
├── Atividades
├── Resultados
└── Perfil
```

## Portal do Aluno

```text
Dashboard
├── Minhas Salas
├── Entrar em Sala
├── Atividades
├── Meu Progresso
└── Perfil
```

## Princípios

- interface simples;
- foco na atividade;
- feedback imediato;
- responsividade;
- acessibilidade;
- consistência visual;
- poucos passos para criar exercícios.

---

# 18. Modelo de Dados — ER Conceitual

```text
+---------+       +---------+
|  USER   |       |  CLASS  |
+---------+       +---------+
| id      |<------| teacher |
| name    |       | id      |
| email   |       | name    |
| role    |       | code    |
+---------+       +----+----+
                       |
                       |
                 +-----v------+
                 | ENROLLMENT |
                 +------------+
                 | class_id   |
                 | student_id |
                 | type       |
                 +------------+
                       |
                 +-----v------+
                 |  ACTIVITY  |
                 +------------+
                 | id         |
                 | class_id   |
                 | type       |
                 | status     |
                 +-----+------+
                       |
                 +-----v---------+
                 | ACTIVITY_ITEM |
                 +---------------+
                 | id            |
                 | activity_id   |
                 | configuration |
                 +-------+-------+
                         |
                    +----v----+
                    | ANSWER  |
                    +----+----+
                         |
                    +----v----+
                    | ATTEMPT |
                    +---------+
```

---

# 19. Segurança

## Autenticação

Recomendação:

- access token de curta duração;
- refresh token quando necessário;
- hash seguro de senha;
- recuperação de senha;
- expiração de sessão.

## Autorização

Toda operação sensível deverá validar:

```text
Authenticated User
        |
        v
Role Permission
        |
        v
Resource Ownership
        |
        v
Operation
```

## Proteções

Implementar:

- validação de entrada;
- rate limiting;
- proteção contra brute force;
- CORS configurado;
- CSRF quando aplicável;
- headers de segurança;
- logs de auditoria.

## Privacidade

O tratamento de dados pessoais segue a LGPD (RNF-008, ADR-011):

- base legal por operação (execução de contrato, legítimo interesse ou consentimento);
- consentimento específico do responsável legal para alunos menores (Art. 14);
- direitos do titular atendidos em até 15 dias (RF-020);
- logs de auditoria não devem registrar dados pessoais além do necessário;
- acesso de suporte a dados de um professor sempre auditado, nunca silencioso.

---

# 20. Observabilidade

Eventos importantes:

```text
USER_LOGIN
CLASS_CREATED
CLASS_JOINED
ACTIVITY_CREATED
ACTIVITY_PUBLISHED
ATTEMPT_STARTED
ATTEMPT_SUBMITTED
ATTEMPT_GRADED
```

Métricas futuras:

- usuários ativos;
- salas ativas;
- atividades concluídas;
- taxa média de acerto;
- tempo médio por atividade;
- taxa de abandono.

---

# 21. Estratégia de Testes

## Unitários

Testar:

- regras de negócio;
- validators;
- score calculators;
- autorização;
- transições de estado.

## Integração

Testar:

- API + banco;
- autenticação;
- inscrição;
- criação de atividade;
- submissão;
- avaliação.

## E2E

Cenário principal:

```text
Professor cadastra
    ->
Cria sala
    ->
Aluno entra por código
    ->
Professor cria atividade
    ->
Publica
    ->
Aluno resolve
    ->
Aluno envia
    ->
Sistema corrige
    ->
Professor visualiza resultado
```

## Testes específicos de UI

Principalmente:

- drag-and-drop;
- responsividade;
- teclado;
- acessibilidade;
- feedback de erro;
- recuperação de estado.

---

# 22. Critérios de Aceitação do MVP

## Sala

- [ ] Professor consegue criar sala.
- [ ] Sistema gera código único.
- [ ] Aluno consegue ingressar usando código.
- [ ] Professor consegue visualizar alunos.
- [ ] Aluno consegue visualizar suas salas.

## Atividades

- [ ] Professor consegue criar atividade.
- [ ] Professor consegue selecionar tipo.
- [ ] Professor consegue salvar rascunho.
- [ ] Professor consegue publicar.
- [ ] Aluno consegue visualizar atividade publicada.

## Execução

- [ ] Aluno consegue iniciar atividade.
- [ ] Sistema cria tentativa.
- [ ] Respostas são persistidas.
- [ ] Aluno consegue enviar.
- [ ] Sistema calcula resultado objetivo.

## Resultados

- [ ] Aluno consegue visualizar seu resultado.
- [ ] Professor consegue visualizar resultados da turma.
- [ ] Professor consegue visualizar desempenho individual.

## Privacidade e conformidade

- [ ] Landing page pública no ar com páginas de privacidade, termos e cookies.
- [ ] Aviso de cookies exibido na primeira visita.
- [ ] Cadastro exige aceite de Termos e Política de Privacidade, com registro versionado do consentimento.
- [ ] Aluno menor de idade só é cadastrado via professor/escola, com declaração de consentimento do responsável.
- [ ] Usuário consegue exportar e excluir seus dados pelo portal.
- [ ] RIPD concluído e revisado antes do go-live.
- [ ] Registro das operações de tratamento (`docs/lgpd/`) preenchido.

---

# 23. Backlog Inicial

## Épico 1 — Identity

```text
US-001 Cadastro de usuário
US-002 Login
US-003 Logout
US-004 Recuperação de senha
```

## Épico 2 — Classes

```text
US-010 Criar sala
US-011 Editar sala
US-012 Arquivar sala
US-013 Gerar código
US-014 Entrar por código
US-015 Adicionar aluno
US-016 Remover aluno
```

## Épico 3 — Activities

```text
US-020 Criar atividade
US-021 Editar atividade
US-022 Publicar atividade
US-023 Despublicar atividade
US-024 Preencher espaços
US-025 Relacionamento de significados
US-026 Tradução/localização
US-027 Múltipla escolha
```

## Épico 4 — Learning

```text
US-030 Iniciar atividade
US-031 Salvar progresso
US-032 Enviar atividade
US-033 Ver resultado
US-034 Refazer atividade
```

## Épico 5 — Analytics

```text
US-040 Ver resultados da turma
US-041 Ver desempenho do aluno
US-042 Ver desempenho por atividade
```

---

# 24. Roadmap

## Fase 1 — MVP

- autenticação;
- professor;
- aluno;
- salas;
- inscrições;
- quatro tipos de atividade;
- tentativas;
- avaliação automática;
- resultados.

## Fase 2 — Learning Experience

- leitura;
- escrita;
- feedback;
- múltiplas tentativas;
- progresso;
- histórico;
- relatórios.

## Fase 3 — Content Platform

- banco de vocabulário;
- banco de textos;
- tags;
- níveis CEFR;
- reutilização de conteúdo;
- templates.

## Fase 4 — Intelligence

Possibilidades:

- geração assistida de atividades;
- sugestão de exercícios;
- análise de erros;
- recomendações personalizadas;
- correção assistida de escrita.

---

# 25. Decisões Arquiteturais — ADRs

As seguintes decisões deverão ser documentadas antes da implementação:

```text
ADR-001 — Monólito modular vs. microserviços
ADR-002 — Framework frontend
ADR-003 — Framework backend
ADR-004 — Estratégia de autenticação
ADR-005 — Modelo de autorização
ADR-006 — Banco de dados
ADR-007 — Modelo do Activity Engine
ADR-008 — Estratégia de persistência das respostas
ADR-009 — Estratégia de drag-and-drop
ADR-010 — Estratégia de deploy
ADR-011 — Landing page e site institucional
ADR-012 — Conformidade com a LGPD
```

> Nota: os ADRs formais foram escritos e renumerados em `docs/adr/` ao adotar Firebase (ver `docs/adr/0001` em diante). O mapeamento não é 1:1 com a lista acima — a landing page está em `docs/adr/0010` e a LGPD em `docs/adr/0011`.

---

# 26. UML a ser produzido

A documentação UML deverá conter, no mínimo:

## Use Case Diagram

```text
                    +----------------+
                    |    Professor   |
                    +-------+--------+
                            |
              +-------------+-------------+
              |             |             |
          Criar Sala   Criar Atividade  Ver Resultados
              |
              |
              v
             Sala

                    +----------------+
                    |     Aluno      |
                    +-------+--------+
                            |
               +------------+------------+
               |            |            |
          Entrar Sala   Resolver      Ver Resultado
                       Atividade
```

## Class Diagram

Deverá representar:

```text
User
Teacher
Student
Class
Enrollment
Activity
ActivityItem
Attempt
Answer
```

## Sequence Diagram

Deverão ser produzidos diagramas para:

1. Login.
2. Criação de sala.
3. Autoinscrição.
4. Criação de atividade.
5. Publicação.
6. Resolução.
7. Submissão.
8. Avaliação.
9. Consulta de resultado.

## Activity Diagram

Fluxos:

- criação de sala;
- criação de atividade;
- resolução de atividade;
- avaliação.

## State Diagram

Para:

- Activity;
- Attempt;
- Class.

## ER Diagram

Para o modelo relacional do banco.

---

# 27. Convenções para UML

Para evitar ambiguidades:

- nomes de entidades no singular;
- nomes de casos de uso iniciados por verbo;
- relações com multiplicidade explícita;
- estados representados por substantivos/adjetivos claros;
- atores representados por papéis;
- detalhes de implementação não devem aparecer no Use Case Diagram;
- regras de negócio devem permanecer separadas dos diagramas estruturais.

---

# 28. Regras para Evolução do SDD

Este documento deverá ser considerado a **fonte de verdade do comportamento funcional e arquitetural**, mas não deverá ser alterado silenciosamente.

Mudanças relevantes deverão:

1. identificar o requisito afetado;
2. atualizar o SDD;
3. atualizar os diagramas UML afetados;
4. atualizar critérios de aceitação;
5. registrar ADR quando houver decisão arquitetural;
6. verificar impacto em API e banco;
7. manter histórico de versão.

---

# 29. Questões em Aberto

As seguintes decisões precisam ser definidas antes do design detalhado (ver `docs/OPEN-QUESTIONS.md` para o status e os defaults sugeridos de cada uma, incluindo as questões de LGPD adicionadas na v0.2.0):

- O cadastro será aberto ou por convite? *(parcial: aberto para professores; aluno menor de idade só via professor/escola — ver ADR-011 e RF-021)*
- Professor poderá compartilhar uma atividade entre salas?
- Uma atividade poderá pertencer a mais de uma sala?
- Aluno poderá sair de uma sala?
- Professor poderá permitir múltiplas tentativas?
- Como será calculada a nota?
- Haverá nota percentual, pontos ou ambos?
- Atividades terão peso?
- Haverá prazo obrigatório?
- O aluno verá a resposta correta imediatamente?
- O professor poderá bloquear a visualização das respostas?
- Como funcionará a correção de escrita?
- O sistema terá suporte a outros idiomas além de inglês/português?
- Haverá níveis CEFR obrigatórios?
- Conteúdo poderá ser reutilizado entre atividades?
- Haverá banco global de palavras?
- Haverá colaboração entre professores?
- Haverá administrador no MVP?
- Qual estratégia de hospedagem será utilizada?

Essas questões **não devem ser inferidas automaticamente** durante a especificação detalhada. Quando uma decisão alterar comportamento, domínio, segurança ou arquitetura, ela deverá ser explicitamente validada com o stakeholder.

---

# 30. Próxima Etapa de Engenharia

Antes da implementação, recomenda-se transformar este SDD em um conjunto formal de artefatos:

```text
SDD
 |
 +-- Requirements
 |
 +-- User Stories
 |
 +-- Use Cases
 |
 +-- Domain Model
 |
 +-- Class Diagram
 |
 +-- Sequence Diagrams
 |
 +-- Activity Diagrams
 |
 +-- State Diagrams
 |
 +-- ER Diagram
 |
 +-- API Specification
 |
 +-- ADRs
 |
 +-- Acceptance Criteria
 |
 +-- Test Strategy
 |
 +-- MVP Backlog
```

A implementação deverá iniciar somente após a validação das principais regras de negócio e dos casos de uso críticos.

---

# 31. Definition of Done — MVP

Uma funcionalidade será considerada concluída quando:

- [ ] requisito estiver documentado;
- [ ] caso de uso estiver definido quando aplicável;
- [ ] regras de negócio estiverem documentadas;
- [ ] modelo UML estiver atualizado quando afetado;
- [ ] API estiver documentada quando aplicável;
- [ ] testes unitários implementados;
- [ ] testes de integração implementados quando aplicável;
- [ ] critérios de aceitação atendidos;
- [ ] controle de autorização validado;
- [ ] impacto em privacidade avaliado (base legal, minimização, retenção) quando a mudança trata dados pessoais;
- [ ] textos legais e registro de tratamento (`docs/lgpd/`) atualizados quando aplicável;
- [ ] logs e tratamento de erros implementados;
- [ ] revisão de código concluída;
- [ ] documentação atualizada.

---

# 32. Status do Documento

**Status atual:** Draft.

Este documento representa a proposta inicial de arquitetura, domínio e requisitos. Decisões ainda não validadas devem ser tratadas como hipóteses e não como requisitos definitivos.

**Próximo marco:** validação dos requisitos, respostas às questões em aberto (incluindo as de LGPD), designação do encarregado (DPO), abertura do RIPD e elaboração dos diagramas UML detalhados.
