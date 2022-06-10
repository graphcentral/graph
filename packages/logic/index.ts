import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env' )})

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

;(async () => {
  const listUsersResponse = await notion.users.list({})
  // const pageExample = await notion.pages.retrieve({
  //   page_id: `c0505c2f58ce44bd820305a324eeea9f`,
  // })
  console.log(listUsersResponse)
  // console.log(pageExample)
})()


;(async () => {
  const r1 = await notion.search({
    page_size: 10,
    // query: 'crawl',
    // sort: {
    //   direction: 'ascending',
    //   timestamp: 'last_edited_time',
    // },
  });
  const r2 = await notion.blocks.retrieve({
    block_id: separate_page_id_by_dash(`aa362e29a8c24d6ba084ceca5a717db6`)
              // `1429989f-e8ac-4eff-bc8f-57f56486db54`
            // 16d8004e-5f6a-42a6-9811-51c22ddada12
  })
  console.log(r1)
  r1.results.forEach((r) => {
    console.log(identify_object_title(r))
  })
  // console.log(r2.)
})();

function identify_object_title(obj: any): string {
  if (obj.object === `database`) {
    // @ts-ignore
    return obj.title?.[0].plain_text
  } else if (obj.object === `page`) {
    // console.log(r)
    // @ts-ignore
    return obj.properties?.Name?.title?.[0].plain_text
  }

  throw new Error(`should never get here`)
}

function separate_page_id_by_dash(without_dash: string): string {
  if (without_dash.length != 32) {
    throw new Error(`Incorrect length of page id: ${without_dash.length}`)
  }
  return `${without_dash.substring(0, 8)}-${without_dash.substring(8, 12)}-${without_dash.substring(12, 16)}-${without_dash.substring(16, 20)}-${without_dash.substring(20, 32)}`
}