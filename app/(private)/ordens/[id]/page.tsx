import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/domain";
import { initializeChecklist, updateChecklist, generatePdf } from "./actions";
import { PhotoUpload } from "@/components/photo-upload";
import { PhotoGallery } from "@/components/photo-gallery";
import { SignaturePad } from "@/components/signature-pad";
import { ActionForm } from "@/components/action-form";

const tabs = [
  ["summary", "Resumo"],
  ["services", "Serviços"],
  ["checklist", "Checklist"],
  ["photos", "Vistoria e fotos"],
  ["signatures", "Assinaturas"],
  ["documents", "Documento PDF"],
  ["history", "Histórico"],
] as const;
export default async function WorkOrderDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const section = query.section ?? "summary";
  const returnTo = query.returnTo?.startsWith("/historico?")
    ? query.returnTo
    : "/ordens";
  const returnParameter = query.returnTo
    ? `&returnTo=${encodeURIComponent(returnTo)}`
    : "";
  const order = await db.workOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      items: { include: { service: true, employee: true } },
      checklistItems: {
        include: { templateItem: true, completedBy: true },
        orderBy: { templateItem: { displayOrder: "asc" } },
      },
      photos: {
        where: { deletedAt: null },
        include: { uploadedBy: true, checklistItem: { include: { templateItem: true } }, workOrderItem: { include: { service: true } } },
        orderBy: { createdAt: "asc" },
      },
      signatures: true,
      documents: { orderBy: { version: "desc" } },
    },
  });
  if (!order) notFound();
  const completed = order.checklistItems.filter(
    (i) => i.status !== "NOT_CHECKED",
  ).length;
  const history =
    section === "history"
      ? await db.auditLog.findMany({
          where: { entity: "WorkOrder", entityId: id },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        })
      : [];
  return (
    <>
      <div className="top">
        <div>
          <h1>OS #{order.number}</h1>
          <p className="muted">
            {order.customer.name} · {order.vehicle.plate}
          </p>
        </div>
        <Link href={returnTo} className="button">
          Voltar
        </Link>
      </div>
      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <Link
            className={section === key ? "active" : ""}
            href={`/ordens/${id}?section=${key}${returnParameter}`}
            key={key}
          >
            {label}
          </Link>
        ))}
      </nav>
      {section === "summary" && (
        <div className="grid">
          <div className="card">
            <h2>Cliente</h2>
            <p>
              {order.customer.name}
              <br />
              {order.customer.phone}
              <br />
              {order.customer.city}
            </p>
          </div>
          <div className="card">
            <h2>Veículo</h2>
            <p>
              {order.vehicle.brand} {order.vehicle.model}
              <br />
              <strong>{order.vehicle.plate}</strong>
              <br />
              {order.vehicle.color}
            </p>
          </div>
          <div className="card">
            <h2>Situação</h2>
            <p>
              {order.status}
              <br />
              {order.paymentStatus}
              <br />
              {formatCurrency(order.total.toString())}
            </p>
          </div>
        </div>
      )}
      {section === "services" && (
        <div className="card">
          {order.items.map((i) => (
            <p key={i.id}>
              <strong>{i.service.name}</strong> ·{" "}
              {i.employee?.name ?? "A definir"} ·{" "}
              {formatCurrency(i.unitPrice.toString())}
            </p>
          ))}
        </div>
      )}
      {section === "checklist" && (
        <>
          <div className="card progress">
            <strong>
              {completed} de {order.checklistItems.length} itens verificados
            </strong>
            <progress
              value={completed}
              max={order.checklistItems.length || 1}
            />
          </div>
          {!order.checklistItems.length && (
            <ActionForm action={initializeChecklist} className="card">
              <input type="hidden" name="workOrderId" value={id} />
              <p>
                Nenhum template ativo encontrado ou checklist ainda não
                inicializado.
              </p>
              <button>Carregar checklist</button>
            </ActionForm>
          )}
          <div className="checklist">
            {order.checklistItems.map((item) => (
              <ActionForm
                action={updateChecklist}
                className="card form"
                key={item.id}
              >
                <input type="hidden" name="workOrderId" value={id} />
                <input type="hidden" name="answerId" value={item.id} />
                <strong>{item.templateItem.title}</strong>
                <span className="muted">{item.templateItem.category}</span>
                <select name="status" defaultValue={item.status}>
                  <option value="NOT_CHECKED">Não verificado</option>
                  <option value="NORMAL">Normal</option>
                  <option value="DAMAGED">Possui avaria</option>
                  <option value="NOT_APPLICABLE">Não se aplica</option>
                </select>
                {item.templateItem.allowsNotes && (
                  <textarea
                    name="notes"
                    defaultValue={item.notes ?? ""}
                    placeholder="Observação"
                  />
                )}
                <button>Salvar item</button>
              </ActionForm>
            ))}
          </div>
        </>
      )}
      {section === "photos" && (
        <>
          <PhotoUpload workOrderId={id} />
          <PhotoGallery workOrderId={id} photos={order.photos.map((photo) => ({ id: photo.id, category: photo.category, region: photo.region, damageType: photo.damageType, description: photo.description, originalName: photo.originalName, createdAt: formatDate(photo.createdAt), uploadedBy: photo.uploadedBy.name, checklist: photo.checklistItem?.templateItem.title ?? null, service: photo.workOrderItem?.service.name ?? null, checksum: photo.checksum }))} />
        </>
      )}
      {section === "signatures" && (
        <>
          <SignaturePad workOrderId={id} />
          <div className="gallery">
            {order.signatures.map((signature) => (
              <article className="photo-card" key={signature.id}>
                <Image
                  src={`/api/media/signatures/${signature.id}?v=${signature.updatedAt.getTime()}`}
                  alt={`Assinatura de ${signature.signerName}`}
                  width={800}
                  height={300}
                  unoptimized
                />
                <strong>{signature.signerName}</strong>
                <small>
                  {signature.type} · {formatDate(signature.createdAt)}
                </small>
              </article>
            ))}
          </div>
        </>
      )}
      {section === "documents" && (
        <>
          <ActionForm action={generatePdf} className="card form">
            <input type="hidden" name="workOrderId" value={id} />
            <h2>Documento da Ordem</h2>
            <p>
              Cada geração cria uma versão imutável. Baixar não cria outra
              versão.
            </p>
            <button>
              {order.documents.length ? "Gerar nova versão" : "Gerar PDF"}
            </button>
          </ActionForm>
          <div className="card">
            {order.documents.map((document) => (
              <p key={document.id}>
                <strong>Versão {document.version}</strong> · {document.status} ·{" "}
                {formatDate(document.createdAt)} ·{" "}
                <a href={`/api/media/documents/${document.id}`} target="_blank">
                  Visualizar PDF
                </a>{" "}
                ·{" "}
                <a href={`/api/media/documents/${document.id}?download=1`}>
                  Baixar PDF
                </a>
              </p>
            ))}
          </div>
        </>
      )}
      {section === "history" && (
        <div className="timeline">
          {history.map((event) => (
            <article className="card" key={event.id}>
              <strong>{event.action}</strong>
              <p>
                {event.user?.name ?? "Sistema"} · {formatDate(event.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
