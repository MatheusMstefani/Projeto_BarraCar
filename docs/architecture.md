# Arquitetura

Monólito modular em Next.js App Router. Server Actions fazem validação Zod e chamam serviços de domínio; estes concentram transações Prisma. Componentes React não contêm regras de negócio.

- `app/`: páginas, layouts e ações HTTP.
- `components/`: interface reutilizável.
- `lib/`: autenticação, validação, formatação e banco.
- `server/services/`: casos de uso transacionais.
- `prisma/`: schema, migrations e seed.

PostgreSQL é a fonte de verdade. MinIO será o armazenamento S3 privado na fase de vistoria. Dinheiro é persistido como `Decimal`; datas são UTC e exibidas em `America/Sao_Paulo`.

## Evidências e documentos

Fotos, assinaturas e PDFs usam a interface `PrivateStorage`, implementada por S3/MinIO. O bucket não é público; rotas autenticadas em `/api/media` leem o objeto e aplicam cabeçalhos privados. Metadados, hashes e versões permanecem no PostgreSQL. `server/services` valida assinatura real dos arquivos e concentra auditoria e imutabilidade.
