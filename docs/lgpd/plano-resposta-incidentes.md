# Plano de resposta a incidentes de segurança com dados pessoais

**Base legal:** art. 48 da LGPD e Resolução CD/ANPD nº 15/2024 (comunicação de incidente de segurança).
**Versão:** 1.0 — rascunho MVP
**Data:** 2026-09-10
**Responsável:** Stanke Scandelari (encarregado / DPO — stanke399@gmail.com)

> **Status:** versão simples para permitir iniciar o MVP. **É obrigatório rever este plano e fazer ao menos um teste de mesa (tabletop) antes do lançamento** (Fase 7 — risco R9 do RIPD). Confirmar prazos e forma de comunicação com a redação vigente da Resolução CD/ANPD nº 15/2024 na revisão jurídica.

---

## 1. O que é um incidente aqui

Qualquer evento que comprometa a **confidencialidade, integridade ou disponibilidade** de dados pessoais tratados pela ELP. Exemplos:

- acesso de uma pessoa a dados de alunos/professores que não deveria ver (falha de Security Rules, conta comprometida);
- vazamento ou exposição pública de dados (ex.: base exportada indevidamente);
- perda de dados sem backup;
- credencial de administrador (Firebase/GitHub/Google Cloud) comprometida;
- ação de um operador (Google) comunicada à ELP como incidente.

## 2. Papéis no MVP

| Papel | Quem | Faz |
|---|---|---|
| Ponto focal / coordenação | Stanke Scandelari (DPO) | conduz todas as etapas abaixo |
| Apoio técnico | quem estiver desenvolvendo | contenção técnica, coleta de logs |
| Comunicação externa | DPO | ANPD e titulares |

No MVP as funções se concentram na mesma pessoa; registrar mesmo assim cada passo com data/hora.

## 3. Fluxo de resposta

### Passo 1 — Registrar e acionar (imediato)
- Abrir um registro do incidente (modelo na seção 6) assim que houver suspeita.
- Anotar: quem detectou, quando, como, o que se sabe até o momento.

### Passo 2 — Conter (primeiras horas)
- Revogar sessões/credenciais comprometidas (Firebase Auth, chaves de serviço, tokens do GitHub/Google Cloud).
- Se for falha de Security Rules: publicar regra corretiva ou restringir o acesso afetado.
- Se for exposição de dados: remover a exposição (tornar privado, apagar cópia indevida).
- Preservar logs (Cloud Logging) para investigação — não apagar nada.

### Passo 3 — Avaliar (até 48h)
Determinar:
- que dados pessoais foram afetados, de quantos titulares e de quais categorias (há dados de menores?);
- causa provável;
- se há **risco relevante** aos titulares (ver seção 4).

### Passo 4 — Notificar
- **ANPD:** se houver risco relevante, comunicar **em até 3 dias úteis** a contar do conhecimento do incidente (prazo da Resolução CD/ANPD nº 15/2024 — confirmar na revisão jurídica). Usar o formulário/canal oficial da ANPD.
- **Titulares afetados:** comunicar os titulares (ou responsáveis legais, no caso de menores) quando houver risco relevante — em linguagem clara, dizendo o que aconteceu, quais dados, o que já foi feito e o que a pessoa pode fazer.
- **Professores co-controladores:** avisar os professores cujas turmas foram afetadas.

### Passo 5 — Corrigir a causa
- Implementar a correção definitiva (não só o paliativo da contenção).
- Adicionar teste de regressão (ex.: novo teste de Security Rules).

### Passo 6 — Registrar lições aprendidas
- Fechar o registro do incidente com a causa-raiz e as ações tomadas.
- Atualizar o RIPD se o incidente revelar um risco novo ou mal avaliado.

## 4. Critério de "risco relevante"

Tratar como risco relevante (e portanto notificável) quando o incidente envolver **qualquer** um:

- dados de **alunos menores de idade**;
- volume significativo de titulares;
- possibilidade de dano moral, discriminação, fraude ou exposição indevida;
- dados que permitam contato direto (e-mail) combinados com dados acadêmicos.

Na dúvida, tratar como relevante e notificar.

## 5. Prevenção (já previsto no projeto)

- Testes de Security Rules no CI antes de cada deploy (ADR-005).
- App Check nas funções `callable` (Fase 6).
- Três ambientes separados; deploy de produção só por ação explícita (ADR-008).
- Cloud Logging + Error Reporting (Fase 6).
- Menor privilégio nas credenciais de serviço; segredos só em GitHub Actions Secrets (ADR-008).
- Região de dados em São Paulo (ADR-011).

## 6. Modelo de registro de incidente

```
ID do incidente:
Data/hora da detecção:
Quem detectou / como:
Descrição:
Sistemas afetados:
Dados pessoais afetados (categorias, nº aproximado de titulares, há menores?):
Causa provável:
Ações de contenção (com data/hora):
Avaliação de risco relevante: (sim/não) — justificativa:
Notificação à ANPD: (data/hora / protocolo / n/a)
Notificação aos titulares: (data/hora / forma / n/a)
Notificação aos professores co-controladores: (data/hora / n/a)
Correção definitiva:
Lições aprendidas / mudanças no RIPD:
Encerrado em:
```

Registros de incidentes ficam em `docs/lgpd/incidentes/` (criar quando ocorrer o primeiro) ou em local equivalente com controle de acesso.

## 7. Contatos

- Encarregado (DPO): Stanke Scandelari — stanke399@gmail.com
- ANPD: canal oficial em gov.br/anpd (comunicação de incidentes)
- Suporte do Google Cloud / Firebase: pelo console do projeto

## 8. Pendências antes do lançamento

1. Teste de mesa (tabletop) do fluxo com um cenário fictício.
2. Confirmar o prazo e o formato de comunicação à ANPD com a redação vigente da Resolução CD/ANPD nº 15/2024.
3. Definir o texto-padrão de comunicação ao titular.
4. Criar `docs/lgpd/incidentes/` com controle de acesso.
