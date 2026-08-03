import { readFile } from "node:fs/promises";
import path from "node:path";

const brandLogoFile = path.join(
  process.cwd(),
  "public",
  "branding",
  "barracar-logo.png",
);

export function readBrandLogo() {
  return readFile(brandLogoFile);
}
