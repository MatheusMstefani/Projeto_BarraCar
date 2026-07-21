import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { db } from "@/lib/db";
import { privateStorage, type PrivateStorage } from "@/lib/storage";

type OrderForPdf = Prisma.WorkOrderGetPayload<{
  include: {
    customer: true;
    vehicle: true;
    items: { include: { service: true; employee: true } };
    checklistItems: { include: { templateItem: true } };
    photos: { include: { checklistItem: { include: { templateItem: true } }; workOrderItem: { include: { service: true } } } };
    signatures: true;
  };
}>;

const safe = (value: unknown) =>
  String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export async function buildWorkOrderPdf(
  order: OrderForPdf,
  storage: PrivateStorage = privateStorage,
  version = 1,
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28,
    height = 841.89,
    margin = 42;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - margin;
  };
  const line = (
    text: string,
    options?: {
      strong?: boolean;
      size?: number;
      color?: ReturnType<typeof rgb>;
    },
  ) => {
    const size = options?.size ?? 10;
    if (y < 55) newPage();
    page.drawText(safe(text).slice(0, 105), {
      x: margin,
      y,
      size,
      font: options?.strong ? bold : font,
      color: options?.color,
    });
    y -= size + 6;
  };
  const title = (text: string) => {
    y -= 6;
    line(text, { strong: true, size: 14, color: rgb(0.08, 0.15, 0.12) });
  };

  line("BARRACAR ESTETICA AUTOMOTIVA", { strong: true, size: 18 });
  line(`TERMO DE VISTORIA FOTOGRAFICA DO VEICULO | Versao ${version}`, { strong: true, size: 13 });
  line("Registro das condicoes aparentes do veiculo, servicos e evidencias da ordem.");
  line(`Ordem de Servico #${order.number} | Status: ${order.status}`);
  line(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  title("Cliente e veiculo");
  line(
    `${order.customer.name} | ${order.customer.phone} | WhatsApp ${order.customer.whatsapp} | ${order.customer.city}`,
  );
  line(
    `${order.vehicle.brand} ${order.vehicle.model} ${order.vehicle.year ?? ""} | ${order.vehicle.color} | Placa ${order.vehicle.plate}`,
  );
  line(
    `Quilometragem: ${order.mileage ?? order.vehicle.mileage ?? "-"} | Combustivel: ${order.fuelLevel ?? "-"}%`,
  );
  line(`Entrada: ${order.createdAt.toLocaleString("pt-BR")} | Previsao: ${order.expectedDeliveryAt?.toLocaleString("pt-BR") ?? "-"}`);
  title("Servicos");
  for (const item of order.items)
    line(
      `${item.quantity}x ${item.service.name} | ${item.employee?.name ?? "A definir"} | R$ ${item.unitPrice.toString()}`,
    );
  line(
    `Desconto: R$ ${order.discount.toString()} | Total: R$ ${order.total.toString()} | Pagamento: ${order.paymentStatus}`,
    { strong: true },
  );
  title("Checklist");
  for (const item of order.checklistItems)
    line(
      `${item.status === "DAMAGED" ? "[AVARIA] " : ""}${item.templateItem.title}: ${item.status}${item.notes ? ` - ${item.notes}` : ""}`,
      { color: item.status === "DAMAGED" ? rgb(0.7, 0.1, 0.1) : undefined },
    );

  const activePhotos = order.photos.filter((photo) => !photo.deletedAt);
  if (activePhotos.length) title("Fotografias");
  for (const photo of activePhotos) {
    if (y < 250) newPage();
    const bytes = await storage.get(photo.objectKey);
    const jpeg = await sharp(bytes)
      .rotate()
      .resize({
        width: 900,
        height: 650,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    const image = await pdf.embedJpg(jpeg);
    const dimensions = image.scaleToFit(width - margin * 2, 185);
    page.drawImage(image, {
      x: margin,
      y: y - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    });
    y -= dimensions.height + 12;
    line(
      `${photo.category} | ${photo.region}${photo.damageType ? ` | Avaria: ${photo.damageType}` : ""}${photo.description ? ` | ${photo.description}` : ""}`,
    );
    line(`Servico: ${photo.workOrderItem?.service.name ?? "-"} | Checklist: ${photo.checklistItem?.templateItem.title ?? "-"} | ID: ${photo.checksum?.slice(0, 12) ?? photo.id.slice(0, 12)}`);
  }
  if (order.signatures.length) title("Assinaturas");
  for (const signature of order.signatures) {
    if (y < 145) newPage();
    const bytes = await storage.get(signature.objectKey);
    const png = await sharp(bytes).png().toBuffer();
    const image = await pdf.embedPng(png);
    const dimensions = image.scaleToFit(210, 90);
    page.drawImage(image, {
      x: margin,
      y: y - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    });
    y -= dimensions.height + 8;
    line(
      `${signature.type} | ${signature.signerName} | ${signature.createdAt.toLocaleString("pt-BR")}`,
    );
  }
  const pages = pdf.getPages();
  pages.forEach((current, index) =>
    current.drawText(
      `OS #${order.number} | Versao ${version} | Pagina ${index + 1} de ${pages.length}`,
      { x: margin, y: 24, size: 8, font },
    ),
  );
  return pdf.save();
}

export async function generateWorkOrderDocument(
  workOrderId: string,
  actorId: string,
  storage: PrivateStorage = privateStorage,
) {
  let storedKey: string | undefined;
  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workOrderId}))`;
        const latest = await tx.generatedDocument.aggregate({
          _max: { version: true },
          where: { workOrderId, type: DocumentType.WORK_ORDER_PDF },
        });
        const version = (latest._max.version ?? 0) + 1;
        const order = await tx.workOrder.findUniqueOrThrow({
          where: { id: workOrderId },
          include: {
            customer: true,
            vehicle: true,
            items: { include: { service: true, employee: true } },
            checklistItems: {
              include: { templateItem: true },
              orderBy: { templateItem: { displayOrder: "asc" } },
            },
            photos: {
              include: {
                checklistItem: { include: { templateItem: true } },
                workOrderItem: { include: { service: true } },
              },
            },
            signatures: true,
          },
        });
        const bytes = await buildWorkOrderPdf(order, storage, version);
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        storedKey = `work-orders/${workOrderId}/documents/os-${order.number}-v${version}-${randomUUID()}.pdf`;
        await storage.put(storedKey, bytes, "application/pdf");
        await tx.generatedDocument.updateMany({
          where: {
            workOrderId,
            type: DocumentType.WORK_ORDER_PDF,
            status: DocumentStatus.CURRENT,
          },
          data: { status: DocumentStatus.OUTDATED },
        });
        const document = await tx.generatedDocument.create({
          data: {
            workOrderId,
            version,
            objectKey: storedKey,
            size: bytes.length,
            sha256,
            generatedById: actorId,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            entity: "WorkOrder",
            entityId: workOrderId,
            action: version === 1 ? "PDF_GENERATED" : "PDF_REGENERATED",
            changes: { documentId: document.id, version },
          },
        });
        return document;
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (storedKey) await storage.delete?.(storedKey).catch(() => undefined);
    throw error;
  }
}
