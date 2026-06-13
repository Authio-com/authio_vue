import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "nuxt-module": "src/nuxt-module.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: ["vue", "vue-router", "@useauthio/node"],
  splitting: false,
  treeshake: true,
});
