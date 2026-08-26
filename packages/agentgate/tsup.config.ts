import { defineConfig } from "tsup";

export default defineConfig({
  entry: { agentgate: "src/index.ts" },
  format: ["esm", "iife"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  target: "es2020",
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
});
