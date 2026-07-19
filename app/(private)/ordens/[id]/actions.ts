"use server";
import {
  ChecklistItemStatus,
  DamageType,
  PhotoCategory,
  SignatureType,
  VehicleRegion,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
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

async function actor() {
  const session = await auth();
  if (!session?.user.id) throw new Error("Sessão inválida.");
  return session.user;
}
export async function initializeChecklist(data: FormData) {
  await actor();
  const id = String(data.get("workOrderId"));
  await ensureWorkOrderChecklist(id);
  revalidatePath(`/ordens/${id}`);
}
export async function updateChecklist(data: FormData) {
  const user = await actor();
  const workOrderId = String(data.get("workOrderId"));
  await saveChecklistAnswer(
    {
      workOrderId,
      answerId: String(data.get("answerId")),
      status:
        ChecklistItemStatus[
          String(data.get("status")) as keyof typeof ChecklistItemStatus
        ],
      notes: String(data.get("notes") ?? ""),
    },
    user.id,
  );
  revalidatePath(`/ordens/${workOrderId}`);
}
export async function uploadPhotos(data: FormData) {
  const user = await actor();
  const workOrderId = String(data.get("workOrderId"));
  const files = data
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length || files.length > 10)
    throw new Error("Selecione entre 1 e 10 fotos.");
  for (const file of files)
    await addPhoto(
      {
        workOrderId,
        category:
          PhotoCategory[
            String(data.get("category")) as keyof typeof PhotoCategory
          ],
        region:
          VehicleRegion[
            String(data.get("region")) as keyof typeof VehicleRegion
          ],
        damageType: data.get("damageType")
          ? DamageType[
              String(data.get("damageType")) as keyof typeof DamageType
            ]
          : undefined,
        checklistItemId: String(data.get("checklistItemId") || "") || undefined,
        workOrderItemId: String(data.get("workOrderItemId") || "") || undefined,
        description: String(data.get("description") ?? ""),
        originalName: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      user.id,
    );
  revalidatePath(`/ordens/${workOrderId}`);
}
export async function collectSignature(data: FormData) {
  const user = await actor();
  const workOrderId = String(data.get("workOrderId"));
  const encoded = String(data.get("image")).split(",")[1];
  if (!encoded) throw new Error("Desenhe a assinatura antes de confirmar.");
  await saveSignature(
    {
      workOrderId,
      type: SignatureType[
        String(data.get("type")) as keyof typeof SignatureType
      ],
      signerName: String(data.get("signerName")),
      bytes: Uint8Array.from(Buffer.from(encoded, "base64")),
    },
    user.id,
  );
  revalidatePath(`/ordens/${workOrderId}`);
}
export async function generatePdf(data: FormData) {
  const user = await actor();
  const id = String(data.get("workOrderId"));
  await generateWorkOrderDocument(id, user.id);
  revalidatePath(`/ordens/${id}`);
}
export async function editPhoto(data: FormData) {
  const user = await actor();
  const workOrderId = String(data.get("workOrderId"));
  await updatePhotoDescription(
    String(data.get("photoId")),
    String(data.get("description") ?? ""),
    user,
    String(data.get("reason") ?? ""),
  );
  revalidatePath(`/ordens/${workOrderId}`);
}
export async function deletePhoto(data: FormData) {
  const user = await actor();
  const workOrderId = String(data.get("workOrderId"));
  await removePhoto(
    String(data.get("photoId")),
    user,
    String(data.get("reason") ?? ""),
  );
  revalidatePath(`/ordens/${workOrderId}`);
}
