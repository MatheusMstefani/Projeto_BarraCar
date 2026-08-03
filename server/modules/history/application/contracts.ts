import type { HistoryPeriod } from "@/lib/history-period";

export type HistoryFilters = {
  q?: string;
  status?: string;
  payment?: string;
  employeeId?: string;
  serviceId?: string;
  category?: string;
  paymentMethod?: string;
  financialType?: string;
  financialStatus?: string;
  origin?: string;
};
export type HistoryQuery = {
  period: HistoryPeriod;
  filters?: HistoryFilters;
  page?: number;
  pageSize?: number;
  unpaginated?: boolean;
  timeZone?: string;
};
