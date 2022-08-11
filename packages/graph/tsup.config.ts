import { defineConfig } from "tsup"

export default defineConfig({
  entry: [`src/index.ts`],
  splitting: true,
  sourcemap: false,
  clean: true,
  format: [`esm`],
})
