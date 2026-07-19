import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
export const storageBucket = process.env.S3_BUCKET ?? "barracar-private";

const client = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "barracar",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "troque-esta-chave-local",
  },
});

export interface PrivateStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export const privateStorage: PrivateStorage = {
  async put(key, body, contentType) {
    await client.send(new PutObjectCommand({ Bucket: storageBucket, Key: key, Body: body, ContentType: contentType }));
  },
  async get(key) {
    const result = await client.send(new GetObjectCommand({ Bucket: storageBucket, Key: key }));
    if (!result.Body) throw new Error("Arquivo não encontrado.");
    return result.Body.transformToByteArray();
  },
};
