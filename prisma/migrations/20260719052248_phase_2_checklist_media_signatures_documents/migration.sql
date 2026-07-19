-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('NOT_CHECKED', 'NORMAL', 'DAMAGED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('GENERAL_ENTRY', 'DAMAGE', 'BEFORE_SERVICE', 'DURING_SERVICE', 'AFTER_SERVICE', 'DELIVERY', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleRegion" AS ENUM ('FRONT', 'REAR', 'LEFT_SIDE', 'RIGHT_SIDE', 'FRONT_BUMPER', 'REAR_BUMPER', 'HOOD', 'ROOF', 'FRONT_LEFT_DOOR', 'FRONT_RIGHT_DOOR', 'REAR_LEFT_DOOR', 'REAR_RIGHT_DOOR', 'FENDER', 'WHEEL', 'TIRE', 'WINDOW', 'MIRROR', 'HEADLIGHT', 'TAILLIGHT', 'INTERIOR', 'SEAT', 'DASHBOARD', 'TRUNK', 'ENGINE', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('CUSTOMER_ENTRY', 'PROFESSIONAL', 'DELIVERY_RESPONSIBLE', 'CUSTOMER_PICKUP');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('WORK_ORDER_PDF');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('CURRENT', 'OUTDATED');

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allowsNotes" BOOLEAN NOT NULL DEFAULT true,
    "allowsPhoto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderChecklistItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionPhoto" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "category" "PhotoCategory" NOT NULL,
    "region" "VehicleRegion" NOT NULL,
    "description" TEXT,
    "objectKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "type" "SignatureType" NOT NULL,
    "signerName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "notes" TEXT,
    "collectedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'WORK_ORDER_PDF',
    "version" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'CURRENT',
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_name_key" ON "ChecklistTemplate"("name");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_templateId_active_displayOrder_idx" ON "ChecklistTemplateItem"("templateId", "active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplateItem_templateId_title_key" ON "ChecklistTemplateItem"("templateId", "title");

-- CreateIndex
CREATE INDEX "WorkOrderChecklistItem_workOrderId_status_idx" ON "WorkOrderChecklistItem"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "WorkOrderChecklistItem_completedById_idx" ON "WorkOrderChecklistItem"("completedById");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderChecklistItem_workOrderId_templateItemId_key" ON "WorkOrderChecklistItem"("workOrderId", "templateItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionPhoto_objectKey_key" ON "InspectionPhoto"("objectKey");

-- CreateIndex
CREATE INDEX "InspectionPhoto_workOrderId_category_deletedAt_idx" ON "InspectionPhoto"("workOrderId", "category", "deletedAt");

-- CreateIndex
CREATE INDEX "InspectionPhoto_checklistItemId_idx" ON "InspectionPhoto"("checklistItemId");

-- CreateIndex
CREATE INDEX "InspectionPhoto_uploadedById_idx" ON "InspectionPhoto"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_objectKey_key" ON "Signature"("objectKey");

-- CreateIndex
CREATE INDEX "Signature_collectedById_idx" ON "Signature"("collectedById");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_workOrderId_type_key" ON "Signature"("workOrderId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_objectKey_key" ON "GeneratedDocument"("objectKey");

-- CreateIndex
CREATE INDEX "GeneratedDocument_workOrderId_status_idx" ON "GeneratedDocument"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_generatedById_idx" ON "GeneratedDocument"("generatedById");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_workOrderId_type_version_key" ON "GeneratedDocument"("workOrderId", "type", "version");

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderChecklistItem" ADD CONSTRAINT "WorkOrderChecklistItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderChecklistItem" ADD CONSTRAINT "WorkOrderChecklistItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "ChecklistTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderChecklistItem" ADD CONSTRAINT "WorkOrderChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "WorkOrderChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
