import type { HistoryQuery } from "./contracts";

export type HistoryReader<TResult> = {
  read(query: HistoryQuery): Promise<TResult>;
};

export function createGetHistoryData<TResult>(reader: HistoryReader<TResult>) {
  return function getHistoryData(query: HistoryQuery) {
    return reader.read(query);
  };
}
