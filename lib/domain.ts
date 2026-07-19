export function normalizePlate(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function formatCurrency(value: number | string) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value)); }
export function formatDate(value: Date) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: process.env.APP_TIMEZONE ?? "America/Sao_Paulo" }).format(value); }
