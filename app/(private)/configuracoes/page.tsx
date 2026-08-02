import Image from "next/image";
import { createChecklistItem, updateChecklistItem } from "./actions";
import { ActionForm } from "@/components/action-form";
import { requireAdminPage } from "@/lib/authorization";
import { db } from "@/lib/db";

export default async function Settings() {
  await requireAdminPage();
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
          src="/branding/barracar-logo.png"
          alt="Logo da Barracar Estética Automotiva"
          width={1378}
          height={689}
          unoptimized
          className="h-auto w-full max-w-[420px] object-contain"
        />
        <p><strong>{value?.name}</strong></p>
        <p className="muted">Timezone: {value?.timezone}</p>
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
