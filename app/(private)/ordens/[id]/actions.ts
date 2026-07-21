"use server";
import {
  ChecklistItemStatus,
  DamageType,
  PhotoCategory,
  SignatureType,
  VehicleRegion,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/action-state";
import { actionFailure, actionSuccess } from "@/lib/action-state.server";
import {
  ensureWorkOrderChecklist,
  saveChecklistAnswer,
} from "@/server/services/checklists";
import {
  addPhoto,
  removePhoto,
  saveSignature,
  updatePhotoDescription,
} from "@/server/services/media";
import { generateWorkOrderDocument } from "@/server/services/documents";

export type PhotoUploadState = { success: boolean; message: string };
const photoUploadSchema = z.object({
  workOrderId: z.string().min(1),
  category: z.nativeEnum(PhotoCategory),
  region: z.nativeEnum(VehicleRegion),
  damageType: z.nativeEnum(DamageType).optional(),
  checklistItemId: z.string().optional(),
  workOrderItemId: z.string().optional(),
  description: z.string().max(1000).optional(),
});
const signatureSchema = z.object({
  type: z.nativeEnum(SignatureType),
  signerName: z.string().trim().min(2, "Informe o nome do assinante."),
});

async function actor() {
  const session = await auth();
  if (!session?.user.id) throw new Error("Sessão inválida.");
  return session.user;
}
export async function initializeChecklist(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    await actor();
    const id = z.string().min(1).parse(data.get("workOrderId"));
    await ensureWorkOrderChecklist(id);
    revalidatePath(`/ordens/${id}`);
    return actionSuccess("Checklist carregado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível carregar o checklist.");
  }
}
export async function updateChecklist(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const workOrderId = z.string().min(1).parse(data.get("workOrderId"));
    await saveChecklistAnswer(
      {
        workOrderId,
        answerId: z.string().min(1).parse(data.get("answerId")),
        status: z.nativeEnum(ChecklistItemStatus).parse(data.get("status")),
        notes: String(data.get("notes") ?? ""),
      },
      user.id,
    );
    revalidatePath(`/ordens/${workOrderId}`);
    return actionSuccess("Item do checklist salvo.");
  } catch (error) {
    return actionFailure(error, "Não foi possível salvar o item do checklist.");
  }
}
export async function uploadPhotos(
  _previous: PhotoUploadState,
  data: FormData,
): Promise<PhotoUploadState> {
  try {
    const user = await actor();
    const parsed = photoUploadSchema.parse({
      workOrderId: String(data.get("workOrderId") ?? ""),
      category: String(data.get("category") ?? ""),
      region: String(data.get("region") ?? ""),
      damageType: data.get("damageType")
        ? String(data.get("damageType"))
        : undefined,
      checklistItemId: String(data.get("checklistItemId") ?? "") || undefined,
      workOrderItemId: String(data.get("workOrderItemId") ?? "") || undefined,
      description: String(data.get("description") ?? ""),
    });
    if (parsed.category === PhotoCategory.DAMAGE && !parsed.damageType)
      return { success: false, message: "Informe o tipo da avaria." };
    const files = data
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length || files.length > 10)
      return { success: false, message: "Selecione entre 1 e 10 fotos." };
    for (const file of files)
      await addPhoto(
        {
          ...parsed,
          originalName: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        },
        user.id,
      );
    revalidatePath(`/ordens/${parsed.workOrderId}`);
    return { success: true, message: `${files.length} foto(s) salva(s) com sucesso.` };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Os dados da foto são inválidos. Revise categoria e região."
        : error instanceof Error
          ? error.message
          : "Não foi possível salvar as fotos.";
    return { success: false, message };
  }
}
export async function collectSignature(
  _previousState: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await actor();
    const workOrderId = String(data.get("workOrderId"));
    const encoded = String(data.get("image")).split(",")[1];
    if (!encoded) throw new Error("Desenhe a assinatura antes de confirmar.");
    const signature = signatureSchema.parse({
      type: data.get("type"),
      signerName: data.get("signerName"),
    });

    await saveSignature(
      {
        workOrderId,
        ...signature,
        bytes: Uint8Array.from(Buffer.from(encoded, "base64")),
      },
      user.id,
    );
    revalidatePath(`/ordens/${workOrderId}`);
    return actionSuccess("Assinatura registrada com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível registrar a assinatura.");
  }
}
export async function generatePdf(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const id = z.string().min(1).parse(data.get("workOrderId"));
    await generateWorkOrderDocument(id, user.id);
    revalidatePath(`/ordens/${id}`);
    return actionSuccess("PDF gerado com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível gerar o PDF.");
  }
}
export async function editPhoto(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const workOrderId = z.string().min(1).parse(data.get("workOrderId"));
    await updatePhotoDescription(
      z.string().min(1).parse(data.get("photoId")),
      String(data.get("description") ?? ""),
      user,
      String(data.get("reason") ?? ""),
    );
    revalidatePath(`/ordens/${workOrderId}`);
    return actionSuccess("Descrição da foto atualizada.");
  } catch (error) {
    return actionFailure(error, "Não foi possível atualizar a foto.");
  }
}
export async function deletePhoto(_state: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await actor();
    const workOrderId = z.string().min(1).parse(data.get("workOrderId"));
    await removePhoto(
      z.string().min(1).parse(data.get("photoId")),
      user,
      String(data.get("reason") ?? ""),
    );
    revalidatePath(`/ordens/${workOrderId}`);
    return actionSuccess("Foto removida com sucesso.");
  } catch (error) {
    return actionFailure(error, "Não foi possível remover a foto.");
  }
}
