// import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { NotionGraph } from "./unofficial/get-graph-from-root-block"
import { NotionAPI } from "notion-client"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { separateIdWithDashSafe } from "./official/notion-util"

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })
;(async () => {
  const notionUnofficialClient = new NotionAPI()
  const notionGraph = new NotionGraph(notionUnofficialClient)
  // let result
  // try {
  //   result = await Promise.all([
  //     notionUnofficialClient.getPage(`1f96a097fd1a4c53a3c42a3288f39e9d`),
  //     notionUnofficialClient.getPageRaw(`1f96a097fd1a4c53a3c42a3288f39e9d`),
  //     notionUnofficialClient.getBlocks([
  //       separateIdWithDashSafe(`1f96a097fd1a4c53a3c42a3288f39e9d`),
  //     ]),
  //     notionUnofficialClient.getBlocks([
  //       separateIdWithDashSafe(`60288d0e94c54f7eb577541daee1a3f5`), // separateIdWithDashSafe(`da588333-9327-48db-bc4b-084ab6131aad`),
  //       `58e7440f-fad4-4a30-9de3-2dc5f5673b62`,
  //       `056b92f8-6fbc-4565-a0d2-597f03666fd8`,
  //     ]),
  //     notionUnofficialClient.getPage(`60288d0e94c54f7eb577541daee1a3f5`),
  //   ])
  // } catch (e) {
  //   console.log(e)
  // }
  // if (!result) return
  // const [a, b, c, d, e] = result

  // const w = d.recordMap.block[`da588333-9327-48db-bc4b-084ab6131aad`]
  // const collectionData = await notionUnofficialClient.getCollectionData(
  //   `58e7440f-fad4-4a30-9de3-2dc5f5673b62`,
  //   `056b92f8-6fbc-4565-a0d2-597f03666fd8`,
  //   w.value
  // )
  // console.log(JSON.stringify(e, null, 2))
  // e['recordM']

  // console.log(ff)
  const t = notionGraph.getGraphFromRootBlock(
    `1f96a097fd1a4c53a3c42a3288f39e9d`
  )
})()
