"use server";
import { DomainError } from "@/lib/errors";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import { db } from "@/lib/db";

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do funcionário."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9()+\-\s]{8,20}$/, "Telefone inválido."),
  position: z.string().trim().min(2, "Informe o cargo."),
  hiredAt: z.coerce.date(),
  active: z.enum(["true", "false"]).default("true"),
});

async function admin() {
  if ((await auth())?.user.role !== "ADMIN") {
    throw new DomainError("Apenas administradores podem alterar funcionários.");
  }
}

export async function createEmployee(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const value = employeeSchema.parse(Object.fromEntries(data));
    await db.employee.create({
      data: { ...value, active: value.active === "true" },
    });
    revalidatePath("/funcionarios");
    revalidatePath("/ordens");
    return actionSuccess("Funcionário cadastrado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível cadastrar o funcionário.");
  }
}

export async function updateEmployee(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await admin();
    const id = z.string().min(1).parse(data.get("id"));
    const value = employeeSchema.parse(Object.fromEntries(data));
    await db.employee.update({
      where: { id },
      data: { ...value, active: value.active === "true" },
    });
    revalidatePath("/funcionarios");
    revalidatePath("/ordens");
    return actionSuccess("Funcionário atualizado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível atualizar o funcionário.");
  }
}
