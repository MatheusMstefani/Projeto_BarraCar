import { createGetHistoryData } from "./application/get-history";
import { prismaHistoryReader } from "./adapters/prisma-history-reader";

export type { HistoryFilters, HistoryQuery } from "./application/contracts";

export const getHistoryData = createGetHistoryData(prismaHistoryReader);
