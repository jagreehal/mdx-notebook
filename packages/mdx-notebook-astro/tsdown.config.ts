import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/vite-plugin.ts"],
  format: ["esm"],
  dts: true,
  unbundle: true,
  clean: true,
  sourcemap: true,
});
