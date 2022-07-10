import * as dotenv from "dotenv"
import path from "path"
import { NotionGraph } from "./lib/get-graph-from-root-block"
import { NotionAPI } from "notion-client"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { debugObject, toEnhanced } from "./lib/global-util"
import fs from "fs"

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })
;(async () => {
  const unofficialNotionAPI = new NotionAPI()
  const notionGraph = new NotionGraph({
    unofficialNotionAPI,
    maxDiscoverableNodes: 500,
    maxDiscoverableNodesInOtherSpaces: 500,
  })
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
  //     // notionUnofficialClient.getPageRaw(`da588333932748dbbc4b084ab6131aad`),
  //     // notionUnofficialClient.getBlocks(
  //     //   [`da588333932748dbbc4b084ab6131aad`].map(separateIdWithDashSafe)
  //     // ),
  //     notionUnofficialClient.getPage(`c9d98d57b00f4c3688e05b6218e1b272`),
  //   ])
  // } catch (e) {
  //   console.log(e)
  // }
  // if (!result) return
  // const [a, b, c, d, ...e] = result
  // debugObject(e)

  // const w = d.recordMap.block[`da588333-9327-48db-bc4b-084ab6131aad`]
  // const collectionData = await notionUnofficialClient.getCollectionData(
  //   `58e7440f-fad4-4a30-9de3-2dc5f5673b62`,
  //   `056b92f8-6fbc-4565-a0d2-597f03666fd8`,
  //   w.value
  // )
  // console.log(JSON.stringify(e, null, 2))
  // e['recordM']

  // console.log(ff)
  //7oel.notion.site/Get-Started-
  // https://7oel.notion.site/Get-Started-
  // https://7oel.notion.site/Simple-testing-ground-
  // https://coal-magician-b73.notion.site/
  const startTime = Date.now()
  const t = await notionGraph.buildGraphFromRootNode(
    `e040febf70a94950b8620e6f00005004`
  )
  const endTime = Date.now()

  console.log(`Took ${(endTime - startTime) / 1000} secs`)
  const [err, _writeFileResult] = await toEnhanced(
    new Promise((resolve, reject) => {
      fs.writeFile(`test0.json`, JSON.stringify(t), (err) => {
        if (err) reject(err)
        else resolve(``)
      })
    })
  )

  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    process.exit(0)
  }
})()
