export function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}
