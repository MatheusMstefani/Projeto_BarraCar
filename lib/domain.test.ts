import {describe,expect,it} from "vitest";import {normalizePlate} from "./domain";
describe("normalizePlate",()=>{it("normaliza placa brasileira",()=>expect(normalizePlate("abc-1d23")).toBe("ABC1D23"))});
