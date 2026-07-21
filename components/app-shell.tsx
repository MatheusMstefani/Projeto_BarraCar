import { WorkOrderStatus } from "@prisma/client";
import { auth } from "@/auth";
import { ShellChrome, type NavLink } from "@/components/shell-chrome";
import { ADMIN_ONLY_ROUTES } from "@/lib/authorization";
import { db } from "@/lib/db";

const allLinks: Omit<NavLink, "badge">[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/ordens", label: "Ordens de Serviço", icon: "receipt_long" },
  { href: "/agenda", label: "Agenda", icon: "calendar_today" },
  { href: "/clientes", label: "Clientes", icon: "group" },
  { href: "/veiculos", label: "Veículos", icon: "directions_car" },
  { href: "/servicos", label: "Serviços", icon: "cleaning_services" },
  { href: "/funcionarios", label: "Funcionários", icon: "engineering" },
  { href: "/financeiro", label: "Financeiro", icon: "payments" },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
];

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
  const links: NavLink[] = allLinks
    .filter((link) => isAdmin || !ADMIN_ONLY_ROUTES.has(link.href))
    .map((link) => (link.href === "/ordens" && openOrders ? { ...link, badge: openOrders } : link));

  return (
    <ShellChrome
      user={{ name: session?.user.name ?? "", role: session?.user.role ?? "EMPLOYEE" }}
      isAdmin={isAdmin}
      links={links}
    >
      {children}
    </ShellChrome>
  );
}
