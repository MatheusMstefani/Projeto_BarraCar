-- Protect Prisma's migration history from direct Data API access.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Support lookups and referential actions from ChecklistTemplateItem.
CREATE INDEX "WorkOrderChecklistItem_templateItemId_idx"
ON "public"."WorkOrderChecklistItem"("templateItemId");
