import { ChecklistItemStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Database = Prisma.TransactionClient | typeof db;

export async function ensureWorkOrderChecklist(workOrderId: string, database: Database = db) {
  const template = await database.checklistTemplate.findFirst({ where: { active: true }, include: { items: { where: { active: true }, orderBy: { displayOrder: "asc" } } } });
  if (!template) throw new Error("Nenhum checklist ativo foi configurado.");
  await database.workOrderChecklistItem.createMany({ data: template.items.map((item) => ({ workOrderId, templateItemId: item.id })), skipDuplicates: true });
  return database.workOrderChecklistItem.findMany({ where: { workOrderId }, include: { templateItem: true }, orderBy: { templateItem: { displayOrder: "asc" } } });
}

export async function saveChecklistAnswer(input: { workOrderId: string; answerId: string; status: ChecklistItemStatus; notes?: string }, actorId: string) {
  return db.$transaction(async (tx) => {
    const answer = await tx.workOrderChecklistItem.findFirstOrThrow({ where: { id: input.answerId, workOrderId: input.workOrderId } });
    const updated = await tx.workOrderChecklistItem.update({ where: { id: answer.id }, data: { status: input.status, notes: input.notes?.trim() || null, completedAt: input.status === ChecklistItemStatus.NOT_CHECKED ? null : new Date(), completedById: input.status === ChecklistItemStatus.NOT_CHECKED ? null : actorId } });
    await tx.auditLog.create({ data: { userId: actorId, entity: "WorkOrder", entityId: input.workOrderId, action: "CHECKLIST_UPDATED", changes: { answerId: answer.id, status: input.status } } });
    return updated;
  });
}
