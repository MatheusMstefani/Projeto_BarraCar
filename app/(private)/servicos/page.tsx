import { createService, updateService } from "./actions";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";

const categories = (
  <>
    <option value="INTERNAL">Interna</option>
    <option value="EXTERNAL">Externa</option>
    <option value="OTHER">Outros</option>
  </>
);

export default async function Services() {
  const items = await db.service.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <h1>Serviços</h1>
      <ActionForm
        action={createService}
        submitLabel="Salvar serviço"
        resetOnSuccess
      >
        <h2>Novo serviço</h2>
        <div className="grid">
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            Categoria
            <select name="category">{categories}</select>
          </label>
          <label>
            Valor padrão
            <input
              name="defaultPrice"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label>
            Duração em minutos
            <input
              name="durationMinutes"
              type="number"
              min="1"
              defaultValue="60"
              required
            />
          </label>
          <label>
            Manutenção em dias
            <input name="maintenanceIntervalDays" type="number" min="1" />
          </label>
        </div>
        <input type="hidden" name="createsReminder" value="false" />
        <input type="hidden" name="active" value="true" />
      </ActionForm>
      <h2>Catálogo</h2>
      <div className="checklist">
        {items.map((service) => (
          <ActionForm
            action={updateService}
            submitLabel="Salvar alterações"
            key={service.id}
          >
            <input type="hidden" name="id" value={service.id} />
            <label>
              Nome
              <input name="name" defaultValue={service.name} />
            </label>
            <label>
              Categoria
              <select name="category" defaultValue={service.category}>
                {categories}
              </select>
            </label>
            <div className="grid">
              <label>
                Valor padrão
                <input
                  name="defaultPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={service.defaultPrice.toString()}
                />
              </label>
              <label>
                Duração
                <input
                  name="durationMinutes"
                  type="number"
                  min="1"
                  defaultValue={service.durationMinutes}
                />
              </label>
            </div>
            <label>
              Manutenção (dias)
              <input
                name="maintenanceIntervalDays"
                type="number"
                min="1"
                defaultValue={service.maintenanceIntervalDays ?? ""}
              />
            </label>
            <label>
              Gera lembrete
              <select
                name="createsReminder"
                defaultValue={String(service.createsReminder)}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </label>
            <label>
              Status
              <select name="active" defaultValue={String(service.active)}>
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
