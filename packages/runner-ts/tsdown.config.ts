import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/register.ts",
    "src/harness/locate.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true
});
