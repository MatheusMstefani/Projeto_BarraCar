import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readBrandLogo } from "./branding";

describe("identidade visual oficial", () => {
  it("mantém o PNG oficial íntegro e com sua proporção original", async () => {
    const bytes = await readBrandLogo();
    const metadata = await sharp(bytes).metadata();

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "9cfa97d220f7c889c1a2090cb5737e1d831737ce76671c89e4b6137a258a2afb",
    );
    expect(metadata).toMatchObject({
      format: "png",
      width: 1536,
      height: 1024,
      hasAlpha: true,
    });
  });
});
