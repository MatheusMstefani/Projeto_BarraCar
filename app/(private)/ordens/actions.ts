"use server";

import { WorkOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import {
  markWorkOrderPaid,
  saveWorkOrder,
} from "@/server/services/work-orders";

const itemSchema = z.object({
  serviceId: z.string().min(1, "Selecione um serviço."),
  employeeId: z.string().nullable(),
  quantity: z.number().int().positive("Informe uma quantidade válida."),
  unitPrice: z.number().nonnegative("O valor não pode ser negativo."),
});

export async function createOrder(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (session?.user.role !== "ADMIN") throw new Error("Sem permissão.");

    const items = itemSchema
      .array()
      .min(1, "Adicione pelo menos um serviço.")
      .parse(JSON.parse(String(data.get("items"))));
    const scheduledAt = data.get("scheduledAt")
      ? new Date(String(data.get("scheduledAt")))
      : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new Error("Informe uma data de agendamento válida.");
    }

    await saveWorkOrder(
      {
        customerId: String(data.get("customerId")),
        vehicleId: String(data.get("vehicleId")),
        scheduledAt,
        status: scheduledAt ? WorkOrderStatus.SCHEDULED : WorkOrderStatus.DRAFT,
        items,
      },
      session.user.id,
    );
    revalidatePath("/ordens");
    return actionSuccess("Ordem de serviço criada com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível criar a ordem de serviço.");
  }
}

export async function payOrder(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (session?.user.role !== "ADMIN") throw new Error("Sem permissão.");

    await markWorkOrderPaid(String(data.get("id")), session.user.id);
    revalidatePath("/ordens");
    revalidatePath("/financeiro");
    return actionSuccess("Pagamento registrado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível registrar o pagamento.");
  }
}
