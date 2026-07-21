import { createEmployee, updateEmployee } from "./actions";
import { ActionForm } from "@/components/action-form";
import { requireAdminPage } from "@/lib/authorization";
import { db } from "@/lib/db";

export default async function Employees() {
  await requireAdminPage();
  const items = await db.employee.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <h1>Funcionários</h1>
      <p className="muted">
        Cadastre a equipe para atribuir um responsável a cada serviço da OS.
      </p>
      <ActionForm
        action={createEmployee}
        submitLabel="Salvar funcionário"
        resetOnSuccess
      >
        <h2>Novo funcionário</h2>
        <div className="grid">
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            Telefone
            <input name="phone" required />
          </label>
          <label>
            Cargo
            <input name="position" required />
          </label>
          <label>
            Admissão
            <input name="hiredAt" type="date" required />
          </label>
        </div>
        <input type="hidden" name="active" value="true" />
      </ActionForm>
      <h2>Equipe cadastrada</h2>
      <div className="checklist">
        {items.map((employee) => (
          <ActionForm
            action={updateEmployee}
            submitLabel="Salvar alterações"
            key={employee.id}
          >
            <input type="hidden" name="id" value={employee.id} />
            <label>
              Nome
              <input name="name" defaultValue={employee.name} />
            </label>
            <label>
              Telefone
              <input name="phone" defaultValue={employee.phone} />
            </label>
            <label>
              Cargo
              <input name="position" defaultValue={employee.position} />
            </label>
            <label>
              Admissão
              <input
                name="hiredAt"
                type="date"
                defaultValue={employee.hiredAt.toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Status
              <select name="active" defaultValue={String(employee.active)}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </ActionForm>
        ))}
      </div>
      {!items.length && (
        <div className="card empty">Nenhum funcionário cadastrado.</div>
      )}
    </>
  );
}
