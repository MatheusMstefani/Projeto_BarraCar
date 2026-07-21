import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

interface StorageEnvironment {
  NODE_ENV?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function credential(
  environment: StorageEnvironment,
  name: "S3_ACCESS_KEY" | "S3_SECRET_KEY",
  developmentFallback: string,
) {
  const value = environment[name]?.trim();
  if (value) return value;
  if (environment.NODE_ENV === "production") {
    throw new Error(`${name} deve ser configurada explicitamente em produção.`);
  }
  return developmentFallback;
}

export function resolveStorageConfig(environment: StorageEnvironment = process.env): StorageConfig {
  return {
    endpoint: environment.S3_ENDPOINT?.trim() || "http://localhost:9000",
    region: environment.S3_REGION?.trim() || "us-east-1",
    bucket: environment.S3_BUCKET?.trim() || "barracar-private",
    accessKeyId: credential(environment, "S3_ACCESS_KEY", "barracar"),
    secretAccessKey: credential(environment, "S3_SECRET_KEY", "troque-esta-chave-local"),
  };
}

const storageConfig = resolveStorageConfig();
export const storageBucket = storageConfig.bucket;

const client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export interface PrivateStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete?(key: string): Promise<void>;
}

export const privateStorage: PrivateStorage = {
  async put(key, body, contentType) {
    await client.send(
      new PutObjectCommand({ Bucket: storageBucket, Key: key, Body: body, ContentType: contentType }),
    );
  },
  async get(key) {
    const result = await client.send(new GetObjectCommand({ Bucket: storageBucket, Key: key }));
    if (!result.Body) throw new Error("Arquivo não encontrado.");
    return result.Body.transformToByteArray();
  },
  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket: storageBucket, Key: key }));
  },
};
