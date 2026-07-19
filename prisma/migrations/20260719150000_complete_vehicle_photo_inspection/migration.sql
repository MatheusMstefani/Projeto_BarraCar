-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('SCRATCH', 'SCUFF', 'DENT', 'CRACK', 'BROKEN', 'LOOSE_PART', 'PEELING_PAINT', 'SCRATCHED_WHEEL', 'DAMAGED_TIRE', 'TORN_SEAT', 'STAIN', 'DASHBOARD_WARNING', 'MALFUNCTION', 'MISSING_ACCESSORY', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PhotoCategory" ADD VALUE 'SERVICE_AREA';
ALTER TYPE "PhotoCategory" ADD VALUE 'DASHBOARD';
ALTER TYPE "PhotoCategory" ADD VALUE 'INTERIOR';
ALTER TYPE "PhotoCategory" ADD VALUE 'PERSONAL_OBJECT';

-- AlterTable
ALTER TABLE "InspectionPhoto" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "damageType" "DamageType",
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "thumbnailKey" TEXT,
ADD COLUMN     "width" INTEGER,
ADD COLUMN     "workOrderItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InspectionPhoto_thumbnailKey_key" ON "InspectionPhoto"("thumbnailKey");

-- CreateIndex
CREATE INDEX "InspectionPhoto_workOrderItemId_idx" ON "InspectionPhoto"("workOrderItemId");

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
