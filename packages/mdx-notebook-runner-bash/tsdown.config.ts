import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts", "src/register.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  unbundle: true
});
