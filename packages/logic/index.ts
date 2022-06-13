// import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { NotionGraph } from "./unofficial/get-graph-from-root-block"
import { NotionAPI } from "notion-client"
import { dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })
;(async () => {
  const notionUnofficialClient = new NotionAPI()
  const notionGraph = new NotionGraph(notionUnofficialClient)
  notionGraph.getGraphFromRootBlock(`1f96a097fd1a4c53a3c42a3288f39e9d`)
})()
