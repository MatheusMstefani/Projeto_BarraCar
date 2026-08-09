import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value || /^\[(?:encrypted|redacted)\]$/i.test(value)) {
    throw new Error(`${name} não está disponível no ambiente de deployment.`);
  }
  return value;
}

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { status?: number; statusCode?: string | number };
  return Number(candidate.status ?? candidate.statusCode) || null;
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  const digest = (value: Uint8Array) =>
    createHash("sha256").update(value).digest("hex");
  return digest(left) === digest(right);
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = required("SUPABASE_SECRET_KEY");
  const bucketName = required("SUPABASE_STORAGE_BUCKET");
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const current = await supabase.storage.getBucket(bucketName);
  if (current.error) {
    if (errorStatus(current.error) !== 404) {
      throw new Error("Não foi possível consultar o bucket privado do Supabase.");
    }
    const created = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (created.error) {
      throw new Error("Não foi possível criar o bucket privado do Supabase.");
    }
  }

  const updated = await supabase.storage.updateBucket(bucketName, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (updated.error) {
    throw new Error("Não foi possível reforçar a configuração privada do bucket.");
  }

  const verified = await supabase.storage.getBucket(bucketName);
  if (verified.error || !verified.data || verified.data.public) {
    throw new Error("O bucket do Supabase não foi validado como privado.");
  }

  const key = `smoke-tests/${randomUUID()}.png`;
  const expected = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const files = supabase.storage.from(bucketName);

  try {
    const uploaded = await files.upload(key, expected, {
      contentType: "image/png",
      upsert: false,
    });
    if (uploaded.error) throw new Error("O upload de teste no bucket falhou.");

    const downloaded = await files.download(key);
    if (downloaded.error || !downloaded.data) {
      throw new Error("O download de teste no bucket falhou.");
    }
    const downloadedBytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (!sameBytes(expected, downloadedBytes)) {
      throw new Error("A integridade do arquivo baixado não confere.");
    }

    const signed = await files.createSignedUrl(key, 60);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error("A criação da URL assinada de teste falhou.");
    }
    const signedResponse = await fetch(signed.data.signedUrl, {
      cache: "no-store",
    });
    if (!signedResponse.ok) {
      throw new Error("A leitura pela URL assinada de teste falhou.");
    }

    const publicUrl = files.getPublicUrl(key).data.publicUrl;
    const publicResponse = await fetch(publicUrl, {
      cache: "no-store",
      redirect: "manual",
    });
    if (publicResponse.ok) {
      throw new Error("O arquivo de teste ficou acessível sem autenticação.");
    }
  } finally {
    const removed = await files.remove([key]);
    if (removed.error) {
      throw new Error("A limpeza do arquivo de smoke test falhou.");
    }
  }

  console.log(
    "Supabase Storage validado: bucket privado, upload, download, URL assinada e limpeza OK.",
  );
}

main().catch((error) => {
  console.error(
    "Provisionamento do Supabase Storage falhou:",
    error instanceof Error ? error.message : "erro desconhecido",
  );
  process.exitCode = 1;
});
