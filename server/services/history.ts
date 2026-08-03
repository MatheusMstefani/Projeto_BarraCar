// Compatibility façade. New callers must use server/modules/history/public.
export { getHistoryData } from "@/server/modules/history/public";
export type {
  HistoryFilters,
  HistoryQuery,
} from "@/server/modules/history/public";
export { HISTORY_COMPLETED_STATUSES } from "@/server/modules/history/adapters/prisma-history-reader";
