import { WorkOrderStatus } from "@prisma/client";
import { auth } from "@/auth";
import { ShellChrome, type NavGroup } from "@/components/shell-chrome";
import { ADMIN_ONLY_ROUTES } from "@/lib/authorization";
import { db } from "@/lib/db";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [session, openOrders] = await Promise.all([
    auth(),
    db.workOrder.count({
      where: {
        status: {
          in: [
            WorkOrderStatus.WAITING,
            WorkOrderStatus.SCHEDULED,
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.PAUSED,
          ],
        },
      },
    }),
  ]);
  const isAdmin = session?.user.role === "ADMIN";

  const groups: NavGroup[] = [
    {
      key: "operacao",
      label: "Operação",
      icon: "receipt_long",
      items: [
        { href: "/ordens", label: "Ordens de Serviço", icon: "receipt_long", badge: openOrders || undefined },
        { href: "/agenda", label: "Agenda", icon: "calendar_today" },
      ],
    },
    {
      key: "cadastros",
      label: "Cadastros",
      icon: "group",
      items: [
        { href: "/clientes", label: "Clientes", icon: "group" },
        { href: "/veiculos", label: "Veículos", icon: "directions_car" },
        { href: "/servicos", label: "Serviços", icon: "cleaning_services" },
        { href: "/funcionarios", label: "Funcionários", icon: "engineering" },
      ],
    },
    {
      key: "gestao",
      label: "Gestão",
      icon: "payments",
      items: [
        { href: "/financeiro", label: "Financeiro", icon: "payments" },
        { href: "/historico", label: "Histórico", icon: "history" },
        { href: "/configuracoes", label: "Configurações", icon: "settings" },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAdmin || !ADMIN_ONLY_ROUTES.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <ShellChrome
      user={{ name: session?.user.name ?? "", role: session?.user.role ?? "EMPLOYEE" }}
      isAdmin={isAdmin}
      groups={groups}
    >
      {children}
    </ShellChrome>
  );
}
