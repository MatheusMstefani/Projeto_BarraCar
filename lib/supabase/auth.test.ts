import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "./config";
import { identityFromClaims } from "./identity";
import { getAuthRedirectPath } from "./route-policy";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("configuração pública do Supabase", () => {
  it("não inicializa parcialmente sem URL e chave", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "chave-publica";
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("retorna apenas URL e chave publicável configuradas", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "chave-publica";
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://projeto.supabase.co",
      publishableKey: "chave-publica",
    });
  });
});

describe("identidade verificada", () => {
  it("extrai somente identificador e e-mail", () => {
    expect(identityFromClaims({ sub: "user-id", email: "admin@barracar.local" })).toEqual({
      id: "user-id",
      email: "admin@barracar.local",
    });
  });

  it("rejeita claims sem subject válido", () => {
    expect(identityFromClaims({ email: "admin@barracar.local" })).toBeNull();
  });
});

describe("proteção de rotas", () => {
  it("redireciona visitante sem sessão para o login", () => {
    expect(getAuthRedirectPath("/auth-test", false)).toBe("/login");
    expect(getAuthRedirectPath("/financeiro", false)).toBe("/login");
  });

  it("mantém a rota protegida para sessão válida", () => {
    expect(getAuthRedirectPath("/auth-test", true)).toBeNull();
  });

  it("deixa a página de login validar o vínculo com o usuário interno", () => {
    expect(getAuthRedirectPath("/login", true)).toBeNull();
    expect(getAuthRedirectPath("/login", false)).toBeNull();
  });
});
