import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { privateStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await auth())?.user)
    return new NextResponse("Não autorizado", { status: 401 });
  const item = await db.signature.findUnique({
    where: { id: (await params).id },
  });
  if (!item) return new NextResponse("Não encontrado", { status: 404 });
  const bytes = await privateStorage.get(item.objectKey);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
