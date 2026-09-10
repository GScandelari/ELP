# LGPD — artefatos de conformidade

Esta pasta reúne os artefatos exigidos ou recomendados pela Lei 13.709/2018 (LGPD) para o desenvolvimento e a operação da ELP. O racional das decisões está no [ADR-011](../adr/0011-conformidade-com-a-lgpd.md); aqui ficam os documentos operacionais.

## Conteúdo

| Arquivo | O que é | Status |
|---|---|---|
| `termos-e-consentimento.md` | Política de Privacidade resumida, termo de consentimento do responsável e textos de aceite | Rascunho MVP — falta nome/CNPJ da controladora e revisão jurídica |
| `registro-de-tratamento.md` | Registro das operações de tratamento de dados pessoais (Art. 37) | Rascunho — completar até a Fase 6 |
| `ripd.md` | Relatório de Impacto à Proteção de Dados Pessoais (Art. 38) | Esqueleto — concluir e assinar antes do go-live (Fase 7) |
| `politica-de-retencao.md` | Prazos de retenção e regras de expurgo/anonimização por categoria | A definir (defaults propostos no ADR-011 e em `../OPEN-QUESTIONS.md`) |
| `plano-resposta-incidentes.md` | Fluxo de detecção, contenção e notificação (ANPD + titulares, Art. 48) | A escrever na Fase 6 |
| `dpa/` | Evidências dos Adendos de Tratamento de Dados aceitos (Google Cloud) e modelo de DPA oferecido a escolas clientes | A arquivar na Fase 0 |

## Papéis (resumo — detalhe no ADR-011)

- **Controladora:** a operadora da ELP, para os dados de cadastro dos professores.
- **Operadora / co-controladora:** cada professor ou escola, para os dados dos seus alunos.
- **Suboperador:** Google/Firebase (infraestrutura), em `southamerica-east1`.
- **Encarregado (DPO):** Stanke Scandelari — stanke399@gmail.com (acumula a função no MVP; reavaliar serviço dedicado com volume de titulares). Contato publicado na Política de Privacidade.

## Princípios adotados

Privacy by design, minimização de dados, base legal explícita por operação, transparência (textos legais versionados no repositório), atenção reforçada a dados de menores (Art. 14), e nenhum acesso silencioso a dados de um professor pelo suporte.
