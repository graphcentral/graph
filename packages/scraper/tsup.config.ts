import { defineConfig } from "tsup"
import path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

export default defineConfig({
  outDir: path.resolve(`.`, `dist`),
  minify: process.env.NODE_ENV === `production`,
  // enable compile time type checking
  dts: true,
  target: `node16`,
  platform: `node`,
  // always true, for debugging purpose
  sourcemap: true,
  format: [`esm`],
})
