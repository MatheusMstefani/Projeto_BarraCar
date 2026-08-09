import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PrivateStorage } from "./types";

interface MinioEnvironment {
  NODE_ENV?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
}

export interface MinioStorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function credential(
  environment: MinioEnvironment,
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

export function resolveMinioStorageConfig(
  environment: MinioEnvironment = process.env,
): MinioStorageConfig {
  return {
    endpoint: environment.S3_ENDPOINT?.trim() || "http://localhost:9000",
    region: environment.S3_REGION?.trim() || "us-east-1",
    bucket: environment.S3_BUCKET?.trim() || "barracar-private",
    accessKeyId: credential(environment, "S3_ACCESS_KEY", "barracar"),
    secretAccessKey: credential(
      environment,
      "S3_SECRET_KEY",
      "troque-esta-chave-local",
    ),
  };
}

export function createMinioStorage(config: MinioStorageConfig): PrivateStorage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      if (!result.Body) throw new Error("Arquivo não encontrado.");
      return result.Body.transformToByteArray();
    },
    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    async healthCheck() {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    },
  };
}
