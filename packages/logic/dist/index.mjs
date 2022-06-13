// index.ts
import * as dotenv from "dotenv";
import path from "path";
import { NotionAPI } from "notion-client";
import { dirname } from "path";
import { fileURLToPath } from "url";
var __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) });
(async () => {
  const notionUnofficialClient = new NotionAPI();
  const recordMap2 = await notionUnofficialClient.getPage(`1f96a097fd1a4c53a3c42a3288f39e9d`);
  console.log(JSON.stringify(recordMap2, null, 2));
})();
