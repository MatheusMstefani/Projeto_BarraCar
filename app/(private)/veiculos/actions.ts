"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import { db } from "@/lib/db";
import { normalizePlate } from "@/lib/domain";

const vehicleSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente."),
  brand: z.string().trim().min(1, "Informe a marca."),
  model: z.string().trim().min(1, "Informe o modelo."),
  color: z.string().trim().min(1, "Informe a cor."),
  plate: z.string().trim().min(7, "Informe uma placa válida."),
});

export async function createVehicle(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    if ((await auth())?.user.role !== "ADMIN") {
      throw new Error("Sem permissão.");
    }
    const value = vehicleSchema.parse(Object.fromEntries(data));
    await db.vehicle.create({
      data: { ...value, plate: normalizePlate(value.plate) },
    });
    revalidatePath("/veiculos");
    return actionSuccess("Veículo cadastrado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível cadastrar o veículo.");
  }
}
