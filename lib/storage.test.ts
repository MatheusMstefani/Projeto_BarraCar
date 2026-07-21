import { describe, expect, it } from "vitest";
import { resolveStorageConfig } from "./storage";

describe("resolveStorageConfig", () => {
  it("mantém valores locais somente fora de produção", () => {
    expect(resolveStorageConfig({ NODE_ENV: "development" })).toMatchObject({
      endpoint: "http://localhost:9000",
      bucket: "barracar-private",
      accessKeyId: "barracar",
      secretAccessKey: "troque-esta-chave-local",
    });
  });

  it("falha em produção quando as credenciais não foram configuradas", () => {
    expect(() => resolveStorageConfig({ NODE_ENV: "production" })).toThrow(/S3_ACCESS_KEY/);
    expect(() =>
      resolveStorageConfig({ NODE_ENV: "production", S3_ACCESS_KEY: "configured" }),
    ).toThrow(/S3_SECRET_KEY/);
  });

  it("aceita credenciais explícitas em produção", () => {
    expect(
      resolveStorageConfig({
        NODE_ENV: "production",
        S3_ACCESS_KEY: "configured-access-key",
        S3_SECRET_KEY: "configured-secret-key",
      }),
    ).toMatchObject({
      accessKeyId: "configured-access-key",
      secretAccessKey: "configured-secret-key",
    });
  });
});
