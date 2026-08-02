import {
  getAppTimeZone,
  getCivilDateInputValue,
  getZonedDateStart,
  parseCivilDate,
} from "@/lib/date-time";

export type HistoryPeriodMode =
  | "month"
  | "custom"
  | "last3"
  | "last6"
  | "year"
  | "previousYear"
  | "all";

export type HistoryPeriod = {
  mode: HistoryPeriodMode;
  year: number;
  month: number;
  fromValue: string;
  toValue: string;
  instantFrom: Date | null;
  instantTo: Date | null;
  civilFrom: Date | null;
  civilTo: Date | null;
  label: string;
};

export type HistoryPeriodParams = {
  mode?: string;
  year?: string;
  month?: string;
  from?: string;
  to?: string;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function validYear(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200
    ? parsed
    : fallback;
}

function validMonth(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : fallback;
}

function validCivilDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    parseCivilDate(value);
    return value;
  } catch {
    return null;
  }
}

function dateValue(year: number, month: number, day = 1) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function addMonths(year: number, month: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function nextCivilDay(value: string) {
  const date = parseCivilDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return dateValue(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function buildRange(
  mode: HistoryPeriodMode,
  year: number,
  month: number,
  fromValue: string,
  exclusiveToValue: string,
  label: string,
  timeZone: string,
): HistoryPeriod {
  const lastDay = parseCivilDate(exclusiveToValue);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return {
    mode,
    year,
    month,
    fromValue,
    toValue: dateValue(
      lastDay.getUTCFullYear(),
      lastDay.getUTCMonth() + 1,
      lastDay.getUTCDate(),
    ),
    instantFrom: getZonedDateStart(fromValue, timeZone),
    instantTo: getZonedDateStart(exclusiveToValue, timeZone),
    civilFrom: parseCivilDate(fromValue),
    civilTo: parseCivilDate(exclusiveToValue),
    label,
  };
}

export function resolveHistoryPeriod(
  params: HistoryPeriodParams,
  now = new Date(),
  timeZone = getAppTimeZone(),
): HistoryPeriod {
  const today = getCivilDateInputValue(now, timeZone);
  const [currentYear, currentMonth] = today.split("-").map(Number);
  const requestedMode = params.mode as HistoryPeriodMode | undefined;
  const mode: HistoryPeriodMode = [
    "month",
    "custom",
    "last3",
    "last6",
    "year",
    "previousYear",
    "all",
  ].includes(requestedMode ?? "")
    ? requestedMode!
    : "month";
  const year = validYear(params.year, currentYear);
  const month = validMonth(params.month, currentMonth);

  if (mode === "all") {
    return {
      mode,
      year,
      month,
      fromValue: "",
      toValue: "",
      instantFrom: null,
      instantTo: null,
      civilFrom: null,
      civilTo: null,
      label: "Todo o período",
    };
  }

  if (mode === "custom") {
    const requestedFrom = validCivilDate(params.from);
    const requestedTo = validCivilDate(params.to);
    const fromValue = requestedFrom ?? requestedTo ?? today;
    const toValue = requestedTo ?? requestedFrom ?? today;
    const from = parseCivilDate(fromValue);
    const to = parseCivilDate(toValue);
    const orderedFrom = from <= to ? fromValue : toValue;
    const orderedTo = from <= to ? toValue : fromValue;
    const exclusiveTo = nextCivilDay(orderedTo);
    return buildRange(
      mode,
      year,
      month,
      orderedFrom,
      exclusiveTo,
      `${orderedFrom.split("-").reverse().join("/")} a ${orderedTo.split("-").reverse().join("/")}`,
      timeZone,
    );
  }

  let rangeYear = year;
  let rangeMonth = month;
  if (mode === "previousYear") rangeYear = year - 1;
  if (mode === "last3" || mode === "last6") {
    rangeYear = currentYear;
    rangeMonth = currentMonth;
  }
  const start =
    mode === "last3" || mode === "last6"
      ? addMonths(currentYear, currentMonth, mode === "last3" ? -2 : -5)
      : mode === "year" || mode === "previousYear"
        ? { year: rangeYear, month: 1 }
      : { year: rangeYear, month: rangeMonth };
  const end =
    mode === "year" || mode === "previousYear"
      ? { year: rangeYear + 1, month: 1 }
      : mode === "last3" || mode === "last6"
        ? addMonths(currentYear, currentMonth, 1)
        : addMonths(rangeYear, rangeMonth, 1);
  const fromValue = dateValue(start.year, start.month);
  const exclusiveTo = dateValue(end.year, end.month);
  const label =
    mode === "year" || mode === "previousYear"
      ? `Ano de ${rangeYear}`
      : mode === "last3"
        ? "Últimos 3 meses"
        : mode === "last6"
          ? "Últimos 6 meses"
          : monthFormatter.format(new Date(Date.UTC(rangeYear, rangeMonth - 1, 1)));
  return buildRange(mode, rangeYear, rangeMonth, fromValue, exclusiveTo, label, timeZone);
}

export function adjacentMonth(year: number, month: number, amount: -1 | 1) {
  return addMonths(year, month, amount);
}

export function historyPeriodFormYear(period: Pick<HistoryPeriod, "mode" | "year">) {
  return period.mode === "previousYear" ? period.year + 1 : period.year;
}

export function instantRange(period: HistoryPeriod) {
  return period.instantFrom && period.instantTo
    ? { gte: period.instantFrom, lt: period.instantTo }
    : undefined;
}

export function civilRange(period: HistoryPeriod) {
  return period.civilFrom && period.civilTo
    ? { gte: period.civilFrom, lt: period.civilTo }
    : undefined;
}
