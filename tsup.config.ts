import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/S3Client.ts"],
  splitting: false,
  sourcemap: false,
  clean: true,
  // legacyOutput: true,
  format: ["cjs", "esm"],
  dts: true,
  outDir: "build",
});
