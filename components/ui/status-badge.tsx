import type { FinancialStatus, PaymentStatus, WorkOrderStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";

type Entry = [label: string, tone: BadgeTone];

const orderStatus: Record<WorkOrderStatus, Entry> = {
  DRAFT: ["Rascunho", "neutral"],
  WAITING: ["Aguardando", "warning"],
  SCHEDULED: ["Agendada", "info"],
  IN_PROGRESS: ["Em execução", "info"],
  PAUSED: ["Pausada", "warning"],
  FINISHED: ["Finalizada", "success"],
  AWAITING_PICKUP: ["Aguard. retirada", "warning"],
  DELIVERED: ["Entregue", "success"],
  CANCELED: ["Cancelada", "danger"],
};

const paymentStatus: Record<PaymentStatus, Entry> = {
  PENDING: ["Pgto. pendente", "warning"],
  PARTIAL: ["Pgto. parcial", "warning"],
  PAID: ["Paga", "success"],
  CANCELED: ["Pgto. cancelado", "danger"],
};

const financialStatus: Record<FinancialStatus, Entry> = {
  PENDING: ["Pendente", "warning"],
  PAID: ["Pago", "success"],
  OVERDUE: ["Vencido", "danger"],
  CANCELED: ["Cancelado", "neutral"],
};

export function OrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const [label, tone] = orderStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const [label, tone] = paymentStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const [label, tone] = financialStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}
