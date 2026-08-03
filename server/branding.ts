import { readFile } from "node:fs/promises";
import path from "node:path";

const brandLogoFile = path.join(
  process.cwd(),
  "app",
  "BarraCar-Logo.png",
);

export function readBrandLogo() {
  return readFile(brandLogoFile);
}
