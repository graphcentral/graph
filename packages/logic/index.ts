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
    // notion.blocks.retrieve({
    //   block_id: `aa12f46c-f3c3-4a57-8a43-7d063f39d5a6`
    // }),
    // notion.pages.retrieve({
    //   page_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`
    // }),
    // notion.blocks.children.list({
    //   block_id: `aa12f46c-f3c3-4a57-8a43-7d063f39d5a6`,
    // }),
    // notion.blocks.retrieve({
    //   block_id: `aa12f46c-f3c3-4a57-8a43-7d063f39d5a6`
    // }),
    // notion.databases.retrieve({
    //   database_id: `0e034bb8-6b06-444f-b2b6-6082726050d9`
    // }),
  ]
  const res = await notion.blocks.children.list({
    block_id: `aa12f46c-f3c3-4a57-8a43-7d063f39d5a6`,
  })
  // @ts-ignore
  console.log(res.results.map(({ type }) => type), undefined, 2)
  // const children = await collectAllChildren(notion, `aa362e29a8c24d6ba084ceca5a717db6`)
  // children.sort((a, b) => Number(a.title) - Number(b.title))
  // console.log(JSON.stringify(children, null, 2))
  // console.log(children.map(({ title }) => title))
})()
