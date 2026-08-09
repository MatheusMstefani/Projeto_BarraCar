import { createClient } from "@supabase/supabase-js";
import type { PrivateStorage } from "./types";

interface SupabaseStorageEnvironment {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
}

export interface SupabaseStorageConfig {
  url: string;
  secretKey: string;
  bucket: string;
}

type StorageResult<T = unknown> = Promise<{
  data: T | null;
  error: { message: string } | null;
}>;

export interface SupabaseStorageClient {
  storage: {
    getBucket(bucket: string): StorageResult;
    from(bucket: string): {
      upload(
        key: string,
        body: Uint8Array,
        options: { contentType: string; upsert: boolean },
      ): StorageResult;
      download(key: string): StorageResult<Blob>;
      remove(keys: string[]): StorageResult;
    };
  };
}

function required(value: string | undefined, name: string) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} deve ser configurada para o Supabase Storage.`);
  return normalized;
}

export function resolveSupabaseStorageConfig(
  environment: SupabaseStorageEnvironment = process.env as SupabaseStorageEnvironment,
): SupabaseStorageConfig {
  return {
    url: required(environment.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required(environment.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY"),
    bucket: environment.SUPABASE_STORAGE_BUCKET?.trim() || "barracar-private",
  };
}

function assertStorageResult(
  operation: string,
  result: { error: { message: string } | null },
) {
  if (result.error) {
    throw new Error(`Supabase Storage: falha ao ${operation}: ${result.error.message}`);
  }
}

export function createSupabaseStorage(
  config: SupabaseStorageConfig,
  injectedClient?: SupabaseStorageClient,
): PrivateStorage {
  const client =
    injectedClient ??
    (createClient(config.url, config.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseStorageClient);
  const bucket = client.storage.from(config.bucket);

  return {
    async put(key, body, contentType) {
      const result = await bucket.upload(key, body, { contentType, upsert: false });
      assertStorageResult(`enviar '${key}'`, result);
    },
    async get(key) {
      const result = await bucket.download(key);
      assertStorageResult(`baixar '${key}'`, result);
      if (!result.data) throw new Error("Supabase Storage: arquivo não encontrado.");
      return new Uint8Array(await result.data.arrayBuffer());
    },
    async delete(key) {
      const result = await bucket.remove([key]);
      assertStorageResult(`remover '${key}'`, result);
    },
    async healthCheck() {
      const result = await client.storage.getBucket(config.bucket);
      assertStorageResult(`acessar o bucket '${config.bucket}'`, result);
    },
  };
}
