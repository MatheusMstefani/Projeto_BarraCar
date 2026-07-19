# Plano — Vistoria fotográfica do veículo

## Base existente

`InspectionPhoto`, MinIO privado, rotas autenticadas, galeria, checklist, assinaturas, auditoria e PDF versionado já existem e serão preservados.

## Implementação

1. Ampliar `InspectionPhoto` com checksum, dimensões, captura, bloqueio, tipo de avaria e vínculo opcional ao item de serviço.
2. Criar migration incremental, sem reset ou alteração de migrations anteriores.
3. Gerar chaves imutáveis por foto, preservar original e criar miniatura WEBP.
4. Validar MIME real, tamanho, quantidade por lote, Ordem e vínculos no servidor.
5. Completar formulário condicional, filtros, galeria e edição/exclusão auditadas.
6. Incluir avarias, vínculos, identificação curta e versão no PDF A4.
7. Ampliar testes de armazenamento, integridade, autorização, bloqueio e versões.
8. Executar Prisma, migration, seed, TypeScript, lint, testes e build.
9. Atualizar README e roadmap com roteiro desktop/celular e limitações.

## Segurança

O bucket continuará privado. URLs de objetos não serão expostas; acesso ocorrerá por rota autenticada com validação da Ordem. Originais nunca serão substituídos e exclusões serão lógicas e auditadas.
