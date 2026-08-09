-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_vehicleId_idx" ON "Appointment"("vehicleId");

-- CreateIndex
CREATE INDEX "Appointment_employeeId_idx" ON "Appointment"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_serviceId_idx" ON "WorkOrderItem"("serviceId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_employeeId_idx" ON "WorkOrderItem"("employeeId");

-- Enable RLS as defense in depth for every business table in the exposed
-- public schema. The Barracar application accesses these tables exclusively
-- through its authenticated server-side Prisma connection, so no Data API
-- policies are intentionally created for anon/authenticated roles.
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChecklistTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChecklistTemplateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkOrderChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InspectionPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Signature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GeneratedDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinancialEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CompanySettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
