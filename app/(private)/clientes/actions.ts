"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido."),
  city: z.string().trim().min(2, "Informe a cidade."),
});

export async function createCustomer(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (session?.user.role !== "ADMIN") throw new Error("Sem permissão.");

    const value = customerSchema.parse(Object.fromEntries(data));
    await db.customer.create({ data: value });
    revalidatePath("/clientes");
    return actionSuccess("Cliente cadastrado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível cadastrar o cliente.");
  }
}
