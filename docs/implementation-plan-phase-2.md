# Plano de implementação — Fase 2

## Diagnóstico

A Fase 1 usa Next.js App Router, Server Actions validadas com Zod, Prisma/PostgreSQL, autenticação Auth.js e serviços transacionais. O armazenamento MinIO está configurado no Compose, mas ainda não possui cliente de aplicação. A OS não possui página de detalhes.

## Entregas incrementais

1. Adicionar entidades, enums, índices e migration exclusiva da Fase 2.
2. Semear template e itens configuráveis de checklist de forma idempotente.
3. Implementar armazenamento S3 privado com validação por assinatura de arquivo.
4. Implementar inicialização e salvamento parcial do checklist sem duplicação.
5. Implementar upload, visualização autenticada e proteção de evidências.
6. Implementar assinatura por canvas e persistência privada.
7. Implementar PDF A4 versionado no servidor e download sem nova versão.
8. Criar detalhes da OS com seções responsivas e histórico por auditoria.
9. Testar serviços críticos, executar Prisma, migration, seed, typecheck, lint, testes e build.
10. Atualizar README e documentação técnica.

## Decisões

- Arquivos permanecem fora do PostgreSQL; apenas metadados e chaves privadas são persistidos.
- Acesso a binários passa por rota autenticada, nunca por bucket público.
- Fotos de evidência usam exclusão lógica e ficam imutáveis após a finalização, salvo ação administrativa auditada.
- Documentos são imutáveis e versionados; download nunca cria versão.
