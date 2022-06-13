import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { getGraphFromRootBlock } from "./get-graph-from-root-block"
import { NotionAPI } from "notion-client"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

// const notion = new Client({
//   auth: process.env.NOTION_TOKEN,
//   notionVersion: `2022-02-22`,
// })
;(async () => {
  const { NotionAPI } = await import(`notion-client`)
  const notionUnofficialClient = new NotionAPI()

  const recordMap = await notionUnofficialClient.getPage(
    `067dd719a912471ea9a3ac10710e7fdf`
  )
  console.log(recordMap)

  // const graph = await getGraphFromRootBlock(
  //   notion,
  //   `aa362e29a8c24d6ba084ceca5a717db6`
  // )
  // console.log(JSON.stringify(graph, null, 2))
})()
