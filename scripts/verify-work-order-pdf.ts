import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { buildWorkOrderPdf } from "@/server/services/documents";

async function main() {
  const order = await db.workOrder.findFirst({
    orderBy: { number: "desc" },
    include: {
      customer: true,
      vehicle: true,
      items: { include: { service: true, employee: true } },
      checklistItems: { include: { templateItem: true } },
      photos: {
        include: {
          checklistItem: { include: { templateItem: true } },
          workOrderItem: { include: { service: true } },
        },
      },
      signatures: true,
    },
  });
  if (!order) throw new Error("Nenhuma Ordem de Serviço disponível para validar o PDF.");

  const bytes = await buildWorkOrderPdf(order);
  const directory = path.join(process.cwd(), "tmp", "pdfs", "work-order");
  const output = path.join(directory, `OS-${order.number}-preview.pdf`);
  await mkdir(directory, { recursive: true });
  await writeFile(output, bytes);
  process.stdout.write(JSON.stringify({ output, bytes: bytes.length, order: order.number }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
