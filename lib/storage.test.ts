import { describe, expect, it, vi } from "vitest";
import {
  resolveMinioStorageConfig,
  resolveStorageProvider,
  resolveSupabaseStorageConfig,
} from "./storage";
import {
  createSupabaseStorage,
  type SupabaseStorageClient,
} from "./storage/supabase";

describe("configuração de Storage", () => {
  it("mantém MinIO como provider padrão local", () => {
    expect(resolveStorageProvider({ NODE_ENV: "development" })).toBe("minio");
    expect(resolveMinioStorageConfig({ NODE_ENV: "development" })).toMatchObject({
      endpoint: "http://localhost:9000",
      bucket: "barracar-private",
      accessKeyId: "barracar",
      secretAccessKey: "troque-esta-chave-local",
    });
  });

  it("rejeita provider desconhecido", () => {
    expect(() => resolveStorageProvider({ STORAGE_PROVIDER: "filesystem" })).toThrow(
      /STORAGE_PROVIDER/,
    );
  });

  it("exige credenciais do MinIO em produção quando ele é selecionado", () => {
    expect(() => resolveMinioStorageConfig({ NODE_ENV: "production" })).toThrow(
      /S3_ACCESS_KEY/,
    );
  });

  it("exige URL e Secret Key no provider Supabase", () => {
    expect(() => resolveSupabaseStorageConfig({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() =>
      resolveSupabaseStorageConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(/SUPABASE_SECRET_KEY/);
  });
});

describe("Supabase Storage adapter", () => {
  it("implementa upload, download, remoção e health check na mesma porta do MinIO", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const bucket = {
      upload: vi.fn().mockResolvedValue({ data: { path: "photo.jpg" }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob([bytes]), error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const client = {
      storage: {
        getBucket: vi.fn().mockResolvedValue({ data: { id: "barracar-private" }, error: null }),
        from: vi.fn().mockReturnValue(bucket),
      },
    } as SupabaseStorageClient;
    const storage = createSupabaseStorage(
      {
        url: "https://example.supabase.co",
        secretKey: "server-only-test-key",
        bucket: "barracar-private",
      },
      client,
    );

    await storage.put("work-orders/photo.jpg", bytes, "image/jpeg");
    await expect(storage.get("work-orders/photo.jpg")).resolves.toEqual(bytes);
    await storage.delete?.("work-orders/photo.jpg");
    await storage.healthCheck?.();

    expect(client.storage.from).toHaveBeenCalledWith("barracar-private");
    expect(bucket.upload).toHaveBeenCalledWith("work-orders/photo.jpg", bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    expect(bucket.remove).toHaveBeenCalledWith(["work-orders/photo.jpg"]);
    expect(client.storage.getBucket).toHaveBeenCalledWith("barracar-private");
  });

  it("não oculta erros retornados pelo Supabase", async () => {
    const client = {
      storage: {
        getBucket: vi.fn(),
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
          download: vi.fn(),
          remove: vi.fn(),
        }),
      },
    } as unknown as SupabaseStorageClient;
    const storage = createSupabaseStorage(
      {
        url: "https://example.supabase.co",
        secretKey: "server-only-test-key",
        bucket: "barracar-private",
      },
      client,
    );

    await expect(storage.put("blocked.jpg", new Uint8Array(), "image/jpeg")).rejects.toThrow(
      /denied/,
    );
  });
});
