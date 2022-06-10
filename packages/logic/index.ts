import { Client } from "@notionhq/client"
import * as dotenv from "dotenv"
import path from "path"
import { collectAllChildren } from "./collect-all-children"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

;(async () => {
  const children = await collectAllChildren(notion, `aa362e29a8c24d6ba084ceca5a717db6`)
  console.log(`DONE`)
  console.log(children)
})()
