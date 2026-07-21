import { DomainError } from "@/lib/errors";
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

type CivilDateParts = {
  year: number;
  month: number;
  day: number;
};

function formatter(timeZone: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
          second: "2-digit" as const,
          hourCycle: "h23" as const,
        }
      : {}),
  });
}

function numericParts(date: Date, timeZone: string, includeTime = false) {
  const parts = formatter(timeZone, includeTime).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
}

function civilParts(date: Date, timeZone: string): CivilDateParts {
  const parts = numericParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function civilDateValue({ year, month, day }: CivilDateParts) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function zonedMidnight(parts: CivilDateParts, timeZone: string) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day);
  let instant = desired;

  // Intl exposes zoned calendar fields, so iterating the difference converts
  // local midnight to its real UTC instant without assuming a fixed offset.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = numericParts(new Date(instant), timeZone, true);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const difference = desired - actualAsUtc;
    instant += difference;
    if (difference === 0) break;
  }

  return new Date(instant);
}

export function getAppTimeZone() {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIME_ZONE;
}

/** Stores a calendar-only value at UTC midnight, independent of server TZ. */
export function parseCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DomainError("Data civil inválida.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DomainError("Data civil inválida.");
  }
  return date;
}

/** Formats a calendar-only database value without shifting it to a local TZ. */
export function formatCivilDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

export function getCivilDateInputValue(
  now = new Date(),
  timeZone = getAppTimeZone(),
) {
  return civilDateValue(civilParts(now, timeZone));
}

export function getDashboardDateBoundaries(
  now = new Date(),
  timeZone = getAppTimeZone(),
) {
  const today = civilParts(now, timeZone);
  const nextMonth =
    today.month === 12
      ? { year: today.year + 1, month: 1, day: 1 }
      : { year: today.year, month: today.month + 1, day: 1 };
  return {
    appointmentsFrom: zonedMidnight(today, timeZone),
    financialMonthFrom: parseCivilDate(
      civilDateValue({ ...today, day: 1 }),
    ),
    financialNextMonthFrom: parseCivilDate(civilDateValue(nextMonth)),
  };
}
