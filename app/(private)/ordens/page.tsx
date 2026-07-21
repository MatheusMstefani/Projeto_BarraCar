import Link from "next/link";
import { OrderForm } from "@/components/order-form";
import { Pagination } from "@/components/pagination";
import { PayOrderButton } from "@/components/pay-order-button";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/domain";

const PAGE_SIZE = 20;

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const normalizedPage =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [total, customers, vehicles, services, employees] = await Promise.all([
    db.workOrder.count(),
    db.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ where: { active: true }, orderBy: { plate: "asc" } }),
    db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(normalizedPage, totalPages);
  const orders = await db.workOrder.findMany({
    include: { customer: true, vehicle: true, items: true },
    orderBy: { number: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <>
      <h1>Ordens de Serviço</h1>
      <div className="grid">
        <OrderForm
          customers={customers}
          vehicles={vehicles.map((vehicle) => ({
            id: vehicle.id,
            customerId: vehicle.customerId,
            label: `${vehicle.plate} · ${vehicle.brand} ${vehicle.model}`,
          }))}
          services={services.map((service) => ({
            id: service.id,
            name: service.name,
            price: Number(service.defaultPrice),
          }))}
          employees={employees}
        />
        <div>
          <div className="card table-wrap">
            <table className="table">
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/ordens/${order.id}`}>
                        <strong>OS #{order.number}</strong>
                      </Link>
                      <br />
                      {order.customer.name} · {order.vehicle.plate}
                      <br />
                      <span className="muted">
                        {order.scheduledAt
                          ? formatDate(order.scheduledAt)
                          : "Sem agenda"}
                      </span>
                    </td>
                    <td>
                      {order.items.length} serviços
                      <br />
                      {formatCurrency(order.total.toString())}
                    </td>
                    <td>
                      {order.paymentStatus !== "PAID" &&
                        order.status !== "CANCELED" && (
                          <PayOrderButton workOrderId={order.id} />
                        )}
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Nenhuma ordem de serviço cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            pathname="/ordens"
          />
        </div>
      </div>
    </>
  );
}
