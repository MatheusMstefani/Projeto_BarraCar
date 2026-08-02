import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
import { GET } from "@/app/api/history/export/route";
import { csvCell } from "@/lib/csv";

describe("exportação autenticada do histórico", () => {
  it("neutraliza fórmulas em células CSV sem perder o conteúdo", () => {
    expect(csvCell("=HYPERLINK(\"https://example.test\")")).toBe(
      `"'=HYPERLINK(""https://example.test"")"`,
    );
    expect(csvCell("valor normal")).toBe('"valor normal"');
  });

  it("bloqueia acesso sem administrador", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const response = await GET(new NextRequest("http://localhost/api/history/export?format=pdf"));
    expect(response.status).toBe(403);

    mocks.auth.mockResolvedValueOnce({
      user: { id: "funcionario", name: "Funcionário", role: "EMPLOYEE" },
    });
    const employeeResponse = await GET(
      new NextRequest("http://localhost/api/history/export?format=csv"),
    );
    expect(employeeResponse.status).toBe(403);
  });

  it("gera PDF e CSV sem criar novos registros", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "teste", name: "Administrador Teste", role: "ADMIN" },
    });
    const pdf = await GET(new NextRequest("http://localhost/api/history/export?format=pdf&mode=month&year=2024&month=1"));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 4))).toBe("%PDF");

    const csv = await GET(new NextRequest("http://localhost/api/history/export?format=csv&mode=month&year=2024&month=1"));
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const csvBody = await csv.text();
    expect(csvBody).toContain("Barracar Estética Automotiva");
    expect(csvBody).toContain('"Clientes";"Nome";"Atendimentos"');
  });
});
