# Achados da revisão arquitetural

## Escopo e método

Revisão estática realizada em 2026-08-02 sobre:

- estado e diff do Git;
- `README.md`, `package.json`, `tsconfig.json`, `next-env.d.ts` e Docker Compose;
- schema e cinco diretórios de migração Prisma;
- páginas, Server Actions e Route Handlers;
- serviços de servidor, autenticação, autorização, erros e storage;
- documentação existente;
- testes Vitest e Playwright.

Severidades: **crítica** (exploração/perda iminente), **alta** (risco grave provável), **média** (dívida/riscos que devem entrar no plano), **baixa** (melhoria de manutenção). Não foram confirmados achados críticos ou altos nesta análise.

## Atualização após a primeira implementação

- F-01: parcialmente tratado com Histórico como módulo piloto e fachada legada;
- F-02: fundação de capacidades criada e páginas administrativas/Histórico migrados; ações restantes seguem incrementais;
- F-04: contrato estruturado aplicado à fundação, Server Actions e exportação do Histórico;
- F-05: request ID, logger estruturado e `/api/health`/`/api/ready` implementados;
- F-06 a F-14 permanecem conforme priorização abaixo.

## Pontos fortes confirmados

1. **Stack coerente e TypeScript estrito.** Next App Router, React, Prisma/PostgreSQL, MinIO, Auth.js, Vitest e Playwright estão integrados sem necessidade de reescrita.
2. **Storage privado com validação real.** `lib/storage.ts` abstrai o mecanismo; `server/services/media.ts` detecta MIME pelos bytes, recusa formatos fora da lista, produz thumbnail, checksum e chave aleatória.
3. **Consistência nas operações críticas.** `server/services/work-orders.ts` usa transações e `upsert`; restrições únicas ligam pagamento e agenda a uma OS.
4. **PDF concorrente protegido.** `server/services/documents.ts` usa lock transacional, versão única e compensação do objeto em falha.
5. **Auditoria de negócio existente.** `AuditLog` e ações relevantes registram ator/operação; isso deve permanecer separado de logs técnicos.
6. **Sessão revalidada.** `auth.ts` consulta o usuário ativo e atualiza papel/dados antes de aceitar a sessão protegida.
7. **Mensagens internas não vazam por padrão.** `lib/action-state.server.ts` traduz erros conhecidos e usa fallback para falhas inesperadas.
8. **Read model de Histórico adequado.** `server/services/history.ts` é especializado, usa projeções/índices e não introduz CQRS generalizado.
9. **Cobertura relevante.** A suíte inclui regras de data, placa, rate limit, storage, histórico, integridade/idempotência de OS, vistoria, assinatura, PDF e fluxos E2E.

## Achados priorizados

### F-01 — Limites modulares ainda implícitos

- **Severidade:** média
- **Evidência:** `app/(private)/clientes/actions.ts`, `veiculos/actions.ts`, `funcionarios/actions.ts`, `servicos/actions.ts`, `financeiro/actions.ts` e `configuracoes/actions.ts` importam `lib/db.ts` diretamente; vários `page.tsx` também montam consultas Prisma diretamente.
- **Impacto:** regras, transações e propriedade de dados podem se espalhar conforme o produto cresce; testes precisam conhecer a borda Next e Prisma ao mesmo tempo.
- **Recomendação:** adotar `server/modules/<módulo>` somente quando cada fluxo for alterado. Começar por Histórico e preservar leituras existentes até haver benefício claro.
- **Fase:** 2 e 5.

### F-02 — Autorização por papel repetida em várias bordas

- **Severidade:** média
- **Evidência:** comparações com `session.user.role !== "ADMIN"` aparecem em ações de clientes, veículos, funcionários, serviços, financeiro, configurações e ordens; `lib/authorization.ts` cobre páginas administrativas por outra via.
- **Impacto:** uma nova entrada pode esquecer a verificação ou divergir da política da página; capacidades ficam acopladas à interface.
- **Recomendação:** centralizar `Actor`, `Capability` e guardas, mantendo regras do recurso dentro do módulo. Migrar gradualmente e testar 401/403.
- **Fase:** 1.

### F-03 — APIs de mídia têm política interna ampla e acessam infraestrutura diretamente

- **Severidade:** média
- **Evidência:** `app/api/media/photos/[id]/route.ts`, `signatures/[id]/route.ts` e `documents/[id]/route.ts` autorizam qualquer usuário interno autenticado e então consultam Prisma/MinIO diretamente.
- **Impacto:** a política single-tenant atual é funcional, mas não expressa capacidade nem regra por recurso; seria insuficiente para um portal externo e torna a borda responsável por storage/persistência.
- **Recomendação:** manter o comportamento atual até a fase de mídia; então chamar casos de uso de download autorizados antes de obter bytes. Não classificar IDs como segredo.
- **Fase:** 4.

### F-04 — Contrato de erro é seguro, porém pouco estruturado

- **Severidade:** média
- **Evidência:** `lib/errors.ts` contém apenas mensagem; `lib/action-state.server.ts` retorna `status/message`; Route Handlers alternam texto e JSON e não incluem código estável ou correlação.
- **Impacto:** suporte, automação e clientes não distinguem falhas com segurança; logs não podem ser correlacionados a uma resposta.
- **Recomendação:** introduzir `code`, `title`, `status`, `detail`, `requestId` e `fields`, com tradutores para Server Actions e HTTP.
- **Fase:** 1.

### F-05 — Observabilidade técnica mínima

- **Severidade:** média
- **Evidência:** a busca no código encontrou apenas `console.error` em `app/(private)/error.tsx`; não há logger estruturado, `request_id`, `operation_id`, `/api/health` ou `/api/ready`.
- **Impacto:** diagnóstico de falha de banco/storage e correlação de incidentes dependem de reprodução manual.
- **Recomendação:** logs JSON sanitizados, correlação e endpoints leves; manter `AuditLog` separado.
- **Fase:** 1.

### F-06 — Não há pipeline CI versionado

- **Severidade:** média
- **Evidência:** não existe diretório `.github` no repositório; os gates dependem de execução local.
- **Impacto:** uma alteração pode ser integrada sem typecheck/lint/test/build, apesar de os scripts existirem.
- **Recomendação:** depois de estabilizar o fluxo do repositório remoto, adicionar CI com Node compatível, serviços PostgreSQL/MinIO quando necessários e os quatro gates. Não é requisito para esta entrega documental.
- **Fase:** 1 ou melhoria operacional paralela.

### F-07 — Contrato real do MinIO não está claramente coberto

- **Severidade:** média
- **Evidência:** testes de mídia usam uma implementação `PrivateStorage` em memória; existe teste de configuração, mas não foi encontrado teste de contrato contra um MinIO real.
- **Impacto:** diferenças de SDK, headers, credenciais, bucket ou indisponibilidade podem aparecer apenas em teste manual.
- **Recomendação:** adicionar suíte de integração opt-in contra o MinIO do Compose para put/get/delete, privacidade e falhas, sem substituir os testes rápidos.
- **Fase:** 4.

### F-08 — Rate limit de login é local ao processo

- **Severidade:** baixa no cenário atual; média se houver múltiplas réplicas
- **Evidência:** `lib/auth-security.ts` usa mapa em memória; o README já documenta essa limitação.
- **Impacto:** reinício limpa contadores e múltiplas instâncias não compartilham bloqueios.
- **Recomendação:** preservar numa única instância. Migrar para armazenamento compartilhado apenas antes de escalar horizontalmente ou diante de abuso real.
- **Fase:** condicionada a escala/risco.

### F-09 — Acoplamento de aplicação a tipos Prisma

- **Severidade:** média
- **Evidência:** `server/services/work-orders.ts`, `media.ts`, `documents.ts` e `history.ts` importam enums, `Decimal`, filtros ou `TransactionClient` de `@prisma/client`.
- **Impacto:** testes e regras carregam detalhes do adaptador; uma mudança de persistência/consulta afeta mais camadas.
- **Recomendação:** no módulo migrado, converter tipos na borda do adaptador e manter Prisma fora de `domain`. Não criar mapeamento universal antecipado.
- **Fase:** 2 a 5.

### F-10 — Upload em lote pode terminar parcialmente

- **Severidade:** baixa/média
- **Evidência:** `uploadPhotos` processa arquivos sequencialmente; se um arquivo posterior falhar, os anteriores permanecem e a mensagem informa quantos foram salvos.
- **Impacto:** não há atomicidade do lote, embora o estado e a comunicação sejam coerentes.
- **Recomendação:** manter enquanto “sucesso parcial” for a regra desejada e documentá-la na UI. Se o negócio exigir tudo-ou-nada, introduzir batch/compensação e teste explícito.
- **Fase:** 4, somente com decisão de produto.

### F-11 — Ausência de rotina versionada de backup/restore e recuperação de objetos

- **Severidade:** média operacional
- **Evidência:** Compose usa volumes persistentes, mas não foram encontrados scripts/runbook de backup/restore do PostgreSQL e MinIO nem reconciliação de objetos órfãos.
- **Impacto:** volume não é backup; falha humana ou de disco pode afetar dados e evidências.
- **Recomendação:** criar runbook, retenção, cópia fora do host e exercício de restore. Para objetos, começar com relatório/reconciliação manual.
- **Fase:** melhoria operacional prioritária, sem exigir nova arquitetura.

### F-12 — Documentação histórica apresenta drift

- **Severidade:** baixa
- **Evidência:** `docs/implementation-plan.md` descreve estado inicial e entregas já implementadas; ADRs atuais estão em `docs/decisions`, enquanto a nova convenção solicitada usa `docs/adr`.
- **Impacto:** novos colaboradores podem interpretar plano antigo como estado atual.
- **Recomendação:** marcar documentos antigos como históricos ou atualizar seus cabeçalhos; manter ADRs novos em `docs/adr` sem apagar decisões anteriores.
- **Fase:** próxima revisão documental.

### F-13 — Nomes de migração iniciais podem confundir manutenção

- **Severidade:** baixa
- **Evidência:** existem `202607180001_initial` e `20260719050344_initial`, ambas no histórico aplicado.
- **Impacto:** o nome não explica a diferença, mas alterar diretórios aplicados quebraria o histórico.
- **Recomendação:** não renomear nem editar. Documentar o propósito em `data-model.md` ou nota de migrações; usar nomes descritivos daqui em diante.
- **Fase:** documentação apenas.

### F-14 — APIs compactadas reduzem legibilidade

- **Severidade:** baixa
- **Evidência:** alguns Route Handlers de mídia e `photo-options` estão em uma única linha.
- **Impacto:** revisão de segurança e manutenção ficam mais difíceis, embora o comportamento compile.
- **Recomendação:** formatar somente quando esses arquivos forem migrados; não gerar diff funcional apenas por estilo nesta fase.
- **Fase:** 4.

## Riscos explicitamente não confirmados

- **SQL injection:** consultas observadas usam Prisma, sem SQL dinâmico de entrada; o advisory lock usa SQL fixo.
- **bucket público:** Compose configura `mc anonymous set none`; downloads passam pela aplicação.
- **duplicação de pagamento:** relação única e `upsert` protegem o efeito financeiro.
- **SVG em upload:** validação aceita somente JPEG/PNG/WebP.
- **vazamento deliberado de stack/SQL:** o mapeador de ações usa fallback seguro.
- **necessidade de microserviços/Redis:** não há sinal de escala ou operação que justifique.

## Ordem recomendada

1. Fundação de autorização/erros/correlação/health (F-02, F-04, F-05).
2. Pipeline e runbook operacional em paralelo (F-06, F-11).
3. Histórico como piloto modular (F-01, F-09).
4. Ordens com seus testes de integridade e idempotência.
5. Mídia/Documentos e contrato real do MinIO (F-03, F-07, F-10, F-14).
6. Cadastros apenas conforme demanda.

## Limitações desta revisão

- análise de arquitetura e código, não pentest;
- não houve teste de carga;
- não foi simulada perda de volume/restore;
- integrações externas não existem no escopo atual;
- achados refletem o branch e o working tree examinados na data acima.
