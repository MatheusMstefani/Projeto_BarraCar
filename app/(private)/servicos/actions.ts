"use server";

import { ServiceCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import { db } from "@/lib/db";

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço."),
  category: z.nativeEnum(ServiceCategory),
  defaultPrice: z.coerce.number().nonnegative("O valor não pode ser negativo."),
  durationMinutes: z.coerce
    .number()
    .int()
    .positive("Informe uma duração válida."),
  maintenanceIntervalDays: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional(),
  createsReminder: z.enum(["true", "false"]).default("false"),
  active: z.enum(["true", "false"]).default("true"),
});

async function admin() {
  if ((await auth())?.user.role !== "ADMIN") {
    throw new Error("Apenas administradores podem alterar serviços.");
  }
}

function values(value: z.infer<typeof serviceSchema>) {
  return {
    ...value,
    maintenanceIntervalDays:
      value.maintenanceIntervalDays === ""
        ? null
        : value.maintenanceIntervalDays,
    createsReminder: value.createsReminder === "true",
    active: value.active === "true",
  };
}

export async function createService(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    await db.service.create({
      data: values(serviceSchema.parse(Object.fromEntries(data))),
    });
    revalidatePath("/servicos");
    revalidatePath("/ordens");
    return actionSuccess("Serviço cadastrado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível cadastrar o serviço.");
  }
}

export async function updateService(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const id = z.string().min(1).parse(data.get("id"));
    await db.service.update({
      where: { id },
      data: values(serviceSchema.parse(Object.fromEntries(data))),
    });
    revalidatePath("/servicos");
    revalidatePath("/ordens");
    return actionSuccess("Serviço atualizado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível atualizar o serviço.");
  }
}
