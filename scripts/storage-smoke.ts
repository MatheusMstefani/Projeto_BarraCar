import { randomUUID } from "node:crypto";
import {
  createMinioStorage,
  resolveMinioStorageConfig,
} from "../lib/storage/minio";

async function main() {
  const storage = createMinioStorage(resolveMinioStorageConfig(process.env));
  const key = `smoke-tests/${randomUUID()}.txt`;
  const expected = new TextEncoder().encode("barracar-storage-smoke");

  try {
    await storage.put(key, expected, "text/plain");
    const actual = await storage.get(key);
    if (Buffer.compare(Buffer.from(actual), Buffer.from(expected)) !== 0) {
      throw new Error("O conteúdo baixado do MinIO diverge do arquivo enviado.");
    }
    console.log("MinIO smoke test: upload, download e integridade OK.");
  } finally {
    await storage.delete?.(key);
  }
}

main().catch((error) => {
  console.error("MinIO smoke test falhou.", error);
  process.exitCode = 1;
});
