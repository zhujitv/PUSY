import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource, runtimeModuleSpecifiers } from "./helpers/read-source.mjs";

test("source reader follows runtime imports and skips type-only edges", () => {
  const source = `
    import type { TypeOnly } from "./type-only";
    import { type NamedType } from "./named-type-only";
    import { type MixedType, runtimeValue } from "./mixed";
    import "./side-effect";
    export type { ExportedType } from "./exported-type";
    export { type OtherType, runtimeExport } from "./mixed-export";
    const lazy = import("./dynamic");
    const legacy = require("./required");
  `;

  assert.deepEqual(runtimeModuleSpecifiers(source), [
    "./mixed",
    "./side-effect",
    "./mixed-export",
    "./dynamic",
    "./required",
  ]);
});

test("source reader includes dynamically imported implementations", async () => {
  const supportSource = await readSource("lib/support/service.ts");
  assert.match(supportSource, /export async function notifyReturnUpdated/);
});

test("admin shared types stay independent from UI modules", async () => {
  const adminTypes = await readFile(new URL("../app/admin/admin-types.ts", import.meta.url), "utf8");
  assert.deepEqual(runtimeModuleSpecifiers(adminTypes, "admin-types.ts"), []);
  assert.doesNotMatch(adminTypes, /from "\.\/(?:BusinessFeatures|Community|Governance|Growth|Product|Support).*Admin"/);
});
