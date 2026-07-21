"use server";

import {
  EntryType,
  FinancialStatus,
  PaymentMethod,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { parseCivilDate } from "@/lib/date-time";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";

const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform(parseCivilDate);
const schema = z.object({
  description: z.string().trim().min(3),
  type: z.nativeEnum(EntryType),
  category: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  competenceDate: civilDate,
  dueDate: z.union([z.literal(""), civilDate]).optional(),
  paidAt: z.union([z.literal(""), z.coerce.date()]).optional(),
  paymentMethod: z
    .union([z.literal(""), z.nativeEnum(PaymentMethod)])
    .optional(),
  status: z.nativeEnum(FinancialStatus),
  notes: z.string().optional(),
});

async function actor() {
  const session = await auth();
  if (session?.user.role !== "ADMIN")
    throw new Error("Apenas administradores podem alterar o financeiro.");
  return session.user;
}

const values = (value: z.infer<typeof schema>) => ({
  ...value,
  dueDate: value.dueDate || null,
  paidAt:
    value.status === FinancialStatus.PAID
      ? value.paidAt || new Date()
      : null,
  paymentMethod: value.paymentMethod || null,
  notes: value.notes?.trim() || null,
});

export async function createFinancialEntry(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const value = values(schema.parse(Object.fromEntries(data)));
    await db.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({ data: value });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entity: "FinancialEntry",
          entityId: entry.id,
          action: "CREATE",
        },
      });
    });
    revalidatePath("/financeiro");
    revalidatePath("/");
    return actionSuccess("Lançamento salvo com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível salvar o lançamento.");
  }
}

export async function updateFinancialStatus(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const id = z.string().parse(data.get("id"));
    const status = z.nativeEnum(FinancialStatus).parse(data.get("status"));
    await db.$transaction(async (tx) => {
      const entry = await tx.financialEntry.findUniqueOrThrow({
        where: { id },
        select: { workOrderId: true },
      });
      if (entry.workOrderId)
        throw new Error("Lançamentos automáticos devem ser atualizados pela Ordem de Serviço.");
      await tx.financialEntry.update({
        where: { id },
        data: { status, paidAt: status === FinancialStatus.PAID ? new Date() : null },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entity: "FinancialEntry",
          entityId: id,
          action: "STATUS_UPDATED",
          changes: { status },
        },
      });
    });
    revalidatePath("/financeiro");
    revalidatePath("/");
    return actionSuccess("Status atualizado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível atualizar o status.");
  }
}
