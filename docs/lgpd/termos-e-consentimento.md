# Termos e Consentimento — ELP (rascunho MVP)

**Status:** rascunho para o MVP, **sem revisão jurídica**. Serve para dar o start; endurecer com apoio jurídico após o lançamento (decisão registrada em [`../OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md)).
**Versão do texto:** 2026-09-10 (usar esta data como `textVersion` no registro de consentimento — ADR-011).

Reúne, de forma simples e direta, os textos que a plataforma precisa exibir/coletar no MVP:

1. Política de Privacidade (resumida)
2. Termo de Consentimento do Responsável Legal (aluno menor de 18)
3. Textos de aceite no cadastro
4. Termos de Uso — pendente (ver nota no fim)

Pendências de preenchimento antes de publicar: **nome/CPF ou CNPJ da controladora** (quem opera a ELP).

---

## 1. Política de Privacidade (resumida)

**Última atualização:** 2026-09-10

### Quem somos
A ELP (English Learning Platform) é uma plataforma web em que professores de inglês criam salas e atividades e alunos as realizam.

- **Controladora dos dados:** [NOME / CPF ou CNPJ — a definir].
- **Encarregado de Proteção de Dados (DPO):** Stanke Scandelari — **stanke399@gmail.com**.

### Quais dados tratamos
- **Professor:** nome, e-mail.
- **Aluno:** nome, e-mail, data de nascimento (para saber se é menor de idade), respostas e notas das atividades.
- **Uso da plataforma:** registros de acesso (data, hora, IP) para segurança.
- **Cookies:** apenas os estritamente necessários para manter você conectado e proteger o acesso. Não usamos cookies de publicidade nem de medição de audiência.

### Por que tratamos (base legal — LGPD)
- Criar/manter a conta e prestar o serviço: **execução de contrato**.
- Dados de alunos inseridos pelo professor: **legítimo interesse** educacional do professor/escola; para **alunos menores de 18 anos**, com base no **consentimento do responsável legal** (art. 14 da LGPD).
- Registros de acesso: **legítimo interesse** (segurança).

### Com quem compartilhamos
- **Google / Firebase**, que hospeda a plataforma (infraestrutura na região de São Paulo, Brasil). Alguns recursos de apoio do Google podem processar dados fora do Brasil, com salvaguardas contratuais.
- **Não vendemos dados** e **não compartilhamos com terceiros para publicidade.**

### Por quanto tempo guardamos
- Dados da conta: enquanto a conta existir + 30 dias.
- Respostas e notas: enquanto a conta existir; depois, anonimizadas.
- Registros de acesso: 6 meses.
- Registro de consentimento: 5 anos após o fim da relação.

### Seus direitos
Você pode pedir para **acessar, corrigir, exportar ou excluir** seus dados a qualquer momento, pelo próprio sistema ou pelo e-mail do Encarregado (**stanke399@gmail.com**). Respondemos em até 15 dias. Pais e responsáveis podem exercer esses direitos em nome de alunos menores.

### Segurança
Usamos controle de acesso por perfil, regras de segurança no banco de dados, criptografia em trânsito e princípio do menor privilégio. Em caso de incidente de segurança relevante, comunicamos a ANPD e os titulares afetados.

### Menores de idade
Alunos menores de 18 anos só entram na plataforma quando o professor ou a escola confirma ter o consentimento do responsável legal. Coletamos o mínimo de dados possível desses alunos e **não fazemos qualquer perfilamento ou publicidade.**

### Alterações
Podemos atualizar esta política. A data no topo indica a última versão.

---

## 2. Termo de Consentimento do Responsável Legal

_O professor ou a escola coleta este termo do responsável **antes** de cadastrar um aluno menor de 18 anos e o guarda. A plataforma registra que o professor declarou tê-lo obtido (registro `GUARDIAN_CONSENT` em `consents/{uid}` — ADR-011)._

> **Termo de consentimento para tratamento de dados de menor — ELP**
>
> Eu, ______________________________________________ (nome completo), responsável legal por ______________________________________________ (nome do aluno), declaro que:
>
> - **autorizo** o cadastro do aluno na plataforma ELP e o tratamento dos seus dados pessoais (nome, e-mail, data de nascimento, respostas e notas das atividades) para fins **exclusivamente educacionais**, sob responsabilidade do(a) professor(a) / escola ______________________________________________;
> - fui informado(a) de que posso solicitar, a qualquer momento, o **acesso, a correção ou a exclusão** desses dados, pelo professor/escola ou pelo Encarregado de Proteção de Dados da ELP (**stanke399@gmail.com**);
> - fui informado(a) de que os dados são hospedados em infraestrutura do Google/Firebase e tratados conforme a Política de Privacidade da ELP.
>
> Local e data: ______________________________________________
>
> Assinatura do responsável: ______________________________________________

---

## 3. Textos de aceite no cadastro

Cada aceite é uma caixa de seleção **não pré-marcada**, registrada com data, hora, identificação de quem aceitou e a versão do texto (`consents/{uid}` — ADR-011).

**Professor:**
> Li e concordo com os Termos de Uso e a Política de Privacidade da ELP.

**Aluno com 18 anos ou mais:**
> Tenho 18 anos ou mais e concordo com os Termos de Uso e a Política de Privacidade da ELP.

**Professor, ao cadastrar um aluno menor de 18 anos:**
> Declaro que obtive o consentimento do responsável legal deste aluno para o tratamento dos seus dados na ELP, conforme o modelo de termo fornecido, e que guardo esse documento.

---

## 4. Termos de Uso

Ainda **não redigidos**. São um documento contratual (regras de uso, contas, propriedade do conteúdo criado pelo professor, limitação de responsabilidade, encerramento) — separado da Política de Privacidade. Redigir antes do lançamento (Fase 7), junto com a revisão jurídica. Até lá, os aceites acima referenciam "Termos de Uso" como um link que ficará pendente.
