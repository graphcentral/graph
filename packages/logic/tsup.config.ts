import { defineConfig } from "tsup"
import path from "path"

export default defineConfig({
  outDir: path.resolve(`.`, `dist`),
  // minify: true,
  // enable compile time type checking
  dts: true,
  target: `node16`,
  platform: `node`,
  format: [`esm`],
})
