# ADR 002 — Preservar a stack atual

- **Status:** aceito
- **Data:** 2026-08-02

## Contexto

A stack atual está implantada e coberta por testes: Next.js App Router, React, TypeScript estrito, Prisma, PostgreSQL, Auth.js, MinIO/S3, Docker Compose, Vitest e Playwright. Ela suporta as regras existentes, armazenamento privado e documentos versionados.

A arquitetura de referência apresenta princípios úteis, mas tecnologias diferentes não são requisitos por si só.

## Decisão

Preservar:

- Next.js como aplicação full-stack e App Router como borda;
- React e TypeScript com `strict: true`;
- Prisma como adaptador de persistência;
- PostgreSQL como banco transacional;
- MinIO como object storage privado;
- Auth.js e os papéis `ADMIN`/`EMPLOYEE`;
- Docker Compose no ambiente local;
- Vitest e Playwright;
- geração atual de PDF e PWA/responsividade.

Aplicar os princípios de modularidade, portas, idempotência, autorização e observabilidade dentro desta stack.

## Consequências positivas

- nenhuma migração de plataforma ou dados é necessária;
- conhecimento, testes e ferramentas existentes continuam válidos;
- investimento concentra-se nos riscos reais;
- implantação segue simples e adequada ao tamanho da operação.

## Consequências e cuidados

- Server Actions e Route Handlers precisam permanecer adaptadores finos;
- tipos Prisma não devem se espalhar para domínio novo;
- limites de uma única instância, como rate limit em memória, devem ser documentados;
- versões beta, como Auth.js atual, exigem atualizações controladas e testes.

## Alternativas rejeitadas agora

- Fastify/NestJS ou backend separado;
- Supabase/GCS apenas para alinhar a outro documento;
- GraphQL;
- substituição de Prisma;
- Kubernetes ou plataforma distribuída.

## Critério de revisão

Uma troca exige problema mensurável, prova de que a stack atual não atende e plano de migração/rollback. Preferência tecnológica isolada não é justificativa.
