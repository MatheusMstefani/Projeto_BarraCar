-- Índices incrementais para consultas do Histórico Geral por período.
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Vehicle_createdAt_idx" ON "Vehicle"("createdAt");
CREATE INDEX "WorkOrder_entryAt_idx" ON "WorkOrder"("entryAt");
CREATE INDEX "InspectionPhoto_createdAt_deletedAt_idx" ON "InspectionPhoto"("createdAt", "deletedAt");
CREATE INDEX "Signature_createdAt_idx" ON "Signature"("createdAt");
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");
