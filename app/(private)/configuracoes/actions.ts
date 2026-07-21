"use server";
import { DomainError } from "@/lib/errors";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import { db } from "@/lib/db";

const createItemSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().trim().min(2, "Informe o título do item."),
  category: z.string().trim().min(2, "Informe a categoria."),
  displayOrder: z.coerce.number().int().nonnegative(),
});

const updateItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2, "Informe o título do item."),
  category: z.string().trim().min(2, "Informe a categoria."),
  displayOrder: z.coerce.number().int().nonnegative(),
  active: z.enum(["true", "false"]),
});

async function admin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new DomainError("Apenas administradores podem alterar o checklist.");
  }
}

export async function createChecklistItem(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const value = createItemSchema.parse(Object.fromEntries(data));
    await db.checklistTemplateItem.create({ data: value });
    revalidatePath("/configuracoes");
    return actionSuccess("Item adicionado ao checklist.");
  } catch (error) {
    return actionFailure(error, "Não foi possível adicionar o item.");
  }
}

export async function updateChecklistItem(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const value = updateItemSchema.parse(Object.fromEntries(data));
    await db.checklistTemplateItem.update({
      where: { id: value.id },
      data: {
        title: value.title,
        category: value.category,
        displayOrder: value.displayOrder,
        active: value.active === "true",
      },
    });
    revalidatePath("/configuracoes");
    return actionSuccess("Item do checklist atualizado.");
  } catch (error) {
    return actionFailure(error, "Não foi possível atualizar o item.");
  }
}
