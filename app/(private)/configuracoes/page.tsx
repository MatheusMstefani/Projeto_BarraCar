import Image from "next/image";
import barracarLogo from "@/app/BarraCar-Logo.png";
import { createChecklistItem, updateChecklistItem } from "./actions";
import { ActionForm } from "@/components/action-form";
import { requireAdminPage } from "@/lib/authorization";
import { db } from "@/lib/db";
import { getAppTimeZoneDisplayName } from "@/lib/date-time";

export default async function Settings() {
  await requireAdminPage("settings:manage");
  const [value, template] = await Promise.all([
    db.companySettings.findUnique({ where: { id: "default" } }),
    db.checklistTemplate.findFirst({
      where: { active: true },
      include: { items: { orderBy: { displayOrder: "asc" } } },
    }),
  ]);

  return (
    <>
      <h1>Configurações</h1>
      <div className="card form">
        <h2>Identidade visual</h2>
        <Image
          src={barracarLogo}
          alt="Logo da Barracar Estética Automotiva"
          unoptimized
          className="brand-logo brand-logo-settings h-auto w-full max-w-[420px] object-contain"
        />
        <p><strong>{value?.name}</strong></p>
        <div className="timezone-display">
          <p className="muted">Timezone: {getAppTimeZoneDisplayName(value?.timezone)}</p>
          <small className="muted">Fuso técnico: {value?.timezone ?? "America/Sao_Paulo"}</small>
        </div>
      </div>
      <h2>Itens do checklist</h2>
      {template && (
        <ActionForm
          action={createChecklistItem}
          submitLabel="Adicionar item"
          resetOnSuccess
        >
          <input type="hidden" name="templateId" value={template.id} />
          <label>
            Título
            <input name="title" required />
          </label>
          <label>
            Categoria
            <input name="category" required />
          </label>
          <label>
            Ordem
            <input
              name="displayOrder"
              type="number"
              min="0"
              defaultValue={template.items.length}
            />
          </label>
        </ActionForm>
      )}
      <div className="checklist">
        {template?.items.map((item) => (
          <ActionForm
            action={updateChecklistItem}
            submitLabel="Salvar alterações"
            key={item.id}
          >
            <input type="hidden" name="id" value={item.id} />
            <label>
              Título
              <input name="title" defaultValue={item.title} />
            </label>
            <label>
              Categoria
              <input name="category" defaultValue={item.category} />
            </label>
            <label>
              Ordem
              <input
                name="displayOrder"
                type="number"
                min="0"
                defaultValue={item.displayOrder}
              />
            </label>
            <label>
              Status
              <select name="active" defaultValue={String(item.active)}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
