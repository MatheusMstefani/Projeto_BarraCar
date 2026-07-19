# Modelo de dados

O schema Prisma é a definição executável. As entidades da etapa 1 são `User`, `Employee`, `Customer`, `Vehicle`, `Service`, `WorkOrder`, `WorkOrderItem`, `Appointment`, `FinancialEntry`, `CompanySettings` e `AuditLog`. Relações obrigatórias usam restrição; cadastros operacionais usam inativação em vez de exclusão física.

A Fase 2 adiciona `ChecklistTemplate`, `ChecklistTemplateItem`, `WorkOrderChecklistItem`, `InspectionPhoto`, `Signature` e `GeneratedDocument`. Respostas são únicas por OS/item; assinatura é única por OS/tipo; documentos são únicos por OS/tipo/versão; arquivos usam chaves únicas. Fotos usam `deletedAt` para preservar evidências.
