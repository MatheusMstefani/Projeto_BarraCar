import { createVehicle } from "./actions";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";

export default async function Vehicles() {
  const [items, customers] = await Promise.all([
    db.vehicle.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    db.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <h1>Veículos</h1>
      <div className="grid">
        <ActionForm
          action={createVehicle}
          submitLabel="Salvar veículo"
          resetOnSuccess
        >
          <h2>Novo veículo</h2>
          <label>
            Cliente
            <select name="customerId" required>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input name="brand" required />
          </label>
          <label>
            Modelo
            <input name="model" required />
          </label>
          <label>
            Cor
            <input name="color" required />
          </label>
          <label>
            Placa
            <input name="plate" required />
          </label>
        </ActionForm>
        <div className="card table-wrap">
          <table className="table">
            <tbody>
              {items.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <strong>{vehicle.plate}</strong>
                    <br />
                    {vehicle.brand} {vehicle.model}
                  </td>
                  <td>{vehicle.customer.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
