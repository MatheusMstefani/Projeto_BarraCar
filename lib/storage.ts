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

// Inicialização preguiçosa: o `next build` importa os módulos com
// NODE_ENV=production e sem as variáveis S3_*; a validação rígida continua
// valendo em produção, mas só na primeira operação de storage.
let cached: { client: S3Client; bucket: string } | null = null;
function storage() {
  if (!cached) {
    const config = resolveStorageConfig();
    cached = {
      bucket: config.bucket,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }
  return cached;
}

export interface PrivateStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete?(key: string): Promise<void>;
}

export const privateStorage: PrivateStorage = {
  async put(key, body, contentType) {
    const { client, bucket } = storage();
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  },
  async get(key) {
    const { client, bucket } = storage();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error("Arquivo não encontrado.");
    return result.Body.transformToByteArray();
  },
  async delete(key) {
    const { client, bucket } = storage();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
