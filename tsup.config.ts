import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/S3Client.ts"],
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  format: ["cjs", "esm"],
  dts: true,
  bundle: true,
  noExternal: [/./],
  outDir: "build",
  // cjsInterop: true,
});
