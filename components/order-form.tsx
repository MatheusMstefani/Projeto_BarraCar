"use client";

import { useMemo, useState } from "react";
import { createOrder } from "@/app/(private)/ordens/actions";
import { formatCurrency } from "@/lib/domain";

type Choice = { id: string; name: string };
type Vehicle = { id: string; customerId: string; label: string };
type Service = Choice & { price: number };
type OrderRow = { serviceId: string; employeeId: string; quantity: number; unitPrice: number };

export function OrderForm({ customers, vehicles, services, employees }: { customers: Choice[]; vehicles: Vehicle[]; services: Service[]; employees: Choice[] }) {
  const firstRow = (): OrderRow => ({ serviceId: services[0]?.id ?? "", employeeId: "", quantity: 1, unitPrice: services[0]?.price ?? 0 });
  const [customerId, setCustomer] = useState(customers[0]?.id ?? "");
  const [rows, setRows] = useState<OrderRow[]>([firstRow()]);
  const availableVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.customerId === customerId), [vehicles, customerId]);
  const total = rows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0);
  const updateRow = (index: number, values: Partial<OrderRow>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...values } : row));

  return <form action={createOrder} className="card form">
    <div><h2>Nova ordem</h2><p className="muted">Adicione quantos serviços forem necessários.</p></div>
    <label>Cliente<select name="customerId" value={customerId} onChange={(event) => setCustomer(event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    <label>Veículo<select name="vehicleId" required>{availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select></label>
    <label>Data agendada<input name="scheduledAt" type="datetime-local"/></label>
    <div className="form">
      {rows.map((row, index) => <section className="card form" key={`${index}-${row.serviceId}`}>
        <div className="top"><strong>Serviço {index + 1}</strong>{rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remover</button>}</div>
        <label>Serviço<select value={row.serviceId} onChange={(event) => { const service = services.find((item) => item.id === event.target.value); updateRow(index, { serviceId: event.target.value, unitPrice: service?.price ?? 0 }); }}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label>Responsável<select value={row.employeeId} onChange={(event) => updateRow(index, { employeeId: event.target.value })}><option value="">A definir</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <div className="grid"><label>Quantidade<input type="number" min="1" step="1" value={row.quantity} onChange={(event) => updateRow(index, { quantity: Math.max(1, Number(event.target.value)) })}/></label><label>Valor unitário<input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(event) => updateRow(index, { unitPrice: Math.max(0, Number(event.target.value)) })}/></label></div>
      </section>)}
    </div>
    <input type="hidden" name="items" value={JSON.stringify(rows.map((row) => ({ ...row, employeeId: row.employeeId || null })))}/>
    <button type="button" onClick={() => setRows((current) => [...current, firstRow()])}>+ Adicionar outro serviço</button>
    <div className="card"><span className="muted">{rows.length} {rows.length === 1 ? "serviço" : "serviços"}</span><h3>Total: {formatCurrency(total)}</h3></div>
    <button type="submit">Salvar ordem</button>
  </form>;
}
