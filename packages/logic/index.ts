import * as dotenv from "dotenv"
import path from "path"
import { NotionGraph } from "./lib/get-graph-from-root-block"
import { NotionAPI } from "notion-client"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { toEnhanced } from "./lib/global-util"
import fs from "fs"

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })
;(async () => {
  const unofficialNotionAPI = new NotionAPI()
  const notionGraph = new NotionGraph({
    unofficialNotionAPI,
    maxDiscoverableNodes: 2000,
    maxDiscoverableNodesInOtherSpaces: 2000,
  })
  const startTime = Date.now()
  const t = await notionGraph.buildGraphFromRootNode(
    `e040febf70a94950b8620e6f00005004`
    // `fdfbe8ec2cdb45ebbd6b7d955a0bfa7a`
  )
  const endTime = Date.now()

  console.log(`t.nodes.length`)
  console.log(t.nodes.length)
  console.log(t.links.length)
  console.log(`t.nodes.length`)
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
