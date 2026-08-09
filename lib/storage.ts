import type { PrivateStorage } from "./storage/types";
import { createMinioStorage, resolveMinioStorageConfig } from "./storage/minio";
import {
  createSupabaseStorage,
  resolveSupabaseStorageConfig,
} from "./storage/supabase";

export type { PrivateStorage } from "./storage/types";
export { resolveMinioStorageConfig, resolveSupabaseStorageConfig };

type StorageProvider = "minio" | "supabase";

interface StorageEnvironment {
  NODE_ENV?: string;
  STORAGE_PROVIDER?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
}

export function resolveStorageProvider(
  environment: StorageEnvironment = process.env,
): StorageProvider {
  const configured = environment.STORAGE_PROVIDER?.trim().toLowerCase();
  if (!configured) return "minio";
  if (configured === "minio" || configured === "supabase") return configured;
  throw new Error("STORAGE_PROVIDER deve ser 'minio' ou 'supabase'.");
}

export function createPrivateStorage(
  environment: StorageEnvironment = process.env,
): PrivateStorage {
  const provider = resolveStorageProvider(environment);
  if (provider === "supabase") {
    return createSupabaseStorage(resolveSupabaseStorageConfig(environment));
  }
  return createMinioStorage(resolveMinioStorageConfig(environment));
}

let cachedStorage: PrivateStorage | null = null;
function selectedStorage() {
  if (!cachedStorage) cachedStorage = createPrivateStorage();
  return cachedStorage;
}

// O proxy mantém a configuração preguiçosa: o build pode importar os módulos
// sem exigir credenciais, mas a primeira operação valida o provider selecionado.
export const privateStorage: PrivateStorage = {
  put(key, body, contentType) {
    return selectedStorage().put(key, body, contentType);
  },
  get(key) {
    return selectedStorage().get(key);
  },
  delete(key) {
    return selectedStorage().delete?.(key) ?? Promise.resolve();
  },
  healthCheck() {
    return selectedStorage().healthCheck?.() ?? Promise.resolve();
  },
};
