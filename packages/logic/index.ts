// import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

// const notion = new Client({
//   auth: process.env.NOTION_TOKEN,
//   notionVersion: `2022-02-22`,
// })
;(async () => {
  const { NotionAPI } = await import(`notion-client`)
  const notionUnofficialClient = new NotionAPI()

  const recordMap2 = await notionUnofficialClient.getPage(
    `1f96a097fd1a4c53a3c42a3288f39e9d`
  )
  const recordMap3 = await notionUnofficialClient.getBlocks([
    `1f96a097-fd1a-4c53-a3c4-2a3288f39e9d`,
  ])
  const recordMap4 = await notionUnofficialClient.getPageRaw(
    `1f96a097fd1a4c53a3c42a3288f39e9d`
  )
  console.log(JSON.stringify(recordMap2, null, 2))
  console.log(JSON.stringify(recordMap3, null, 2))
  console.log(JSON.stringify(recordMap4, null, 2))

  // const graph = await getGraphFromRootBlock(
  //   notion,
  //   `aa362e29a8c24d6ba084ceca5a717db6`
  // )
  // console.log(JSON.stringify(graph, null, 2))
})()
