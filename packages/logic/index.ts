import { Client } from "@notionhq/client"
import to from "await-to-js"
import * as dotenv from "dotenv"
import path from "path"
import { collectAllChildren } from "./collect-all-children"
import { separateIdWithDashSafe } from "./util"

dotenv.config({ path: path.resolve(__dirname, `..`, `..`, `.env`) })

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: `2022-02-22`,
})

;(async () => {
  // const res = await notion.blocks.retrieve({
  //   block_id: `fd6a3fbd-17a8-4325-8f8f-fabb6d5d67aa`,
  // })
  // const res2 = await notion.blocks.children.list({
  //   block_id: `fd6a3fbd-17a8-4325-8f8f-fabb6d5d67aa`,
  // })
  // console.log(res)
  // console.log(res2)
  // @ts-ignore
  // console.log(res.results.map(({ type }) => type))
  // const a = await notion.blocks.retrieve({
  //   block_id: separateIdWithDashSafe(`aa362e29a8c24d6ba084ceca5a717db6`),
  // })
  // console.log(a)
  const children = await collectAllChildren(
    notion,
    `c38aaee124254ce19832e89570141b75`
    // `aa362e29a8c24d6ba084ceca5a717db6`
  )
  console.log(children)
})()
