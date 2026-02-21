import { defineConfig } from "tsup";

export default defineConfig([
  {
    // ESM + CJS — for npm consumers and bundlers
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    minify: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
  },
  {
    // IIFE — for plain <script> tag usage via CDN
    // Exposed as the global variable `HttpClient` on window
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "HttpClient",
    minify: true,
    sourcemap: true,
    outExtension: () => ({ js: ".global.js" }),
  },
]);
