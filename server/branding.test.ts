import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readBrandLogo } from "./branding";

describe("identidade visual oficial", () => {
  it("mantém o PNG oficial íntegro e com sua proporção original", async () => {
    const bytes = await readBrandLogo();
    const metadata = await sharp(bytes).metadata();

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "8fd46cdb83e93e2abfd120dfa0fe544bf14542ac21442c4cff476c6931a4ba07",
    );
    expect(metadata).toMatchObject({ format: "png", width: 1378, height: 689 });
  });
});
