import { CustomerForm } from "@/components/customer-form";
import { Pagination } from "@/components/pagination";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const normalizedPage =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await db.customer.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(normalizedPage, totalPages);
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <>
      <h1>Clientes</h1>
      <div className="grid">
        <CustomerForm />
        <div>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.whatsapp}</td>
                    <td>{customer.city}</td>
                  </tr>
                ))}
                {!customers.length && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Nenhum cliente cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            pathname="/clientes"
          />
        </div>
      </div>
    </>
  );
}
