// import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { separateIdWithDashSafe } from "./official/notion-util"
// import { NotionGraph } from "./unofficial/get-graph-from-root-block"
import { NotionAPI } from "notion-client"
import { dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

// const notion = new Client({
//   auth: process.env.NOTION_TOKEN,
//   notionVersion: `2022-02-22`,
// })
;(async () => {
  const notionUnofficialClient = new NotionAPI()

  const recordMap2 = await notionUnofficialClient.getPage(
    `1f96a097fd1a4c53a3c42a3288f39e9d`
  )
  // const notionGraph = new NotionGraph(notionUnofficialClient)
  // notionGraph.getGraphFromRootBlock(`1f96a097fd1a4c53a3c42a3288f39e9d`)
  // this only returns the ids of contents inside the block, which is not what we want
  // const recordMap3 = await notionUnofficialClient.getBlocks([
  //   separateIdWithDashSafe(`1f96a097fd1a4c53a3c42a3288f39e9d`),
  // ])
  // this returns too much information (all detailed paragraphs, ...)
  // const recordMap4 = await notionUnofficialClient.getPageRaw(
  //   `1f96a097fd1a4c53a3c42a3288f39e9d`
  // )
  console.log(JSON.stringify(recordMap2, null, 2))
  // console.log(JSON.stringify(recordMap2, null, 2))
  // console.log(JSON.stringify(recordMap4, null, 2))

  // const graph = await getGraphFromRootBlock(
  //   notion,
  //   `aa362e29a8c24d6ba084ceca5a717db6`
  // )
  // console.log(JSON.stringify(graph, null, 2))
})()
