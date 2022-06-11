import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { getGraphFromRootBlock } from "./get-graph-from-root-block"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: `2022-02-22`,
})

;(async () => {
  const graph = await getGraphFromRootBlock(
    notion,
    `aa362e29a8c24d6ba084ceca5a717db6`
  )
  console.log(JSON.stringify(graph, null, 2))
})()
