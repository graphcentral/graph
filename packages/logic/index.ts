import { Client } from "@notionhq/client"
import to from "await-to-js"
import * as dotenv from "dotenv"
import path from "path"
import { collectAllChildren } from "./collect-all-children"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

;(async () => {
  const a: any[] = [
    // notion.pages.retrieve({
    //   page_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`
    // }),
    // notion.blocks.children.list({
    //   block_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`,
    // }),
    // notion.blocks.retrieve({
    //   block_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`
    // }),
    // notion.databases.retrieve({
    //   database_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`
    // }),
  ]
  // const b = await to(Promise.allSettled(a))
  // console.log(JSON.stringify(b, undefined, 2))
  const children = await collectAllChildren(notion, `aa362e29a8c24d6ba084ceca5a717db6`)
  console.log(`DONE`)
  console.log(children)
})()
